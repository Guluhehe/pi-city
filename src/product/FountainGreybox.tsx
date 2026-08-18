import { useEffect, useState } from 'react';
import '../fountain.css';
import { FountainStoryScene } from '../world/FountainStoryScene';
import {
  FOUNTAIN_QUESTIONS,
  availableFountainQuestions,
  factDetails,
  type FountainQuestion,
  type FountainReturnKind,
  type FountainSessionAction,
  type FountainSessionState,
} from '../game';

function returnTone(kind: FountainReturnKind): string {
  if (kind === 'refuted') return 'refuted';
  if (kind === 'refined') return 'refined';
  if (kind === 'confirmed') return 'confirmed';
  return 'answered';
}

export function FountainGreybox({
  state,
  dispatch,
  onExit,
}: {
  state: FountainSessionState;
  dispatch: (action: FountainSessionAction) => void;
  onExit: () => void;
}) {
  const [showStoryNote, setShowStoryNote] = useState(false);
  const facts = factDetails(state);
  const availableQuestions = availableFountainQuestions(state);
  const question = state.pendingQuestion ? FOUNTAIN_QUESTIONS[state.pendingQuestion] : undefined;
  const result = state.lastReturn;

  return (
    <section className={`fountain-story phase-${state.phase}`} aria-label="Pi City fountain story mode">
      <header className="story-topbar">
        <button className="story-bookmark" onClick={() => setShowStoryNote((value) => !value)} aria-expanded={showStoryNote}>
          <span>故事模式</span>
          <strong>喷泉街</strong>
        </button>
        <p className="story-chapter">{storyChapter(state)}</p>
        <button className="story-exit" onClick={onExit}>回到 Pi City</button>
      </header>

      {showStoryNote && (
        <aside className="story-note" role="status">
          <strong>这是一个教学故事。</strong>
          <p>它用城市小冒险解释 Pi 如何观察、带回新事实、再改变行动；它不是一段真实 Trace。</p>
        </aside>
      )}

      <main className="story-world">
        <FountainStoryScene
          state={state}
          onSelectQuestion={(questionId) => dispatch({ type: 'SELECT_QUESTION', questionId })}
        />
        <section className="story-copy">
          <p className="resident-tag">码头乐手的委托</p>
          <h1>让 Pi 和你一起<br />把这首歌弄明白。</h1>
          <p className="resident-quote">“它每次唱到第七拍，就不肯再唱了。”</p>
        </section>

        <section className="story-focus" aria-live="polite">
          {renderStoryFocus(state, question, result, dispatch)}
        </section>

        {state.phase === 'choose-question' && (
          <aside className="world-clue-guide" aria-label="选择下一处调查地点">
            <span aria-hidden="true">✦</span>
            <p>看见发光的小圈了吗？点一个你想和 Pi 一起弄清的地方。</p>
            <div className="world-question-fallback">
              <small>也可以从这里出发</small>
              {availableQuestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => dispatch({ type: 'SELECT_QUESTION', questionId: item.id })}
                >
                  去{item.destination}看看
                </button>
              ))}
            </div>
          </aside>
        )}

        <div className="pi-dialogue" aria-live="polite">
          <span className="dialogue-speaker">Pi</span>
          <p>{piLine(state, question, result)}</p>
        </div>
      </main>

      <section className="investigation-journal" aria-label="共同调查手账">
        <div className="journal-heading">
          <span>共同调查手账</span>
          <small>{facts.length === 0 ? '还没有发现' : `${facts.length} 个新发现`}</small>
        </div>
        <div className="journal-tape">
          {facts.length === 0 ? <span className="journal-empty">Pi 会把带回来的东西放在这里。</span> : facts.map((fact, index) => (
            <article className={`journal-clue clue-${fact.id}`} key={fact.id}>
              <span>{index + 1}</span>
              <strong>{fact.label}</strong>
              <p>{fact.detail}</p>
            </article>
          ))}
        </div>
        <button className="journal-reset" onClick={() => dispatch({ type: 'RESTART' })}>重新听这首歌</button>
      </section>
    </section>
  );
}

function renderStoryFocus(
  state: FountainSessionState,
  question: FountainQuestion | undefined,
  result: FountainSessionState['lastReturn'],
  dispatch: (action: FountainSessionAction) => void,
) {
  if (state.phase === 'arrival') {
    return <button className="scene-cta" onClick={() => dispatch({ type: 'BEGIN' })}><span>靠近喷泉</span><strong>和 Pi 一起看看</strong><i>→</i></button>;
  }
  if (state.phase === 'first-look') {
    return <button className="scene-cta listening" onClick={() => dispatch({ type: 'COMPLETE_FIRST_LOOK' })}><span>Pi 正侧耳倾听</span><strong>静静听一听</strong><i>♫</i></button>;
  }
  if (state.phase === 'plan' && question) {
    return (
      <article className="story-card pi-plan">
        <span>Pi 想这样弄清</span>
        <strong>“{question.plan}”</strong>
        <p>它会去 <b>{question.destination}</b>，再把看见的带回来。</p>
        <button className="scene-cta compact" onClick={() => dispatch({ type: 'CONFIRM_PLAN' })}>跟上 Pi <i>→</i></button>
      </article>
    );
  }
  if (state.phase === 'expedition' && question) {
    return (
      <article className="story-card pi-journey">
        <span>Pi 正沿着小城出发</span>
        <strong>去 {question.destination}</strong>
        <p>{question.plan}</p>
        <ExpeditionReturnButton onComplete={() => dispatch({ type: 'COMPLETE_EXPEDITION' })} />
      </article>
    );
  }
  if (state.phase === 'return' && result) {
    return (
      <article className={`story-card story-return ${returnTone(result.kind)}`}>
        <span>{returnHeading(result.kind)}</span>
        <strong>{result.title}</strong>
        <p>{result.body}</p>
        <ReturnAcknowledgeButton onAcknowledge={() => dispatch({ type: 'ACKNOWLEDGE_RETURN' })} />
      </article>
    );
  }
  if (state.phase === 'action') {
    return (
      <article className="story-card pi-action">
        <span>Pi 把两件发现放在一起</span>
        <strong>“水压和回应节拍得一起配合。”</strong>
        <p>它想去工具坊装上一枚同步阀。</p>
        <button className="scene-cta compact" onClick={() => dispatch({ type: 'PERFORM_SYNC_ACTION' })}>让 Pi 去试试看 <i>→</i></button>
      </article>
    );
  }
  if (state.phase === 'complete') {
    return (
      <article className="story-card story-complete">
        <span>晚风里的最后确认</span>
        <strong>喷泉唱完了一整首。</strong>
        <p>乐手、风铃和水声终于一起和起来了。</p>
        <button className="scene-cta compact" onClick={() => dispatch({ type: 'RESTART' })}>再听一次 <i>↻</i></button>
      </article>
    );
  }
  return <div className="story-empty">新的发现会让城市里出现下一颗疑问种子。</div>;
}

function ReturnAcknowledgeButton({ onAcknowledge }: { onAcknowledge: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2150);
    return () => window.clearTimeout(timer);
  }, []);
  return <button className="scene-cta compact" onClick={onAcknowledge} disabled={!ready}>
    {ready ? '把它记进手账' : 'Pi 正带着发现回来…'} <i>{ready ? '↘' : '· · ·'}</i>
  </button>;
}

function ExpeditionReturnButton({ onComplete }: { onComplete: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2700);
    return () => window.clearTimeout(timer);
  }, []);
  return <button className="scene-cta compact" onClick={onComplete} disabled={!ready}>
    {ready ? '等 Pi 带着发现回来' : 'Pi 正沿着灯火前往…'} <i>{ready ? '→' : '· · ·'}</i>
  </button>;
}

function piLine(state: FountainSessionState, question?: FountainQuestion, result?: FountainSessionState['lastReturn']): string {
  if (state.phase === 'arrival') return '“我们先别猜。我去听一听。”';
  if (state.phase === 'first-look') return '“第七拍有点不对劲。”';
  if (state.phase === 'choose-question') return state.facts.includes('sync-valve') ? '“怎样才算真的办好了？”' : '“你觉得我们还该弄清什么？”';
  if (state.phase === 'plan' && question) return `“${question.prompt.replace(/[？?]$/, '')}，这件事值得去看。”`;
  if (state.phase === 'expedition') return '“我去把答案带回来。”';
  if (state.phase === 'return' && result) return result.kind === 'refuted' ? '“也知道了什么不是答案。”' : '“这件新发现让我得再想一想。”';
  if (state.phase === 'action') return '“现在我知道该怎么试了。”';
  return '“谢谢你和我一起把它弄明白。”';
}

function storyChapter(state: FountainSessionState): string {
  if (state.phase === 'arrival' || state.phase === 'first-look') return '第一章 · 一处不对劲';
  if (state.phase === 'choose-question' && !state.facts.includes('sync-valve')) return '第二章 · 还没弄清的事';
  if (state.phase === 'plan' || state.phase === 'expedition') return '第三章 · Pi 出发了';
  if (state.phase === 'return') return '第四章 · 带回来的东西';
  if (state.phase === 'action') return '第五章 · 换一个做法';
  if (state.phase === 'complete') return '第六章 · 歌唱完了';
  return '第五章 · 怎样才算办好';
}

function returnHeading(kind: FountainReturnKind): string {
  if (kind === 'refuted') return '排除了一个解释';
  if (kind === 'refined') return '事情变得更具体了';
  if (kind === 'confirmed') return '晚风确认了这件事';
  return 'Pi 带回了一点新东西';
}
