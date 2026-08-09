import { useEffect, useMemo, useRef, useState } from 'react';
import demoRuntime from '../fixtures/auth-bug/runtime.jsonl?raw';
import { importPiJsonl } from './adapters/pi/import';
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

function load(text: string): SemanticTrace {
  return importPiJsonl(text).trace;
}

function shortJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function App() {
  const [trace, setTrace] = useState<SemanticTrace>(() => load(demoRuntime));
  const frames = useMemo(() => buildTraceFrames(trace), [trace]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState<'world' | 'session' | 'context' | 'timeline' | 'raw'>('world');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
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
    }, 850 / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, frames.length]);

  const frame = frames[Math.min(index, Math.max(frames.length - 1, 0))];
  const explanation = frame ? explainEvent(frame.event) : undefined;
  const worldCue = frame ? toWorldCue(frame.event) : undefined;
  const activeDistrict: District = worldCue?.district ?? explanation?.district ?? 'system';

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

  const evidence = frame?.event.evidence;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">AGENT RUNTIME, MADE VISIBLE</div>
          <h1>PI CITY</h1>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => setTrace(load(demoRuntime))}>Demo run</button>
          <button className="primary" onClick={() => inputRef.current?.click()}>Import Pi JSONL</button>
          <input ref={inputRef} type="file" accept=".jsonl,.json,.txt" multiple hidden onChange={(event) => onFiles(event.target.files)} />
        </div>
      </header>

      <section className="hero-copy">
        <div>
          <span className="status-pill">{trace.source === 'pi-runtime' ? 'Runtime replay' : trace.source === 'pi-session' ? 'Session reconstruction' : 'Combined replay'}</span>
          <h2>{explanation?.title ?? 'Drop a Pi run into the city'}</h2>
          <p>{explanation?.plain ?? 'Pi City converts raw runtime evidence into a replayable semantic trace.'}</p>
        </div>
        <div className="metrics">
          <Metric label="Session" value={frame?.state.sessionEntries ?? 0} />
          <Metric label="Contexts" value={frame?.state.contextBuilds ?? 0} />
          <Metric label="Model calls" value={frame?.state.modelCalls ?? 0} />
          <Metric label="Tool calls" value={frame?.state.toolCalls ?? 0} />
        </div>
      </section>

      <nav className="mode-tabs">
        <button className={tab === 'world' ? 'active' : ''} onClick={() => setTab('world')}>World</button>
        <button className={tab === 'session' ? 'active' : ''} onClick={() => setTab('session')}>Session</button>
        <button className={tab === 'context' ? 'active' : ''} onClick={() => setTab('context')}>Context</button>
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>Timeline</button>
        <button className={tab === 'raw' ? 'active' : ''} onClick={() => setTab('raw')}>Evidence</button>
      </nav>

      <section className="workspace">
        <div className="stage-card">
          {tab === 'world' && <PiCityScene event={frame?.event} />}
          {tab === 'session' && <SessionTree trace={trace} activeArtifactId={frame?.event.artifactId} />}
          {tab === 'context' && <ContextView trace={trace} frames={frames} activeIndex={index} />}
          {tab === 'timeline' && (
            <TimelineList frames={frames} active={index} onSelect={(value) => { setIndex(value); setPlaying(false); }} />
          )}
          {tab === 'raw' && (
            <pre className="raw-panel">{shortJson(frame?.event.sourceEvent ?? frame?.event)}</pre>
          )}
        </div>

        <aside className="inspector">
          <div className="inspector-head">
            <div>
              <div className="eyebrow">INSPECTOR</div>
              <h3>{frame?.event.type ?? 'No event'}</h3>
            </div>
            {evidence && <span className={`evidence ${evidence.level}`}>{evidence.level}</span>}
          </div>

          <dl>
            <dt>District</dt><dd>{districtNames[activeDistrict]}</dd>
            <dt>Source</dt><dd>{evidence?.source ?? '—'}</dd>
            <dt>Turn</dt><dd>{frame?.event.turnId ?? '—'}</dd>
            <dt>Tool call</dt><dd>{frame?.event.toolCallId ?? '—'}</dd>
          </dl>

          {evidence?.note && <div className="note"><strong>Why this evidence level?</strong><br />{evidence.note}</div>}

          <div className="payload-title">Semantic payload</div>
          <pre className="payload">{shortJson(frame?.event.payload ?? {})}</pre>
        </aside>
      </section>

      <section className="transport">
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

      {trace.warnings.length > 0 && <div className="warning">{trace.warnings.join(' ')}</div>}
      <footer>Pi City v0.1 · semantic replay engine</footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function World({ active, eventType, artifact, action }: { active: District; eventType?: string; artifact?: string; action?: string }) {
  return (
    <div className="world-map">
      <div className="sea"><span>Harbor water</span><i className="ship" /></div>
      <DistrictCard id="arrival" name="Arrival Harbor" subtitle="requests enter" active={active} />
      <DistrictCard id="session" name="Session Archive" subtitle="history persists" active={active} />
      <DistrictCard id="context" name="Context Works" subtitle="context is assembled" active={active} />
      <DistrictCard id="model" name="Model Core" subtitle="next action is chosen" active={active} />
      <DistrictCard id="tool" name="Tool District" subtitle="actions execute" active={active} />
      <div className="world-cue"><strong>{artifact ?? 'none'}</strong><span>{action ?? 'signal'}</span></div>
      <div className="world-event">{eventType ?? 'CITY_IDLE'}</div>
    </div>
  );
}

function DistrictCard({ id, name, subtitle, active }: { id: Exclude<District, 'system'>; name: string; subtitle: string; active: District }) {
  return (
    <div className={`district ${id} ${active === id ? 'active' : ''}`}>
      <div className="district-icon">{id === 'arrival' ? '◉' : id === 'session' ? '▥' : id === 'context' ? '⌘' : id === 'model' ? '◇' : '⚙'}</div>
      <strong>{name}</strong>
      <span>{subtitle}</span>
      {active === id && <i className="pulse" />}
    </div>
  );
}

function TimelineList({ frames, active, onSelect }: { frames: ReturnType<typeof buildTraceFrames>; active: number; onSelect: (index: number) => void }) {
  return (
    <div className="timeline-list">
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

function ContextView({ trace, frames, activeIndex }: { trace: SemanticTrace; frames: ReturnType<typeof buildTraceFrames>; activeIndex: number }) {
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

  const prior = frames.slice(0, activeIndex + 1).map((frame) => frame.event);
  const requests = prior.filter((event) => event.type === 'REQUEST_ARRIVED');
  const toolResults = prior.filter((event) => event.type === 'TOOL_RESULT_ATTACHED');
  const toolCalls = prior.filter((event) => event.type === 'TOOL_CALL_CREATED');
  const lastContext = [...prior].reverse().find((event) => event.type === 'CONTEXT_COMPILED');

  return (
    <div className="context-view">
      <div className="view-header"><span>Reconstructed current-turn view</span><strong>DERIVED</strong></div>
      <div className="derived-banner">Pi RPC exposes <code>turn_start</code>, tool/message lifecycle, and settled state, but not the exact compiled prompt as a first-class RPC event. This panel therefore shows evidence available before the current model call, not a byte-for-byte provider request.</div>
      <div className="context-stack">
        <ContextCard label="User requests" count={requests.length} items={requests.map((event) => event.payload.message)} />
        <ContextCard label="Tool calls" count={toolCalls.length} items={toolCalls.map((event) => ({ tool: event.payload.toolName, args: event.payload.args }))} />
        <ContextCard label="Tool results" count={toolResults.length} items={toolResults.map((event) => ({ tool: event.payload.toolName, result: event.payload.result }))} />
      </div>
      <div className="context-footer">Latest context semantic event: <code>{lastContext?.id ?? 'not reached yet'}</code></div>
    </div>
  );
}

function ContextCard({ label, count, items }: { label: string; count: number; items: unknown[] }) {
  return (
    <section className="context-card">
      <header><strong>{label}</strong><span>{count}</span></header>
      {items.length === 0 ? <p>None yet</p> : <pre>{JSON.stringify(items.at(-1), null, 2)}</pre>}
    </section>
  );
}
