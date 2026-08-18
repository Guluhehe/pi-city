import { useEffect, useMemo, useReducer, useRef, useState, type ComponentType } from 'react';
import demoRuntime from '../../fixtures/auth-bug/runtime.jsonl?raw';
import { importPiJsonl } from '../adapters/pi/import';
import { buildContextSnapshots, compareContextSnapshots } from '../analysis/context';
import { analyzeRun } from '../analysis/run';
import type { AgentActionClass } from '../analysis/action-classes';
import {
  buildPredictDebrief,
  checkpointAtLessonFrame,
  CITY_MISSIONS,
  createCityCampaign,
  createCityMission,
  createFountainSession,
  createGameSession,
  derivePredictCheckpoints,
  reduceCityCampaign,
  reduceCityMission,
  reduceFountainSession,
  reduceGameSession,
  type ChapterMissionId,
  type CityMissionId,
  type GameSessionState,
} from '../game';
import { explainEvent } from '../semantic-trace/explain';
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
  evaluateScenarioCompatibility,
  getScenario,
  mapLessonFramesToTrace,
  routeImportedTrace,
  scenarioDurationMs,
  type CanonicalFrameKey,
  type ExperienceDistrict,
  type LessonFrame,
  type LessonScenario,
} from '../experience';
import { PiCityScene } from '../world/PiCityScene';
import type { PiCitySceneProps } from '../world/PiCityScene';
import { EvidenceCityMap, SceneErrorBoundary } from './SceneErrorBoundary';
import { FountainGreybox } from './FountainGreybox';
import { CityStoryHub } from './CityStoryHub';
import { CityMissionStory } from './CityMissionStory';
import { CityArchive } from './CityArchive';

type ShellMode = 'hub' | 'mission' | 'archive' | 'landing' | 'watch' | 'explore' | 'photo' | 'complete' | 'fountain';
type TraceOrigin = 'bundled-demo' | 'imported';
type PhotoReturnView = {
  scenario: LessonScenario;
  trace: SemanticTrace;
  traceOrigin: TraceOrigin;
  mode: Exclude<ShellMode, 'photo'>;
  index: number;
  playing: boolean;
  cinema: boolean;
};

const IMPORT_FALLBACK_NOTICE =
  'This run has no compatible guided lesson yet, so Pi City opened the evidence-preserving explorer instead of applying demo narration.';

function loadDemo(): SemanticTrace {
  return importPiJsonl(demoRuntime).trace;
}

function readFrameQuery(): CanonicalFrameKey | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('frame');
  return value && value in CANONICAL_FRAMES ? (value as CanonicalFrameKey) : null;
}

function readInitialMode(): ShellMode {
  if (readFrameQuery()) return 'photo';
  if (typeof window === 'undefined') return 'hub';
  return new URLSearchParams(window.location.search).get('view') === 'city' ? 'landing' : 'hub';
}

function createCampaignPreview(): ReturnType<typeof createCityCampaign> {
  const campaign = createCityCampaign();
  if (typeof window === 'undefined') return campaign;
  const params = new URLSearchParams(window.location.search);
  const missions = Object.values(CITY_MISSIONS) as Array<typeof CITY_MISSIONS[keyof typeof CITY_MISSIONS]>;
  const previewMission = params.get('previewMission') as CityMissionId | null;
  const targetIndex = previewMission ? missions.findIndex((mission) => mission.id === previewMission) : -1;
  if (targetIndex >= 0) return missions.slice(0, targetIndex).reduce((current, mission) => reduceCityCampaign(current, { type: 'COMPLETE_MISSION', missionId: mission.id }), campaign);
  const value = params.get('story');
  const chapter = value ? Number(value) : 1;
  if (!Number.isInteger(chapter) || chapter < 2 || chapter > 4) return campaign;
  return missions.filter((mission) => mission.chapter < chapter).reduce((current, mission) => reduceCityCampaign(current, { type: 'COMPLETE_MISSION', missionId: mission.id }), campaign);
}

function usesFallbackScene(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('quality') === 'fallback';
}

function toolLabel(count: number): string {
  return `${count} tool call${count === 1 ? '' : 's'}`;
}

export function CinematicCity({
  onOpenExplorer,
  SceneComponent = PiCityScene,
}: {
  onOpenExplorer: (trace?: SemanticTrace, notice?: string) => void;
  SceneComponent?: ComponentType<PiCitySceneProps>;
}) {
  const [scenario, setScenario] = useState<LessonScenario>(() => getScenario('auth'));
  const [trace, setTrace] = useState<SemanticTrace>(() => loadDemo());
  const [traceOrigin, setTraceOrigin] = useState<TraceOrigin>('bundled-demo');
  const run = useMemo(() => analyzeRun(trace), [trace]);
  const frames = useMemo(() => buildTraceFrames(trace), [trace]);
  const contextSnapshots = useMemo(() => buildContextSnapshots(trace), [trace]);
  const checkpoints = useMemo(() => derivePredictCheckpoints(trace), [trace]);
  const lessonMap = useMemo(() => mapLessonFramesToTrace(scenario, trace), [scenario, trace]);

  const [mode, setMode] = useState<ShellMode>(readInitialMode);
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
  const [photoRequest, setPhotoRequest] = useState<{
    key: CanonicalFrameKey;
    returnView: PhotoReturnView;
  } | null>(null);
  const [game, setGame] = useState<GameSessionState | null>(null);
  const [campaign, dispatchCampaign] = useReducer(reduceCityCampaign, undefined, createCampaignPreview);
  const [mission, setMission] = useState(() => createCityMission('lighthouse'));
  const [fountain, dispatchFountain] = useReducer(reduceFountainSession, undefined, createFountainSession);
  const [elapsed, setElapsed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameStarted = useRef(performance.now());
  const photoReturnRef = useRef<PhotoReturnView | null>(null);
  const fallbackScene = usesFallbackScene();

  const lessonFrame: LessonFrame = scenario.frames[Math.min(index, scenario.frames.length - 1)];
  const traceIndex = lessonMap[Math.min(index, lessonMap.length - 1)] ?? 0;
  const frame = frames[Math.min(traceIndex, Math.max(frames.length - 1, 0))];
  const totalMs = scenarioDurationMs(scenario);
  const chapterIndex = scenario.story.findIndex(([title]) => title === lessonFrame?.chapter);
  const authCompatible = evaluateScenarioCompatibility(getScenario('auth'), trace).compatible;
  const mappedEvent = frame?.event;
  const eventExplanation = mappedEvent ? explainEvent(mappedEvent) : undefined;
  const usesAuthoredNarration = traceOrigin === 'bundled-demo';
  const visibleRunTitle = usesAuthoredNarration ? scenario.title : run.title;
  const visibleWhat = usesAuthoredNarration ? lessonFrame?.what : eventExplanation?.plain;
  const visibleTitle = usesAuthoredNarration ? lessonFrame?.what : eventExplanation?.title;
  const visibleWhy = usesAuthoredNarration ? lessonFrame?.why : eventExplanation?.plain;
  const visibleWhy2 = usesAuthoredNarration ? lessonFrame?.why2 : eventExplanation?.why;
  const compareCurrent = contextSnapshots.find((snapshot) => snapshot.eventIndex >= traceIndex)
    ?? contextSnapshots.at(-1);
  const comparePrevious = compareCurrent && compareCurrent.number > 1
    ? contextSnapshots[compareCurrent.number - 2]
    : undefined;
  const contextDiff = compareCurrent
    ? compareContextSnapshots(compareCurrent, comparePrevious)
    : undefined;
  const addedContextKeys = new Set(contextDiff?.added.map((item) => item.key) ?? []);
  const gameCheckpoint = game ? checkpoints[game.checkpoint] : undefined;
  const gameContext = gameCheckpoint ? contextSnapshots[gameCheckpoint.modelCallNumber - 1] : undefined;
  const gamePreviousContext = gameCheckpoint && gameCheckpoint.modelCallNumber > 1
    ? contextSnapshots[gameCheckpoint.modelCallNumber - 2]
    : undefined;
  const gameContextDiff = gameContext ? compareContextSnapshots(gameContext, gamePreviousContext) : undefined;
  const latestDecision = game?.decisions.at(-1);
  const debrief = game?.phase === 'debrief' ? buildPredictDebrief(game, checkpoints) : undefined;
  const predictOverlayOpen = game?.phase === 'predict' || game?.phase === 'reveal';

  useEffect(() => {
    setLastChapter('');
    setShowCompare(false);
  }, [trace.id]);

  useEffect(() => {
    if (mode !== 'watch' || !playing || !lessonFrame || predictOverlayOpen) return;
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
          setGame((current) => current
            ? reduceGameSession(current, { type: 'COMPLETE_RUN' }, checkpoints)
            : null);
          return;
        }
        const nextIndex = index + 1;
        if (
          game?.phase === 'watch'
          && checkpointAtLessonFrame(checkpoints, lessonMap, nextIndex, game.checkpoint)
        ) {
          setIndex(nextIndex);
          setPlaying(false);
          setGame((current) => current
            ? reduceGameSession(current, { type: 'REACH_CHECKPOINT' }, checkpoints)
            : null);
          return;
        }
        setIndex(nextIndex);
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [mode, playing, index, speed, lessonFrame, scenario.frames, totalMs, game, checkpoints, lessonMap, predictOverlayOpen]);

  useEffect(() => {
    if (mode !== 'watch' || !lessonFrame) return;
    if (lessonFrame.chapter !== lastChapter) {
      setLastChapter(lessonFrame.chapter);
      setBumper({
        chapter: `CHAPTER ${String(Math.max(chapterIndex, 0) + 1).padStart(2, '0')}`,
        title: lessonFrame.chapter,
        what: visibleWhat ?? '',
      });
      const timer = window.setTimeout(() => setBumper(null), 1500);
      return () => window.clearTimeout(timer);
    }
  }, [mode, lessonFrame, lastChapter, chapterIndex, visibleWhat]);

  useEffect(() => {
    if (mode !== 'watch' || lessonFrame?.aha !== 'context') {
      setShowCompare(false);
      return;
    }
    if (!playing) {
      setShowCompare(true);
      return;
    }
    const timer = window.setTimeout(() => setShowCompare(true), 1450);
    return () => window.clearTimeout(timer);
  }, [mode, lessonFrame, index, playing]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (predictOverlayOpen) return;
      if (event.key === '1') requestPhoto('arrival');
      if (event.key === '2') requestPhoto('context');
      if (event.key === '3') requestPhoto('model');
      if (mode === 'photo' && (event.key === 'h' || event.key === 'H')) setFrameClean((value) => !value);
      if (mode === 'photo' && event.key === 'Escape') exitPhoto();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, scenario, trace, traceOrigin, index, playing, cinema, authCompatible, predictOverlayOpen]);

  function enterCity() {
    setGame(null);
    setMode('watch');
    setCinema(true);
    setIndex(0);
    setLastChapter('');
    setShowCompare(false);
    setPlaying(true);
  }

  function enterPredict() {
    setGame(createGameSession(scenario.id, checkpoints));
    setMode('watch');
    setCinema(true);
    setIndex(0);
    setLastChapter('');
    setShowCompare(false);
    setPlaying(true);
  }

  function enterFountain() {
    setPlaying(false);
    setGame(null);
    dispatchFountain({ type: 'RESTART' });
    dispatchCampaign({ type: 'BEGIN_MISSION', missionId: 'fountain' });
    setMode('fountain');
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url);
  }

  function beginCityMission(missionId: CityMissionId) {
    if (missionId === 'fountain') {
      enterFountain();
      return;
    }
    setPlaying(false);
    setGame(null);
    dispatchCampaign({ type: 'BEGIN_MISSION', missionId });
    setMission(createCityMission(missionId as ChapterMissionId));
    setMode('mission');
  }

  function dispatchMission(action: Parameters<typeof reduceCityMission>[1]) {
    setMission((current) => reduceCityMission(current, action));
  }

  function returnToHarbor() {
    dispatchCampaign({ type: 'RETURN_TO_HARBOR' });
    setMode('hub');
  }

  function choosePrediction(choice: AgentActionClass) {
    setGame((current) => current
      ? reduceGameSession(current, { type: 'PREDICT_NEXT_ACTION', choice }, checkpoints)
      : null);
  }

  function continuePrediction() {
    setGame((current) => current
      ? reduceGameSession(current, { type: 'CONTINUE_REPLAY' }, checkpoints)
      : null);
    setPlaying(true);
  }

  function requestPhoto(key: CanonicalFrameKey) {
    if (predictOverlayOpen) return;
    if (mode === 'photo' || (traceOrigin === 'bundled-demo' && scenario.id === 'auth' && authCompatible)) {
      enterPhoto(key);
      return;
    }
    const returnView: PhotoReturnView = {
      scenario,
      trace,
      traceOrigin,
      mode,
      index,
      playing,
      cinema,
    };
    setPlaying(false);
    setPhotoRequest({ key, returnView });
  }

  function cancelPhotoSwitch() {
    setPhotoRequest(null);
  }

  function confirmPhotoSwitch() {
    if (!photoRequest) return;
    photoReturnRef.current = photoRequest.returnView;
    setScenario(getScenario('auth'));
    setTrace(loadDemo());
    setTraceOrigin('bundled-demo');
    const key = photoRequest.key;
    setPhotoRequest(null);
    enterPhoto(key);
  }

  function enterPhoto(key: CanonicalFrameKey) {
    const target = canonicalFrame(key) ?? CANONICAL_FRAMES.arrival;
    const authScenario = getScenario('auth');
    setCanonicalKey(target.key);
    setIndex(target.frameIndex);
    setPlaying(false);
    setFrameClean(false);
    setShowCompare(false);
    setMode('photo');
    setLastChapter(authScenario.frames[target.frameIndex]?.chapter ?? '');
    const url = new URL(window.location.href);
    url.searchParams.set('frame', target.key);
    window.history.replaceState({}, '', url);
  }

  function exitPhoto() {
    setFrameClean(false);
    const returnView = photoReturnRef.current;
    if (returnView) {
      photoReturnRef.current = null;
      setScenario(returnView.scenario);
      setTrace(returnView.trace);
      setTraceOrigin(returnView.traceOrigin);
      setMode(returnView.mode);
      setIndex(returnView.index);
      setPlaying(returnView.playing);
      setCinema(returnView.cinema);
    } else {
      setMode('landing');
      setIndex(0);
      setPlaying(false);
    }
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
      const destination = routeImportedTrace(result.trace);
      if (destination.surface === 'explorer') {
        onOpenExplorer(result.trace, IMPORT_FALLBACK_NOTICE);
        return;
      }
      setScenario(getScenario(destination.scenarioId));
      setTrace(result.trace);
      setTraceOrigin('imported');
      setGame(null);
      setMode('watch');
      setCinema(true);
      setIndex(0);
      setPlaying(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  }

  if (mode === 'hub') {
    return <CityStoryHub campaign={campaign} onBeginMission={beginCityMission} onOpenArchives={() => setMode('archive')} />;
  }

  if (mode === 'archive') {
    return <CityArchive campaign={campaign} onBack={() => setMode('hub')} onEnterEvidenceCity={() => {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'city');
      window.history.replaceState({}, '', url);
      setMode('landing');
    }} />;
  }

  if (mode === 'mission') {
    return <CityMissionStory state={mission} dispatch={dispatchMission} onExit={returnToHarbor} onDiscovery={(discoveryId) => dispatchCampaign({ type: 'ADD_DISCOVERY', discoveryId })} onCompleted={() => {
      dispatchCampaign({ type: 'COMPLETE_MISSION', missionId: mission.missionId });
      setMode('hub');
    }} />;
  }

  if (mode === 'fountain') {
    return <FountainGreybox
      state={fountain}
      dispatch={dispatchFountain}
      onExit={returnToHarbor}
      onComplete={() => {
        dispatchCampaign({ type: 'COMPLETE_MISSION', missionId: 'fountain' });
        setMode('hub');
      }}
    />;
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
          <button onClick={() => requestPhoto('arrival')} disabled={predictOverlayOpen}>Photo Mode</button>
          <button onClick={() => inputRef.current?.click()}>Import Pi JSONL</button>
          <button className="primary" onClick={() => onOpenExplorer()}>Evidence Explorer</button>
          <input ref={inputRef} type="file" accept=".jsonl,.json,.txt" hidden onChange={(event) => onFiles(event.target.files)} />
        </div>
      </header>

      <div className="cinematic-world">
        {fallbackScene ? (
          <EvidenceCityMap event={mappedEvent} activeDistrict={lessonFrame?.district} artifact={lessonFrame?.artifact} />
        ) : (
          <SceneErrorBoundary
            event={mappedEvent}
            activeDistrict={lessonFrame?.district}
            artifact={lessonFrame?.artifact}
            onOpenExplorer={() => onOpenExplorer(trace, 'The 3D scene failed, so Pi City preserved this run in the Evidence Explorer.')}
          >
            <SceneComponent
              event={frame?.event}
              state={frame?.state}
              shotId={lessonFrame?.cam}
              presentation={presentation}
              exploreDistrict={mode === 'explore' ? exploreDistrict : null}
              hideChrome={mode === 'photo' && frameClean}
            />
          </SceneErrorBoundary>
        )}

        {mode === 'landing' && (
          <div className="cinematic-landing">
            <div className="landing-card">
              <small>PI CITY · INSIDE AN AGENT</small>
              <h2>A request has entered the harbor.</h2>
              <p>Follow one real Agent loop through history, context, model decisions, tools, and back again.</p>
              <div className="landing-metrics">
                <span>{run.modelCalls} model calls</span>
                <span>{toolLabel(run.toolCalls)}</span>
                <span>~{Math.round(totalMs / 1000)} sec guided journey</span>
                <span>Explore after replay</span>
              </div>
              <div className="landing-actions">
                <button className="primary" onClick={enterCity}>Enter the city →</button>
                <button onClick={enterPredict} disabled={!checkpoints.length}>Play &amp; Predict</button>
                <button className="tutorial-entry" onClick={enterFountain}>和 Pi 一起调查</button>
                <button onClick={() => inputRef.current?.click()}>Import your Pi run</button>
                <button onClick={() => requestPhoto('arrival')}>View hero frames</button>
              </div>
            </div>
          </div>
        )}

        {mode === 'watch' && lessonFrame && (
          <>
            <div className={`cinematic-title ${cinema ? 'compact' : ''}`}>
              <small>{chapterIndex >= 0 ? `CHAPTER ${String(chapterIndex + 1).padStart(2, '0')} · ${lessonFrame.district.toUpperCase()}` : 'RUN'}</small>
              <h1>{visibleRunTitle}</h1>
              <p>{visibleWhat}</p>
              <div className="micro">
                <span>MODEL {frame?.state.modelCalls ?? 0}/{run.modelCalls}</span>
                <span>TOOLS {frame?.state.toolCalls ?? 0}/{run.toolCalls}</span>
                <span>{playing ? 'FOLLOWING RUN' : 'PAUSED'}</span>
              </div>
            </div>

            <aside className="cinematic-inspector">
              <div className="type">{lessonFrame.type}</div>
              <strong>{visibleTitle}</strong>
              <p>{visibleWhy}</p>
              <p className="inspect-why">{visibleWhy2}</p>
              {mappedEvent && <code>{mappedEvent.evidence.level} · {mappedEvent.type}</code>}
            </aside>

            {usesAuthoredNarration && typeof lessonFrame.gate === 'number' && lessonFrame.district === 'model' && (
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

            {showCompare && contextDiff && (
              <div className="cinematic-compare">
                <header>
                  <strong>Context changed before Model #{contextDiff.current.number}</strong>
                  <button onClick={() => setShowCompare(false)}>×</button>
                </header>
                <div className="compare-grid">
                  <div className="ctx">
                    <small>MODEL #{contextDiff.previous?.number ?? '—'}</small>
                    {(contextDiff.previous?.items ?? []).map((item) => (
                      <div key={item.key} className="item">{item.label}</div>
                    ))}
                  </div>
                  <div className="ctx">
                    <small>MODEL #{contextDiff.current.number}</small>
                    {contextDiff.current.items.map((item) => (
                      <div key={item.key} className={`item ${addedContextKeys.has(item.key) ? 'new' : ''}`}>{item.label}</div>
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

        {photoRequest && (
          <div className="photo-confirm-backdrop">
            <section
              className="photo-confirm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="photo-confirm-title"
            >
              <small>PHOTO MODE · BUNDLED DEMO</small>
              <h2 id="photo-confirm-title">Switch to bundled Photo Mode?</h2>
              <p>Photo Mode frames are staged on the bundled auth demo. Continuing will replace your imported run in this view until you exit Photo Mode.</p>
              <div>
                <button className="primary" onClick={confirmPhotoSwitch}>Switch to demo frames</button>
                <button onClick={cancelPhotoSwitch}>Stay with my run</button>
              </div>
            </section>
          </div>
        )}

        {game?.phase === 'predict' && gameCheckpoint && (
          <section className="predict-overlay" role="dialog" aria-modal="true" aria-labelledby="predict-title">
            <small>PREDICT · MODEL #{gameCheckpoint.modelCallNumber}</small>
            <h2 id="predict-title">What will the Agent do next?</h2>
            <p>Use only the evidence currently available to this model call.</p>
            <div className="predict-evidence">
              <header><strong>Reconstructed Context</strong><span>{gameContext?.evidence.toUpperCase() ?? 'DERIVED'}</span></header>
              {(gameContext?.items ?? []).slice(0, 6).map((item) => (
                <div key={item.key}><small>{item.kind}</small><strong>{item.label}</strong></div>
              ))}
            </div>
            <div className="predict-choices">
              {(['read', 'edit', 'bash', 'answer'] as AgentActionClass[]).map((choice) => (
                <button key={choice} onClick={() => choosePrediction(choice)}>{choice.toUpperCase()}</button>
              ))}
            </div>
          </section>
        )}

        {game?.phase === 'reveal' && gameCheckpoint && latestDecision && (
          <section className="predict-overlay predict-reveal" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
            <small>{latestDecision.correct ? 'Correct' : 'Not this time'}</small>
            <h2 id="reveal-title">Prediction revealed</h2>
            <p>You chose <b>{latestDecision.choice}</b>. The trace shows <b>{gameCheckpoint.actual}</b>{gameCheckpoint.actualToolName ? ` via ${gameCheckpoint.actualToolName}` : ''}.</p>
            <div className="predict-explanation">
              <strong>{gameContextDiff?.added.length ? `What changed: +${gameContextDiff.added.length} evidence items` : 'Evidence at this decision'}</strong>
              <p>{gameContextDiff?.added.map((item) => item.label).join(', ') || gameContext?.items.map((item) => item.label).join(', ') || 'No reconstructed evidence items.'}</p>
            </div>
            <button className="primary" onClick={continuePrediction}>Continue replay</button>
          </section>
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
              <button onClick={() => onOpenExplorer()}>Open Explorer</button>
            </div>
          </>
        )}

        {mode === 'complete' && debrief ? (
          <div className="cinematic-complete predict-debrief" role="region" aria-label="Prediction debrief">
            <small>PREDICTION DEBRIEF</small>
            <h2>{debrief.correct}/{debrief.total} decisions matched the trace</h2>
            <div className="debrief-entries">
              {debrief.entries.map(({ decision, checkpoint }) => (
                <div key={decision.checkpointIndex}>
                  <span>MODEL #{checkpoint.modelCallNumber}</span>
                  <strong>{decision.choice.toUpperCase()} → {checkpoint.actual.toUpperCase()}</strong>
                  <small>{decision.correct ? 'Matched' : 'Use the revealed evidence to update your model.'}</small>
                </div>
              ))}
            </div>
            <div className="complete-actions">
              <button className="primary" onClick={enterPredict}>Predict again</button>
              <button onClick={enterExplore}>Explore the city</button>
              <button onClick={() => onOpenExplorer(trace)}>Evidence Explorer</button>
            </div>
          </div>
        ) : mode === 'complete' && (
          <div className="cinematic-complete">
            <small>RUN COMPLETE</small>
            <h2>You just watched one Agent run become a city.</h2>
            <p>{run.modelCalls} model calls · {toolLabel(run.toolCalls)} · {scenario.story.length} runtime phases</p>
            <div className="complete-actions">
              <button className="primary" onClick={() => { setGame(null); setMode('watch'); setIndex(0); setPlaying(true); setCinema(true); }}>Replay</button>
              <button onClick={enterExplore}>Explore the city</button>
              <button onClick={() => { setMode('watch'); setShowCompare(true); setPlaying(false); setIndex(CANONICAL_FRAMES.context.frameIndex); }}>Compare Context</button>
              <button onClick={() => onOpenExplorer()}>Evidence Explorer</button>
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
                  disabled={Boolean(game)}
                  title={game ? 'Timeline navigation is locked during Predict.' : undefined}
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
              disabled={predictOverlayOpen}
              title={predictOverlayOpen ? 'Playback is locked while a prediction is open.' : undefined}
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
              disabled={Boolean(game)}
              title={game ? 'Timeline navigation is locked during Predict.' : undefined}
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
              <option value={8}>8×</option>
            </select>
            {game && <span className="predict-lock-note">Predict locks seeking</span>}
          </section>
        </>
      )}
    </div>
  );
}
