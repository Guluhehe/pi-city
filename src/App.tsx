import { useEffect, useMemo, useRef, useState } from 'react';
import demoRuntime from '../fixtures/auth-bug/runtime.jsonl?raw';
import { importPiJsonl } from './adapters/pi/import';
import { activeContextSnapshot, buildContextSnapshots, compareContextSnapshots, type ContextItem } from './analysis/context';
import { analyzeRun, formatDuration } from './analysis/run';
import { buildStory, type StoryStep } from './analysis/story';
import { explainEvent } from './semantic-trace/explain';
import { buildTraceFrames } from './semantic-trace/reducer';
import { mergePiTraces } from './semantic-trace/merge';
import type { SemanticTrace } from './semantic-trace/schema';
import { toWorldCue } from './world/cues';
import { PiCityScene } from './world/PiCityScene';

const districtNames = {
  arrival: 'Arrival Harbor',
  session: 'Session Archive',
  context: 'Context Works',
  model: 'Model Core',
  tool: 'Tool District',
  system: 'City System',
} as const;

type District = keyof typeof districtNames;
type Tab = 'overview' | 'journey' | 'world' | 'story' | 'session' | 'context' | 'compare' | 'events';

function load(text: string): SemanticTrace {
  return importPiJsonl(text).trace;
}

function shortJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function App() {
  const [trace, setTrace] = useState<SemanticTrace>(() => load(demoRuntime));
  const frames = useMemo(() => buildTraceFrames(trace), [trace]);
  const run = useMemo(() => analyzeRun(trace), [trace]);
  const story = useMemo(() => buildStory(trace), [trace]);
  const contextSnapshots = useMemo(() => buildContextSnapshots(trace), [trace]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<Tab>('overview');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setTab('overview');
  }, [trace.id]);

  useEffect(() => {
    if (!playing || !frames.length) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 950 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, frames.length]);

  const frame = frames[Math.min(index, Math.max(frames.length - 1, 0))];
  const explanation = frame ? explainEvent(frame.event) : undefined;
  const worldCue = frame ? toWorldCue(frame.event) : undefined;
  const activeDistrict: District = worldCue?.district ?? explanation?.district ?? 'system';
  const evidence = frame?.event.evidence;
  const activeStory = story.find((step) => index >= step.startIndex && index <= step.endIndex);

  async function onFiles(files?: FileList | null) {
    if (!files?.length) return;
    try {
      const imports = await Promise.all(Array.from(files).map(async (file) => {
        const result = importPiJsonl(await file.text());
        result.trace.metadata = { ...result.trace.metadata, fileName: file.name, importKind: result.kind };
        return result;
      }));
      const runtime = imports.find((item) => item.kind === 'runtime')?.trace;
      const session = imports.find((item) => item.kind === 'session')?.trace;
      if (runtime && session) setTrace(mergePiTraces(runtime, session));
      else setTrace(imports[0].trace);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }

  function watchRun() {
    setIndex(0);
    setTab('journey');
    setPlaying(true);
  }

  function openCompare() {
    const target = contextSnapshots.length > 1 ? contextSnapshots[1] : contextSnapshots[0];
    if (target) setIndex(target.eventIndex);
    setPlaying(false);
    setTab('compare');
  }

  const transport = (
    <section className={`transport ${tab === 'journey' ? 'journey-transport' : ''}`}>
      <button className="play" onClick={() => { if (index >= frames.length - 1 && !playing) setIndex(0); setPlaying((value) => !value); }}>{playing ? 'Pause' : index >= frames.length - 1 ? 'Replay' : 'Play'}</button>
      <input
        type="range"
        min={0}
        max={Math.max(frames.length - 1, 0)}
        value={index}
        onChange={(event) => { setIndex(Number(event.target.value)); setPlaying(false); }}
      />
      <span>{frames.length ? index + 1 : 0} / {frames.length}</span>
      <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
        <option value={1}>1×</option>
        <option value={2}>2×</option>
        <option value={4}>4×</option>
      </select>
    </section>
  );

  return (
    <main className={`app-shell ${tab === 'journey' ? 'journey-mode' : ''}`}>
      <header className="topbar">
        <div>
          <div className="eyebrow">AGENT RUNTIME, MADE VISIBLE</div>
          <h1>PI CITY</h1>
        </div>
        <div className="top-actions">
          {tab === 'journey' && <button className="ghost" onClick={() => { setPlaying(false); setTab('overview'); }}>Exit journey</button>}
          <button className="ghost" onClick={() => setTrace(load(demoRuntime))}>Demo run</button>
          <button className="primary" onClick={() => inputRef.current?.click()}>Import Pi JSONL</button>
          <input ref={inputRef} type="file" accept=".jsonl,.json,.txt" multiple hidden onChange={(event) => onFiles(event.target.files)} />
        </div>
      </header>

      {tab !== 'journey' && (
        <section className="hero-copy">
          <div>
            <span className="status-pill">{trace.source === 'pi-runtime' ? 'Runtime replay' : trace.source === 'pi-session' ? 'Session reconstruction' : 'Combined replay'}</span>
            <h2>{run.title}</h2>
            <p>{explanation ? `${explanation.title} — ${explanation.plain}` : 'Pi City converts raw runtime evidence into a replayable semantic trace.'}</p>
          </div>
          <div className="metrics">
            <Metric label="Turns" value={run.turns} />
            <Metric label="Model calls" value={run.modelCalls} />
            <Metric label="Tool calls" value={run.toolCalls} />
            <Metric label="Session nodes" value={run.sessionEntries} />
          </div>
        </section>
      )}

      {tab === 'journey' ? (
        <IntegratedJourney
          run={run}
          story={story}
          frames={frames}
          frame={frame}
          index={index}
          contextSnapshots={contextSnapshots}
          onSelect={(value) => { setIndex(value); setPlaying(false); }}
          onReplay={() => { setIndex(0); setPlaying(true); }}
          onExplore={(target) => { setPlaying(false); setTab(target); }}
        />
      ) : (
        <>
          <nav className="mode-tabs">
            <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
            <button onClick={watchRun}>Journey</button>
            <button className={tab === 'world' ? 'active' : ''} onClick={() => setTab('world')}>World</button>
            <button className={tab === 'story' ? 'active' : ''} onClick={() => setTab('story')}>Story</button>
            <button className={tab === 'session' ? 'active' : ''} onClick={() => setTab('session')}>Session</button>
            <button className={tab === 'context' ? 'active' : ''} onClick={() => setTab('context')}>Context</button>
            <button className={tab === 'compare' ? 'active' : ''} onClick={openCompare}>Compare</button>
            <button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Events</button>
          </nav>

          <section className="workspace">
            <div className="stage-card">
              {tab === 'overview' && <RunOverview run={run} story={story} onWatch={watchRun} />}
              {tab === 'world' && <PiCityScene event={frame?.event} state={frame?.state} />}
              {tab === 'story' && <StoryView trace={trace} story={story} activeIndex={index} onSelect={(value) => { setIndex(value); setPlaying(false); }} />}
              {tab === 'session' && <SessionTree trace={trace} activeArtifactId={frame?.event.artifactId} />}
              {tab === 'context' && <ContextView trace={trace} snapshots={contextSnapshots} activeIndex={index} onSelect={(value) => { setIndex(value); setPlaying(false); }} />}
              {tab === 'compare' && <ContextCompareView snapshots={contextSnapshots} activeIndex={index} onSelect={(value) => { setIndex(value); setPlaying(false); }} />}
              {tab === 'events' && <TimelineList frames={frames} active={index} onSelect={(value) => { setIndex(value); setPlaying(false); }} />}
            </div>

            <aside className="inspector">
              <div className="inspector-head">
                <div><div className="eyebrow">INSPECTOR</div><h3>{frame?.event.type ?? 'No event'}</h3></div>
                {evidence && <span className={`evidence ${evidence.level}`}>{evidence.level}</span>}
              </div>
              {explanation && <InspectorExplanation explanation={explanation} />}
              <dl>
                <dt>District</dt><dd>{districtNames[activeDistrict]}</dd>
                <dt>Story step</dt><dd>{activeStory?.title ?? '—'}</dd>
                <dt>Source</dt><dd>{evidence?.source ?? '—'}</dd>
                <dt>Turn</dt><dd>{frame?.event.turnId ?? '—'}</dd>
                <dt>Tool call</dt><dd>{frame?.event.toolCallId ?? '—'}</dd>
              </dl>
              {evidence?.note && <div className="note"><strong>Why this evidence level?</strong><br />{evidence.note}</div>}
              <div className="payload-title">Semantic payload</div>
              <pre className="payload">{shortJson(frame?.event.payload ?? {})}</pre>
              <details className="raw-evidence"><summary>Raw source evidence</summary><pre>{shortJson(frame?.event.sourceEvent ?? frame?.event)}</pre></details>
            </aside>
          </section>
          {transport}
        </>
      )}

      {tab === 'journey' && transport}
      {trace.warnings.length > 0 && <div className="warning">{trace.warnings.join(' ')}</div>}
      <footer>Pi City v0.9 Cinematic Pass · Shot grammar + DOF + Realtime GLB Runtime</footer>
    </main>
  );
}

function InspectorExplanation({ explanation }: { explanation: ReturnType<typeof explainEvent> }) {
  return (
    <div className="explanation-stack">
      <section><span>What happened</span><strong>{explanation.title}</strong><p>{explanation.plain}</p></section>
      <section className="why-card"><span>Why it matters</span><p>{explanation.why}</p></section>
    </div>
  );
}

function IntegratedJourney({
  run,
  story,
  frames,
  frame,
  index,
  contextSnapshots,
  onSelect,
  onReplay,
  onExplore,
}: {
  run: ReturnType<typeof analyzeRun>;
  story: StoryStep[];
  frames: ReturnType<typeof buildTraceFrames>;
  frame?: ReturnType<typeof buildTraceFrames>[number];
  index: number;
  contextSnapshots: ReturnType<typeof buildContextSnapshots>;
  onSelect: (index: number) => void;
  onReplay: () => void;
  onExplore: (tab: Exclude<Tab, 'journey' | 'overview' | 'world'>) => void;
}) {
  const explanation = frame ? explainEvent(frame.event) : undefined;
  const activeStory = story.find((step) => index >= step.startIndex && index <= step.endIndex);
  const currentSnapshot = activeContextSnapshot(contextSnapshots, index);
  const previousSnapshot = currentSnapshot && currentSnapshot.number > 1 ? contextSnapshots[currentSnapshot.number - 2] : undefined;
  const contextDiff = currentSnapshot ? compareContextSnapshots(currentSnapshot, previousSnapshot) : undefined;
  const showContextAha = Boolean(frame && (frame.event.type === 'CONTEXT_COMPILED' || frame.event.type === 'MODEL_REQUEST_STARTED') && currentSnapshot?.number && currentSnapshot.number > 1);
  const isToolReturn = frame?.event.type === 'TOOL_RESULT_ATTACHED';
  const complete = Boolean(frame?.state.settled || index >= Math.max(frames.length - 1, 0));

  return (
    <section className="journey-shell">
      <div className="journey-world">
        <PiCityScene event={frame?.event} state={frame?.state} />

        <div className="journey-title-card">
          <span>{activeStory ? `STEP ${String(story.indexOf(activeStory) + 1).padStart(2, '0')}` : 'RUN'}</span>
          <strong>{activeStory?.title ?? run.title}</strong>
          <p>{explanation?.plain ?? 'Follow this run through the city.'}</p>
        </div>

        <div className="journey-stats">
          <span><b>{frame?.state.modelCalls ?? 0}</b> model</span>
          <span><b>{frame?.state.toolCalls ?? 0}</b> tools</span>
          <span><b>{frame?.state.sessionEntries ?? 0}</b> history</span>
        </div>

        {explanation && (
          <aside className="journey-inspector">
            <div className="eyebrow">WHAT JUST HAPPENED</div>
            <strong>{explanation.title}</strong>
            <p>{explanation.why}</p>
            <small>{frame?.event.evidence.level} · {frame?.event.type}</small>
          </aside>
        )}

        {isToolReturn && (
          <div className="journey-aha uturn-aha">
            <span>AHA</span>
            <strong>The Tool Result is turning back into the Agent.</strong>
            <p>It becomes evidence for another reasoning turn — not the final answer.</p>
          </div>
        )}

        {showContextAha && contextDiff && (
          <div className="journey-aha context-aha">
            <span>CONTEXT CHANGED</span>
            <strong>Model #{currentSnapshot?.number} sees +{contextDiff.added.length} new item{contextDiff.added.length === 1 ? '' : 's'}.</strong>
            <p>{contextDiff.added.some((item) => item.kind === 'tool-result') ? 'New external evidence can change the next decision.' : 'The model-visible view changed between calls.'}</p>
            <button onClick={() => onExplore('compare')}>Compare contexts</button>
          </div>
        )}

        {complete && (
          <div className="journey-complete">
            <div className="eyebrow">REQUEST COMPLETED</div>
            <h2>You just watched one Agent run become a city.</h2>
            <p>{run.modelCalls} model calls · {run.toolCalls} tool calls · {story.length} story steps</p>
            <div>
              <button className="primary" onClick={onReplay}>Replay</button>
              <button onClick={() => onExplore('story')}>Explore story</button>
              <button onClick={() => onExplore('compare')}>Compare context</button>
            </div>
          </div>
        )}
      </div>

      <div className="journey-story-rail">
        {story.map((step, storyIndex) => {
          const active = activeStory?.id === step.id;
          const done = index > step.endIndex;
          return (
            <button key={step.id} className={`${active ? 'active' : ''} ${done ? 'done' : ''}`} onClick={() => onSelect(step.startIndex)}>
              <span>{String(storyIndex + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              {step.tools.length > 0 && <small>{step.tools.map((tool) => tool.name).join(' · ')}</small>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function RunOverview({ run, story, onWatch }: { run: ReturnType<typeof analyzeRun>; story: StoryStep[]; onWatch: () => void }) {
  return (
    <div className="run-overview">
      <div className="overview-hero">
        <div>
          <div className="eyebrow">RUN OVERVIEW</div>
          <h3>{run.status === 'completed' ? 'Completed run' : 'Run still in progress'}</h3>
          <p>Pi City has compressed the raw trace into a human-readable runtime story. Start with the story; drill into semantic events only when you need evidence.</p>
        </div>
        <button className="primary overview-cta" onClick={onWatch}>Enter the city →</button>
      </div>

      <div className="overview-grid">
        <OverviewStat label="Duration" value={formatDuration(run.durationMs)} />
        <OverviewStat label="Turns" value={String(run.turns)} />
        <OverviewStat label="Model calls" value={String(run.modelCalls)} />
        <OverviewStat label="Tool calls" value={String(run.toolCalls)} />
        <OverviewStat label="Tool results" value={String(run.toolResults)} />
        <OverviewStat label="Context builds" value={String(run.contextBuilds)} />
      </div>

      <div className="overview-columns">
        <section className="overview-panel">
          <header><span>Tool activity</span><strong>{run.tools.reduce((sum, tool) => sum + tool.count, 0)} calls</strong></header>
          {run.tools.length === 0 ? <p className="muted-copy">No external tools were called.</p> : (
            <div className="tool-summary-list">
              {run.tools.map((tool) => <div key={tool.name}><strong>{tool.name}</strong><span>{tool.count} call{tool.count === 1 ? '' : 's'}{tool.errors ? ` · ${tool.errors} error${tool.errors === 1 ? '' : 's'}` : ''}</span></div>)}
            </div>
          )}
        </section>
        <section className="overview-panel">
          <header><span>Evidence quality</span><strong>{run.evidence.observed + run.evidence.derived + run.evidence.synthetic} events</strong></header>
          <div className="evidence-bars">
            <EvidenceBar label="Observed" value={run.evidence.observed} total={run.evidence.observed + run.evidence.derived + run.evidence.synthetic} kind="observed" />
            <EvidenceBar label="Derived" value={run.evidence.derived} total={run.evidence.observed + run.evidence.derived + run.evidence.synthetic} kind="derived" />
            <EvidenceBar label="Synthetic" value={run.evidence.synthetic} total={run.evidence.observed + run.evidence.derived + run.evidence.synthetic} kind="synthetic" />
          </div>
        </section>
      </div>

      <section className="overview-panel story-preview">
        <header><span>Story Pi City inferred</span><strong>{story.length} steps</strong></header>
        <div className="story-preview-row">
          {story.slice(0, 6).map((step, i) => <div key={step.id}><span>{String(i + 1).padStart(2, '0')}</span><strong>{step.title}</strong></div>)}
        </div>
      </section>
    </div>
  );
}

function OverviewStat({ label, value }: { label: string; value: string }) {
  return <div className="overview-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function EvidenceBar({ label, value, total, kind }: { label: string; value: number; total: number; kind: 'observed' | 'derived' | 'synthetic' }) {
  const width = total ? Math.round((value / total) * 100) : 0;
  return <div className="evidence-bar"><div><span>{label}</span><strong>{value}</strong></div><i><b className={kind} style={{ width: `${width}%` }} /></i></div>;
}

function StoryView({ trace, story, activeIndex, onSelect }: { trace: SemanticTrace; story: StoryStep[]; activeIndex: number; onSelect: (index: number) => void }) {
  return (
    <div className="story-view">
      <div className="view-header"><span>Human-readable run story</span><strong>{story.length} steps</strong></div>
      <div className="story-list">
        {story.map((step, i) => {
          const active = activeIndex >= step.startIndex && activeIndex <= step.endIndex;
          const eventTypes = step.eventIndices.map((eventIndex) => trace.events[eventIndex]?.type).filter(Boolean);
          return (
            <article key={step.id} className={`story-step ${active ? 'active' : ''}`}>
              <button className="story-main" onClick={() => onSelect(step.startIndex)}>
                <span className={`story-icon ${step.kind}`}>{storyIcon(step.kind)}</span>
                <span className="story-copy"><small>STEP {String(i + 1).padStart(2, '0')}</small><strong>{step.title}</strong><p>{step.summary}</p></span>
                <span className="story-count">{step.eventIndices.length} events</span>
              </button>
              {step.tools.length > 0 && <div className="story-tools">{step.tools.map((tool, toolIndex) => <span key={`${tool.callId ?? tool.name}-${toolIndex}`}>{tool.name}{tool.callId ? <small>{tool.callId}</small> : null}</span>)}</div>}
              <div className="story-events">{[...new Set(eventTypes)].join(' · ')}</div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function storyIcon(kind: StoryStep['kind']): string {
  if (kind === 'request') return '↘';
  if (kind === 'inspect') return '⌕';
  if (kind === 'change') return '✎';
  if (kind === 'execute') return '⚙';
  if (kind === 'answer') return '↗';
  if (kind === 'complete') return '✓';
  return '◇';
}

function TimelineList({ frames, active, onSelect }: { frames: ReturnType<typeof buildTraceFrames>; active: number; onSelect: (index: number) => void }) {
  return (
    <div className="timeline-list">
      <div className="view-header"><span>Semantic event layer</span><strong>{frames.length} events</strong></div>
      {frames.map((frame) => {
        const info = explainEvent(frame.event);
        return (
          <button key={frame.event.id} className={frame.index === active ? 'active' : ''} onClick={() => onSelect(frame.index)}>
            <span className="timeline-index">{String(frame.index + 1).padStart(2, '0')}</span>
            <span><strong>{info.title}</strong><small>{frame.event.type} · {frame.event.evidence.level}</small></span>
          </button>
        );
      })}
    </div>
  );
}

function SessionTree({ trace, activeArtifactId }: { trace: SemanticTrace; activeArtifactId?: string }) {
  const rawEntries = Array.isArray(trace.metadata.sessionEntries)
    ? (trace.metadata.sessionEntries as Array<Record<string, unknown>>)
    : [];

  if (!rawEntries.length) {
    return (
      <div className="empty-view">
        <div className="empty-icon">▥</div>
        <h3>No persisted Session tree in this import</h3>
        <p>Runtime RPC logs explain execution well, but they are not the Session JSONL tree. Import a Pi Session file to inspect durable <code>id / parentId</code> history here.</p>
      </div>
    );
  }

  const byId = new Map(rawEntries.map((entry) => [String(entry.id ?? ''), entry]));
  const depthOf = (entry: Record<string, unknown>) => {
    let depth = 0;
    let parent = entry.parentId == null ? null : String(entry.parentId);
    const seen = new Set<string>();
    while (parent && byId.has(parent) && !seen.has(parent) && depth < 24) {
      seen.add(parent);
      depth += 1;
      const next = byId.get(parent)?.parentId;
      parent = next == null ? null : String(next);
    }
    return depth;
  };

  return (
    <div className="session-tree">
      <div className="view-header"><span>Persisted history</span><strong>{rawEntries.length} entries</strong></div>
      {rawEntries.map((entry, i) => {
        const id = String(entry.id ?? `entry-${i}`);
        const message = entry.message && typeof entry.message === 'object' ? entry.message as Record<string, unknown> : undefined;
        const role = String(message?.role ?? entry.type ?? 'entry');
        const depth = depthOf(entry);
        return (
          <div key={id} className={`tree-row ${activeArtifactId === id ? 'active' : ''}`} style={{ '--depth': depth } as React.CSSProperties}>
            <span className="tree-rail" />
            <span className={`role role-${role}`}>{role}</span>
            <div><strong>{id}</strong><small>parent: {String(entry.parentId ?? 'root')}</small></div>
          </div>
        );
      })}
    </div>
  );
}

function ContextView({ trace, snapshots, activeIndex, onSelect }: { trace: SemanticTrace; snapshots: ReturnType<typeof buildContextSnapshots>; activeIndex: number; onSelect: (index: number) => void }) {
  if (trace.source === 'pi-session') {
    return (
      <div className="empty-view context-empty">
        <div className="empty-icon">⌘</div>
        <h3>Session history is not the model context</h3>
        <p>A Session file proves what Pi persisted, including pre-compaction history and branches. It does not by itself prove the exact compiled context sent on a particular model call.</p>
        <div className="derived-banner"><strong>Why Pi City refuses to fake this:</strong> exact Context needs runtime/extension instrumentation. Import a runtime log to see a derived turn-level reconstruction.</div>
      </div>
    );
  }

  const snapshot = activeContextSnapshot(snapshots, activeIndex);
  if (!snapshot) {
    return <div className="empty-view"><div className="empty-icon">⌘</div><h3>No model context yet</h3><p>Move the timeline to the first Model Call. Pi City will reconstruct the evidence available at that decision point.</p></div>;
  }

  return (
    <div className="context-view">
      <div className="view-header"><span>Reconstructed model-call context</span><strong>CALL #{snapshot.number} · DERIVED</strong></div>
      <div className="context-call-switcher">{snapshots.map((item) => <button key={item.eventId} className={item.number === snapshot.number ? 'active' : ''} onClick={() => onSelect(item.eventIndex)}>Model #{item.number}</button>)}</div>
      <div className="derived-banner">This is a semantic reconstruction of evidence available before the model call. It is intentionally not presented as the byte-for-byte provider prompt.</div>
      <ContextItemGrid items={snapshot.items} />
    </div>
  );
}

function ContextCompareView({ snapshots, activeIndex, onSelect }: { snapshots: ReturnType<typeof buildContextSnapshots>; activeIndex: number; onSelect: (index: number) => void }) {
  if (!snapshots.length) return <div className="empty-view"><div className="empty-icon">⇄</div><h3>No model calls to compare</h3><p>Context Compare appears when runtime evidence contains model-call boundaries.</p></div>;
  const current = activeContextSnapshot(snapshots, activeIndex) ?? snapshots[0];
  const previous = current.number > 1 ? snapshots[current.number - 2] : undefined;
  const diff = compareContextSnapshots(current, previous);

  return (
    <div className="compare-view">
      <div className="view-header"><span>What changed before the next decision?</span><strong>CONTEXT COMPARE</strong></div>
      <div className="context-call-switcher">{snapshots.map((item) => <button key={item.eventId} className={item.number === current.number ? 'active' : ''} onClick={() => onSelect(item.eventIndex)}>Model #{item.number}</button>)}</div>
      {!previous ? (
        <div className="empty-compare"><strong>Model call #1 is the baseline.</strong><p>Select a later model call to see exactly what evidence was added between decisions.</p></div>
      ) : (
        <>
          <div className="compare-summary"><strong>+{diff.added.length} new</strong><span>{diff.retained.length} retained</span>{diff.removed.length > 0 && <span>−{diff.removed.length} removed</span>}</div>
          <div className="compare-columns">
            <ContextSnapshotColumn label={`Before · Model #${previous.number}`} items={previous.items} />
            <ContextSnapshotColumn label={`After · Model #${current.number}`} items={current.items} addedKeys={new Set(diff.added.map((item) => item.key))} />
          </div>
          <section className="change-explanation">
            <div className="eyebrow">WHY COULD THE AGENT CHANGE ITS MIND?</div>
            <h3>{diff.added.some((item) => item.kind === 'tool-result') ? 'New external evidence entered the model-visible view.' : 'The model-visible evidence changed between calls.'}</h3>
            <p>{diff.added.length ? `Pi City reconstructed ${diff.added.length} newly available context item${diff.added.length === 1 ? '' : 's'} before Model #${current.number}.` : 'No new reconstructed evidence was detected between these calls.'}</p>
          </section>
        </>
      )}
    </div>
  );
}

function ContextItemGrid({ items }: { items: ContextItem[] }) {
  const groups: Array<[ContextItem['kind'], string]> = [['request', 'User requests'], ['tool-call', 'Tool calls'], ['tool-result', 'Tool results']];
  return <div className="context-stack">{groups.map(([kind, label]) => <ContextSnapshotColumn key={kind} label={label} items={items.filter((item) => item.kind === kind)} />)}</div>;
}

function ContextSnapshotColumn({ label, items, addedKeys }: { label: string; items: ContextItem[]; addedKeys?: Set<string> }) {
  return (
    <section className="context-card context-snapshot-card">
      <header><strong>{label}</strong><span>{items.length}</span></header>
      <div className="context-items">
        {items.length === 0 ? <p>None</p> : items.map((item) => (
          <div key={item.key} className={`context-item ${addedKeys?.has(item.key) ? 'added' : ''}`}>
            <span className={`context-kind ${item.kind}`}>{item.kind}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
            {addedKeys?.has(item.key) && <b>NEW</b>}
          </div>
        ))}
      </div>
    </section>
  );
}
