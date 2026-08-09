import { useEffect, useMemo, useRef, useState } from 'react';
import demoRuntime from '../../fixtures/auth-bug/runtime.jsonl?raw';
import { importPiJsonl } from '../adapters/pi/import';
import { buildTraceFrames } from '../semantic-trace/reducer';
import type { SemanticTrace } from '../semantic-trace/schema';
import {
  CANONICAL_FRAME_ORDER,
  CANONICAL_FRAMES,
  DISTRICT_COPY,
  EXPLORE_DISTRICTS,
  MODEL_GATES,
  beforeDurationMs,
  canonicalFrame,
  getScenario,
  lessonEvent,
  scenarioDurationMs,
  type CanonicalFrameKey,
  type ExperienceDistrict,
  type LessonFrame,
} from '../experience';
import { PiCityScene } from '../world/PiCityScene';

type ShellMode = 'landing' | 'watch' | 'explore' | 'photo' | 'complete';

function loadDemo(): SemanticTrace {
  return importPiJsonl(demoRuntime).trace;
}

function readFrameQuery(): CanonicalFrameKey | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('frame');
  return value && value in CANONICAL_FRAMES ? (value as CanonicalFrameKey) : null;
}

export function CinematicCity({ onOpenExplorer }: { onOpenExplorer: () => void }) {
  const scenario = useMemo(() => getScenario('auth'), []);
  const [trace, setTrace] = useState<SemanticTrace>(() => loadDemo());
  const frames = useMemo(() => buildTraceFrames(trace), [trace]);
  const lessonMap = useMemo(
    () => scenario.frames.map((_, index) => lessonEvent(scenario, trace, index).traceIndex),
    [scenario, trace],
  );

  const [mode, setMode] = useState<ShellMode>(() => (readFrameQuery() ? 'photo' : 'landing'));
  const [index, setIndex] = useState(() => {
    const key = readFrameQuery();
    return key ? CANONICAL_FRAMES[key].frameIndex : 0;
  });
  const [canonicalKey, setCanonicalKey] = useState<CanonicalFrameKey>(() => readFrameQuery() ?? 'arrival');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cinema, setCinema] = useState(true);
  const [frameClean, setFrameClean] = useState(false);
  const [exploreDistrict, setExploreDistrict] = useState<ExperienceDistrict>('context');
  const [lastChapter, setLastChapter] = useState('');
  const [bumper, setBumper] = useState<{ chapter: string; title: string; what: string } | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameStarted = useRef(performance.now());

  const lessonFrame: LessonFrame = scenario.frames[Math.min(index, scenario.frames.length - 1)];
  const traceIndex = lessonMap[Math.min(index, lessonMap.length - 1)] ?? 0;
  const frame = frames[Math.min(traceIndex, Math.max(frames.length - 1, 0))];
  const totalMs = scenarioDurationMs(scenario);
  const chapterIndex = scenario.story.findIndex(([title]) => title === lessonFrame?.chapter);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
    setMode((current) => (current === 'photo' ? current : 'landing'));
    setLastChapter('');
    setShowCompare(false);
  }, [trace.id]);

  useEffect(() => {
    if (mode !== 'watch' || !playing || !lessonFrame) return;
    frameStarted.current = performance.now();
    let raf = 0;
    const tick = () => {
      const progress = ((performance.now() - frameStarted.current) * speed) / lessonFrame.durationMs;
      setElapsed(beforeDurationMs(scenario.frames, index) + Math.min(1, progress) * lessonFrame.durationMs);
      if (progress >= 1) {
        if (index >= scenario.frames.length - 1) {
          setPlaying(false);
          setMode('complete');
          setElapsed(totalMs);
          return;
        }
        setIndex((value) => value + 1);
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [mode, playing, index, speed, lessonFrame, scenario.frames, totalMs]);

  useEffect(() => {
    if (mode !== 'watch' || !lessonFrame) return;
    if (lessonFrame.chapter !== lastChapter) {
      setLastChapter(lessonFrame.chapter);
      setBumper({
        chapter: `CHAPTER ${String(Math.max(chapterIndex, 0) + 1).padStart(2, '0')}`,
        title: lessonFrame.chapter,
        what: lessonFrame.what,
      });
      const timer = window.setTimeout(() => setBumper(null), 1500);
      return () => window.clearTimeout(timer);
    }
  }, [mode, lessonFrame, lastChapter, chapterIndex]);

  useEffect(() => {
    if (mode !== 'watch' || lessonFrame?.aha !== 'context') {
      setShowCompare(false);
      return;
    }
    const timer = window.setTimeout(() => setShowCompare(true), 1450);
    return () => window.clearTimeout(timer);
  }, [mode, lessonFrame, index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === '1') enterPhoto('arrival');
      if (event.key === '2') enterPhoto('context');
      if (event.key === '3') enterPhoto('model');
      if (mode === 'photo' && (event.key === 'h' || event.key === 'H')) setFrameClean((value) => !value);
      if (mode === 'photo' && event.key === 'Escape') exitPhoto();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  function enterCity() {
    setMode('watch');
    setCinema(true);
    setIndex(0);
    setLastChapter('');
    setShowCompare(false);
    setPlaying(true);
  }

  function enterPhoto(key: CanonicalFrameKey) {
    const target = canonicalFrame(key) ?? CANONICAL_FRAMES.arrival;
    setCanonicalKey(target.key);
    setIndex(target.frameIndex);
    setPlaying(false);
    setFrameClean(false);
    setShowCompare(false);
    setMode('photo');
    setLastChapter(scenario.frames[target.frameIndex]?.chapter ?? '');
    const url = new URL(window.location.href);
    url.searchParams.set('frame', target.key);
    window.history.replaceState({}, '', url);
  }

  function exitPhoto() {
    setMode('landing');
    setFrameClean(false);
    setIndex(0);
    setPlaying(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('frame');
    window.history.replaceState({}, '', url);
  }

  function enterExplore() {
    setPlaying(false);
    setShowCompare(false);
    setMode('explore');
    setExploreDistrict('context');
    setCinema(false);
  }

  async function onFiles(files?: FileList | null) {
    if (!files?.length) return;
    try {
      const result = importPiJsonl(await files[0].text());
      setTrace(result.trace);
      setMode('watch');
      setCinema(true);
      setIndex(0);
      setPlaying(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }

  const presentation = mode === 'photo' ? 'photo' : mode === 'explore' ? 'explore' : 'watch';
  const exploreCopy = DISTRICT_COPY[exploreDistrict];
  const photo = CANONICAL_FRAMES[canonicalKey];
  const shellClass = [
    'cinematic-app',
    mode === 'watch' && cinema ? 'watch-mode' : '',
    mode === 'photo' ? 'frame-mode' : '',
    mode === 'photo' && frameClean ? 'frame-clean' : '',
    mode === 'explore' ? 'explore-mode' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={shellClass}>
      <header className="cinematic-topbar">
        <div>
          <small>PI CITY · INSIDE AN AGENT</small>
          <strong>A playable visualization of how AI agents actually run</strong>
        </div>
        <div className="cinematic-top-actions">
          <button onClick={() => enterPhoto('arrival')}>Photo Mode</button>
          <button onClick={() => inputRef.current?.click()}>Import Pi JSONL</button>
          <button className="primary" onClick={onOpenExplorer}>Evidence Explorer</button>
          <input ref={inputRef} type="file" accept=".jsonl,.json,.txt" hidden onChange={(event) => onFiles(event.target.files)} />
        </div>
      </header>

      <div className="cinematic-world">
        <PiCityScene
          event={frame?.event}
          state={frame?.state}
          shotId={lessonFrame?.cam}
          presentation={presentation}
          exploreDistrict={mode === 'explore' ? exploreDistrict : null}
          hideChrome={mode === 'photo' && frameClean}
        />

        {mode === 'landing' && (
          <div className="cinematic-landing">
            <div className="landing-card">
              <small>PI CITY · INSIDE AN AGENT</small>
              <h2>A request has entered the harbor.</h2>
              <p>Follow one real Agent loop through history, context, model decisions, tools, and back again.</p>
              <div className="landing-metrics">
                <span>{scenario.modelTotal} model calls</span>
                <span>{scenario.toolTotal} tool call</span>
                <span>~{Math.round(totalMs / 1000)} sec guided journey</span>
                <span>Explore after replay</span>
              </div>
              <div className="landing-actions">
                <button className="primary" onClick={enterCity}>Enter the city →</button>
                <button onClick={() => inputRef.current?.click()}>Import your Pi run</button>
                <button onClick={() => enterPhoto('arrival')}>View hero frames</button>
              </div>
            </div>
          </div>
        )}

        {mode === 'watch' && lessonFrame && (
          <>
            <div className={`cinematic-title ${cinema ? 'compact' : ''}`}>
              <small>{chapterIndex >= 0 ? `CHAPTER ${String(chapterIndex + 1).padStart(2, '0')} · ${lessonFrame.district.toUpperCase()}` : 'RUN'}</small>
              <h1>{scenario.title}</h1>
              <p>{lessonFrame.what}</p>
              <div className="micro">
                <span>MODEL {frame?.state.modelCalls ?? 0}/{scenario.modelTotal}</span>
                <span>TOOLS {frame?.state.toolCalls ?? 0}/{scenario.toolTotal}</span>
                <span>{playing ? 'FOLLOWING RUN' : 'PAUSED'}</span>
              </div>
            </div>

            <aside className="cinematic-inspector">
              <div className="type">{lessonFrame.type}</div>
              <strong>{lessonFrame.what}</strong>
              <p>{lessonFrame.why}</p>
              <p className="inspect-why">{lessonFrame.why2}</p>
              <code>{lessonFrame.evidence}</code>
            </aside>

            {typeof lessonFrame.gate === 'number' && lessonFrame.district === 'model' && (
              <div className="cinematic-decision">MODEL DECISION · <b>{MODEL_GATES[lessonFrame.gate] ?? '—'}</b></div>
            )}

            {lessonFrame.aha === 'uturn' && (
              <div className="cinematic-aha">
                <small>AHA</small>
                <strong>Tool Result is not the answer.</strong>
                <p>The result turns around and returns to Agent history as new evidence.</p>
              </div>
            )}

            {lessonFrame.aha === 'context' && (
              <div className="cinematic-aha">
                <small>AHA</small>
                <strong>Same Agent. Different evidence.</strong>
                <p>The next Context now contains new external evidence the first call could not see.</p>
              </div>
            )}

            {showCompare && (
              <div className="cinematic-compare">
                <header>
                  <strong>Context changed before Model #2</strong>
                  <button onClick={() => setShowCompare(false)}>×</button>
                </header>
                <div className="compare-grid">
                  <div className="ctx">
                    <small>MODEL #1</small>
                    {scenario.before.map((item) => <div key={item} className="item">{item}</div>)}
                  </div>
                  <div className="ctx">
                    <small>MODEL #2</small>
                    {scenario.after.map((item) => (
                      <div key={item} className={`item ${item.startsWith('+') ? 'new' : ''}`}>{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button className="cinema-toggle" onClick={() => setCinema((value) => !value)}>
              CINEMA UI · {cinema ? 'ON' : 'OFF'}
            </button>
          </>
        )}

        {bumper && mode === 'watch' && (
          <div className="chapter-bumper">
            <small>{bumper.chapter}</small>
            <strong>{bumper.title}</strong>
            <p>{bumper.what}</p>
          </div>
        )}

        {mode === 'photo' && (
          <>
            <div className="frame-caption">
              <small>{photo.eyebrow}</small>
              <strong>{photo.title}</strong>
              <p>{photo.body}</p>
            </div>
            <div className="frame-picker">
              {CANONICAL_FRAME_ORDER.map((key) => (
                <button key={key} className={canonicalKey === key ? 'active' : ''} onClick={() => enterPhoto(key)}>
                  {key}
                </button>
              ))}
              <button data-frame="exit" onClick={exitPhoto}>exit</button>
              <button onClick={() => setFrameClean((value) => !value)}>{frameClean ? 'show UI' : 'clean (H)'}</button>
            </div>
          </>
        )}

        {mode === 'explore' && (
          <>
            <div className="explore-copy">
              <small>{exploreCopy.tags.join(' · ')}</small>
              <strong>{exploreCopy.title}</strong>
              <p>{exploreCopy.body}</p>
            </div>
            <div className="explore-bar">
              {EXPLORE_DISTRICTS.map((district) => (
                <button
                  key={district}
                  className={exploreDistrict === district ? 'active' : ''}
                  onClick={() => setExploreDistrict(district)}
                >
                  {DISTRICT_COPY[district].title}
                </button>
              ))}
              <button className="primary" onClick={() => { setMode('watch'); setCinema(true); setPlaying(true); setIndex(0); }}>
                Replay
              </button>
              <button onClick={onOpenExplorer}>Open Explorer</button>
            </div>
          </>
        )}

        {mode === 'complete' && (
          <div className="cinematic-complete">
            <small>RUN COMPLETE</small>
            <h2>You just watched one Agent run become a city.</h2>
            <p>{scenario.modelTotal} model calls · {scenario.toolTotal} tool call · {scenario.story.length} runtime phases</p>
            <div className="complete-actions">
              <button className="primary" onClick={() => { setMode('watch'); setIndex(0); setPlaying(true); setCinema(true); }}>Replay</button>
              <button onClick={enterExplore}>Explore the city</button>
              <button onClick={() => { setMode('watch'); setShowCompare(true); setPlaying(false); setIndex(10); }}>Compare Context</button>
              <button onClick={onOpenExplorer}>Evidence Explorer</button>
            </div>
          </div>
        )}
      </div>

      {(mode === 'watch' || mode === 'complete') && (
        <>
          <div className="cinematic-rail">
            {scenario.story.map(([title], storyIndex) => {
              const start = scenario.frames.findIndex((frameItem) => frameItem.chapter === title);
              const active = lessonFrame?.chapter === title;
              const done = start >= 0 && index > start && !active;
              return (
                <button
                  key={title}
                  className={`${active ? 'active' : ''} ${done ? 'done' : ''}`}
                  onClick={() => { setMode('watch'); setIndex(Math.max(start, 0)); setPlaying(false); }}
                >
                  <span>{String(storyIndex + 1).padStart(2, '0')}</span>
                  <strong>{title}</strong>
                </button>
              );
            })}
          </div>
          <section className="cinematic-transport">
            <button
              className="play"
              onClick={() => {
                if (mode === 'complete' || index >= scenario.frames.length - 1) {
                  setMode('watch');
                  setIndex(0);
                  setPlaying(true);
                  return;
                }
                setMode('watch');
                setPlaying((value) => !value);
              }}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={scenario.frames.length - 1}
              value={index}
              onChange={(event) => {
                setMode('watch');
                setIndex(Number(event.target.value));
                setPlaying(false);
                setElapsed(beforeDurationMs(scenario.frames, Number(event.target.value)));
              }}
            />
            <span>{index + 1}/{scenario.frames.length}</span>
            <span>{Math.round(elapsed / 1000)}s</span>
            <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </select>
          </section>
        </>
      )}
    </div>
  );
}
