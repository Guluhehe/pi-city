import { useEffect, useMemo, useState } from 'react';
import '../fountain.css';
import { FountainStoryScene, type StoryInvestigationAnchor, type StoryLocationId, type StoryRoutePresentation } from '../world/FountainStoryScene';
import {
  availableCityMissionQuestions,
  cityMissionDefinition,
  cityMissionFactDetails,
  CITY_MISSIONS,
  type CityMissionAction,
  type CityMissionState,
} from '../game';
import type { FountainSessionState } from '../game';

function kiteInvestigationAnchors(state: CityMissionState, questionIds: string[]): StoryInvestigationAnchor[] {
  if (state.missionId !== 'kite' || state.phase !== 'choose-question') return [];
  const anchors: Record<string, StoryInvestigationAnchor> = {
    'kite-library': { questionId: 'kite-library', label: '旧日图书馆', hint: '屋顶间的风向札记', position: [-5.2, 3.18, -1.6], color: '#f5c574' },
    'kite-overlook': { questionId: 'kite-overlook', label: '高处观察台', hint: '一小段新鲜的风筝线', position: [-2.7, 3.04, 3.8], color: '#9ccef0' },
    'kite-reply': { questionId: 'kite-reply', label: '屋顶红门', hint: '旧日与现在共同指向的地方', position: [3.85, 2.58, -4.55], color: '#ffbf72' },
  };
  return questionIds.flatMap((id) => anchors[id] ? [anchors[id]] : []);
}

function storyRouteFor(state: CityMissionState, destination?: string): StoryRoutePresentation {
  if (state.missionId === 'kite' && (state.phase === 'return' || state.phase === 'complete')) return { target: 'wind', travelSeconds: 3.35, returnSeconds: 2.87, returnKind: state.lastReturn?.kind };
  const text = destination ?? '';
  let target: StoryLocationId = 'water';
  if (/图书|档案|笔记|借书/.test(text)) target = 'melody';
  else if (/花园|夜花|星光/.test(text)) target = 'full-song';
  else if (/工具|齿轮|风车/.test(text)) target = 'workshop';
  else if (/风铃|红门|邮局|回信|船铃|雾灯|剧场/.test(text)) target = 'wind';
  else if (/码头|广场/.test(text)) target = 'fountain';
  const travelSeconds = target === 'wind' ? 3.35 : target === 'melody' || target === 'full-song' ? 3.05 : target === 'workshop' ? 2.85 : 2.6;
  return { target, travelSeconds, returnSeconds: Math.max(2.05, travelSeconds - .48), returnKind: state.lastReturn?.kind };
}

export function CityMissionStory({
  state,
  dispatch,
  onExit,
  onCompleted,
  onDiscovery,
}: {
  state: CityMissionState;
  dispatch: (action: CityMissionAction) => void;
  onExit: () => void;
  onCompleted: () => void;
  onDiscovery: (discoveryId: NonNullable<NonNullable<CityMissionState['lastReturn']>['discovery']>) => void;
}) {
  const definition = cityMissionDefinition(state.missionId);
  const [showStoryNote, setShowStoryNote] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const questions = availableCityMissionQuestions(state);
  const investigationAnchors = useMemo(() => kiteInvestigationAnchors(state, questions.map((question) => question.id)), [questions, state]);
  const pending = state.pendingQuestion ? definition.questions[state.pendingQuestion] : undefined;
  const facts = cityMissionFactDetails(state);
  const storyRoute = useMemo(() => storyRouteFor(state, pending?.destination), [pending?.destination, state]);
  const summary = CITY_MISSIONS[state.missionId];
  const kiteRethinkReady = state.missionId === 'kite' && state.facts.includes('kite-old-wind') && state.facts.includes('kite-new-string') && !state.facts.includes('kite-home');
  const kiteRethinkReturn = kiteRethinkReady && state.phase === 'return' && state.lastReturn?.fact?.id === 'kite-new-string';
  const memoryWindReframe = state.missionId === 'kite' && (state.phase === 'return' || state.phase === 'complete' || kiteRethinkReady);
  const backdrop = useMemo<FountainSessionState>(() => ({
    scenarioId: 'fountain-d-greybox',
    source: 'tutorial',
    phase: state.phase === 'expedition' ? 'expedition'
      : state.phase === 'return' ? 'return'
        : state.phase === 'plan' ? 'plan'
          : state.phase === 'complete' ? 'complete'
            : 'arrival',
    facts: ['pressure-drop'],
    pendingQuestion: undefined,
    lastReturn: undefined,
    questionsAsked: [],
    completed: state.completed,
  }), [state.completed, state.pendingQuestion, state.phase]);

  useEffect(() => {
    if (state.phase === 'return' && state.lastReturn?.discovery) onDiscovery(state.lastReturn.discovery);
  }, [onDiscovery, state.lastReturn?.discovery, state.phase]);

  return <section className={`fountain-story mission-story mission-${state.missionId} phase-${state.phase}`} aria-label={`${definition.title} 城市故事`}>
    <header className="story-topbar">
      <button className="story-bookmark" onClick={() => setShowStoryNote((value) => !value)} aria-expanded={showStoryNote}>
        <span>Pi 的城市故事 · 第{summary.chapter}章</span><strong>{definition.title}</strong>
      </button>
      <p className="story-chapter">{chapterLabel(state)}</p>
      <button className="story-exit" onClick={onExit}>回到心愿码头</button>
    </header>

    {showStoryNote && <aside className="story-note" role="status"><strong>这是一个作者定义的教学故事。</strong><p>它让你用城市里的事实体验 Pi 如何观察、行动、带回新发现再确认；它不是一段真实 Trace。</p></aside>}

    <main className="story-world">
      <FountainStoryScene state={backdrop} missionTheme={state.missionId} missionFacts={state.facts} storyRoute={storyRoute} onSelectQuestion={() => {}} memoryWind={memoryWindReframe} memoryWindBeat={kiteRethinkReady || (state.missionId === 'kite' && state.phase === 'complete') ? 'reframe' : memoryWindReframe ? 'hold' : 'notice'} investigationAnchors={investigationAnchors} onSelectInvestigation={(questionId) => dispatch({ type: 'SELECT_QUESTION', questionId })} />
      <section className="story-copy">
        <p className="resident-tag">{definition.resident}的委托</p>
        <h1>{definition.title}</h1>
        <p className="resident-quote">“{definition.opening}”</p>
      </section>

      <section className="story-focus" aria-live="polite">
        <MissionFocus state={state} dispatch={dispatch} onComplete={onCompleted} timing={storyRoute} />
      </section>

      {kiteRethinkReturn && <KiteRethinkCue />}

      {state.phase === 'choose-question' && <aside className="world-clue-guide mission-clue-guide" aria-label="选择下一处调查地点">
        <span aria-hidden="true">✦</span><p>{investigationAnchors.length > 0 ? '看看城里发亮的地标，指给 Pi 一处值得再弄清的地方。' : '先找一找城市里哪件事值得弄清，再告诉 Pi 要去哪儿。'}</p>
        {investigationAnchors.length > 0 && <small className="landmark-choice-note">点击地标即可让 Pi 过去看看；下面的文字选项也随时可用。</small>}
        <div className="world-question-fallback"><small>你注意到了什么？</small>{questions.map((item) => <button key={item.id} onClick={() => dispatch({ type: 'SELECT_QUESTION', questionId: item.id })}><span>{item.observation}</span><strong>去{item.destination}看看</strong></button>)}</div>
      </aside>}

      {(state.phase === 'return' || state.phase === 'complete') && <aside className={`pi-knowledge-card ${showKnowledge ? 'open' : ''}`} aria-label="Pi 小知识">
        <button onClick={() => setShowKnowledge((value) => !value)} aria-expanded={showKnowledge}><span>Pi 小知识 · 可选</span><strong>{showKnowledge ? '收起' : `Pi 今天学会：${summary.learning}`}</strong><i>{showKnowledge ? '−' : '+'}</i></button>
        {showKnowledge && <div><p>{summary.learning}</p><small>这是城市故事中的模式，不是刚才某一段真实运行。等档案馆有合适的脱敏示例时，才会把两者并排给你看。</small></div>}
      </aside>}

      <div className="pi-dialogue" aria-live="polite"><span className="dialogue-speaker">Pi</span><p>{piLine(state)}</p></div>
    </main>

    <section className="investigation-journal" aria-label="本次办事手账">
      <div className="journal-heading"><span>本次办事手账</span><small>{facts.length === 0 ? '还没有发现' : `${facts.length} 件带回物`}</small></div>
      <MissionSatchel state={state} />
      <div className="journal-tape">{facts.length === 0 ? <span className="journal-empty">Pi 会把路上带回来的东西放在这里。</span> : facts.map((fact, index) => <article className="journal-clue" key={fact.id}><span>{index + 1}</span><strong>{fact.label}</strong><p>{fact.detail}</p></article>)}</div>
      <button className="journal-reset" onClick={() => dispatch({ type: 'RESTART' })}>重新听这件心愿</button>
    </section>
  </section>;
}

function KiteRethinkCue() {
  return <aside className="kite-rethink-cue" aria-live="polite" aria-label="Pi 重新判断的依据">
    <span>Pi 把两件东西放在一起</span>
    <div className="kite-rethink-evidence"><article><small>旧日</small><strong>屋顶风向札记</strong></article><i>＋</i><article><small>现在</small><strong>新鲜的风筝线</strong></article></div>
    <p>红门不再只是记忆；它们一起指向现在的屋顶。</p>
  </aside>;
}

function MissionSatchel({ state }: { state: CityMissionState }) {
  if (!state.satchel) return null;
  const carried = state.satchel.carriedFactIds.map((id) => state.factCards.find((fact) => fact.id === id));
  return <section className="mission-satchel" aria-label={`Pi 的两格小包，已带回 ${carried.length} 件发现`}><span>Pi 的两格小包</span><div>{Array.from({ length: state.satchel.capacity }).map((_, index) => {
    const fact = carried[index];
    return <article className={fact ? 'filled' : 'empty'} key={index}><i>{fact ? '✦' : '○'}</i><strong>{fact?.label ?? '留给下一件真正有用的发现'}</strong></article>;
  })}</div></section>;
}

function MissionFocus({ state, dispatch, onComplete, timing }: { state: CityMissionState; dispatch: (action: CityMissionAction) => void; onComplete: () => void; timing: StoryRoutePresentation }) {
  const definition = cityMissionDefinition(state.missionId);
  const pending = state.pendingQuestion ? definition.questions[state.pendingQuestion] : undefined;
  if (state.phase === 'arrival') return <button className="scene-cta" onClick={() => dispatch({ type: 'BEGIN' })}><span>靠近委托</span><strong>和 Pi 一起看看</strong><i>→</i></button>;
  if (state.phase === 'first-look') return <button className="scene-cta listening" onClick={() => dispatch({ type: 'COMPLETE_FIRST_LOOK' })}><span>Pi 正在听和看</span><strong>先弄清一点点</strong><i>✦</i></button>;
  if (state.phase === 'plan' && pending) return <article className="story-card pi-plan"><span>Pi 想这样弄清</span><strong>“{pending.plan}”</strong><p>它会去 <b>{pending.destination}</b>，再把看见的带回来。</p><button className="scene-cta compact" onClick={() => dispatch({ type: 'CONFIRM_PLAN' })}>跟上 Pi <i>→</i></button></article>;
  if (state.phase === 'expedition' && pending) return <article className="story-card pi-journey"><span>Pi 正沿着小城出发</span><strong>去 {pending.destination}</strong><p>{pending.plan}</p><TimedButton delay={Math.round((timing.travelSeconds ?? 2.7) * 1000 + 380)} ready="等 Pi 带着发现回来" waiting="Pi 正沿着灯火前往…" onClick={() => dispatch({ type: 'COMPLETE_EXPEDITION' })} /></article>;
  if (state.phase === 'return' && state.lastReturn) {
    const kiteRethinkReturn = state.missionId === 'kite' && state.lastReturn.fact?.id === 'kite-new-string' && state.facts.includes('kite-old-wind');
    return <article className={`story-card story-return ${state.lastReturn.kind} ${kiteRethinkReturn ? 'rethink' : ''}`}><span>{kiteRethinkReturn ? '两条线索让 Pi 换了一个方向' : returnHeading(state.lastReturn.kind)}</span><strong>{kiteRethinkReturn ? '现在该去屋顶红门' : state.lastReturn.title}</strong><p>{kiteRethinkReturn ? '旧日风向告诉 Pi 从哪里找；眼前的风筝线告诉 Pi 现在往哪里走。' : state.lastReturn.body}</p><TimedButton delay={Math.round((timing.returnSeconds ?? 2.15) * 1000 + 320)} ready={kiteRethinkReturn ? '按这个新方向继续' : '把它记进手账'} waiting="Pi 正带着发现回来…" onClick={() => dispatch({ type: 'ACKNOWLEDGE_RETURN' })} /></article>;
  }
  if (state.phase === 'complete') return <article className="story-card story-complete"><span>这件心愿办好了</span><strong>{definition.title}</strong><p>{definition.resident.split(' · ')[0]}的生活在城里留下了一点新变化。</p><button className="scene-cta compact" onClick={onComplete}>带 Pi 回到心愿码头 <i>↗</i></button></article>;
  return <div className="story-empty">新的事实会让 Pi 在城市里出现下一颗疑问种子。</div>;
}

function TimedButton({ delay, ready, waiting, onClick }: { delay: number; ready: string; waiting: string; onClick: () => void }) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => setIsReady(true), delay); return () => window.clearTimeout(timer); }, [delay]);
  return <button className="scene-cta compact" disabled={!isReady} onClick={onClick}>{isReady ? ready : waiting} <i>{isReady ? '↘' : '· · ·'}</i></button>;
}

function chapterLabel(state: CityMissionState): string {
  const chapter = CITY_MISSIONS[state.missionId].chapter;
  if (state.phase === 'arrival' || state.phase === 'first-look') return `第${chapter}章 · 一处心愿`;
  if (state.phase === 'choose-question') return `第${chapter}章 · 还没弄清的事`;
  if (state.phase === 'plan' || state.phase === 'expedition') return `第${chapter}章 · Pi 出发了`;
  if (state.phase === 'return') return `第${chapter}章 · 带回来的东西`;
  return `第${chapter}章 · 办好了`;
}

function returnHeading(kind: NonNullable<CityMissionState['lastReturn']>['kind']) {
  if (kind === 'detour') return '多知道了一件不能忽略的事';
  if (kind === 'confirmed') return '等到该确认的时候';
  if (kind === 'reply') return '一只纸船送出了回信';
  return 'Pi 带回了一点新东西';
}

function piLine(state: CityMissionState): string {
  if (state.phase === 'arrival') return '“我们先别急着猜。我去看看。”';
  if (state.phase === 'first-look') return '“这里有一点不对劲。”';
  if (state.phase === 'choose-question') return '“你觉得我们还该弄清什么？”';
  if (state.phase === 'plan') return '“这个问题值得亲自去看。”';
  if (state.phase === 'expedition') return '“我去把新的发现带回来。”';
  if (state.phase === 'return') return state.lastReturn?.kind === 'detour' ? '“这趟没有白跑；它让我知道了还缺什么。”' : '“这件新东西让我得再想一想。”';
  return '“谢谢你和我一起把这件事办好。”';
}

function knowledgeTitle(missionId: CityMissionState['missionId']): string {
  return missionId === 'lighthouse' ? '为什么修好后还要等一等？' : '为什么旧地址还不够？';
}

function knowledgeBody(missionId: CityMissionState['missionId']): string {
  return missionId === 'lighthouse'
    ? 'Pi 不是做完一件事就假装成功。它会在真正需要的时刻再确认，才把结果告诉居民。'
    : 'Pi 带着以前知道的地址，也会再看眼前的新门牌；两件信息放在一起，才让下一步更可靠。';
}
