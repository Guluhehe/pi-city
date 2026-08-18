import '../fountain.css';
import {
  FOUNTAIN_QUESTIONS,
  availableFountainQuestions,
  factDetails,
  fountainProgressLabel,
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
  const facts = factDetails(state);
  const questions = availableFountainQuestions(state);
  const question = state.pendingQuestion ? FOUNTAIN_QUESTIONS[state.pendingQuestion] : undefined;
  const result = state.lastReturn;

  return (
    <section className="fountain-greybox" aria-label="Pi City fountain tutorial story">
      <header className="fountain-topbar">
        <div>
          <small>TUTORIAL STORY · D GREYBOX</small>
          <strong>只会唱半首歌的喷泉</strong>
        </div>
        <div>
          <span className="tutorial-source">AUTHOR-DEFINED · NOT A TRACE</span>
          <button onClick={onExit}>退出灰盒</button>
        </div>
      </header>

      <main className="fountain-layout">
        <aside className="fountain-brief">
          <div className="fountain-step">{fountainProgressLabel(state)}</div>
          <h1>让 Pi 和你一起把这首歌弄明白。</h1>
          <p>码头乐手希望喷泉在今晚唱完整首歌。Pi 会自己行动；你只需要说出现在最值得弄清的事。</p>
          <div className="fountain-resident">
            <span>码头乐手</span>
            <p>“它每次唱到第七拍，就不肯再唱了。”</p>
          </div>
          <div className="fountain-pi-status">
            <span>PI</span>
            <p>{piStatus(state)}</p>
          </div>
        </aside>

        <section className="thinking-desk">
          <header>
            <div>
              <small>思考塔的小桌子</small>
              <h2>{deskTitle(state)}</h2>
            </div>
            <span>{facts.length} 件发现</span>
          </header>

          <div className="desk-grid">
            <section className="desk-zone known-zone">
              <div className="desk-zone-title"><span>01</span><strong>已经知道</strong></div>
              {facts.length === 0 ? <p className="desk-empty">Pi 还没有带回发现。</p> : (
                <div className="fact-stack">
                  {facts.map((fact) => <article className="fact-card" key={fact.id}><strong>{fact.label}</strong><p>{fact.detail}</p></article>)}
                </div>
              )}
            </section>

            <section className="desk-zone unknown-zone">
              <div className="desk-zone-title"><span>02</span><strong>还没弄清</strong></div>
              {renderUnknown(state, questions, dispatch)}
            </section>

            <section className="desk-zone plan-zone">
              <div className="desk-zone-title"><span>03</span><strong>Pi 的计划</strong></div>
              {renderPlan(state, question, dispatch)}
            </section>

            <section className="desk-zone return-zone">
              <div className="desk-zone-title"><span>04</span><strong>新带回的发现</strong></div>
              {renderReturn(state, result, dispatch)}
            </section>
          </div>
        </section>
      </main>

      <footer className="fountain-footer">
        <span>灰盒目标：看清“问题 → Pi 行动 → 新事实 → 新计划”。</span>
        <button onClick={() => dispatch({ type: 'RESTART' })}>从头再来</button>
      </footer>
    </section>
  );
}

function renderUnknown(
  state: FountainSessionState,
  questions: ReturnType<typeof availableFountainQuestions>,
  dispatch: (action: FountainSessionAction) => void,
) {
  if (state.phase === 'arrival') {
    return <button className="fountain-primary start-action" onClick={() => dispatch({ type: 'BEGIN' })}>和 Pi 一起看看 →</button>;
  }
  if (state.phase === 'first-look') {
    return <button className="fountain-primary" onClick={() => dispatch({ type: 'COMPLETE_FIRST_LOOK' })}>让 Pi 听一听喷泉</button>;
  }
  if (state.phase === 'choose-question') {
    return (
      <div className="question-list">
        <p className="desk-prompt">你觉得 Pi 现在最该弄清什么？</p>
        {questions.map((item) => (
          <button className="question-card" key={item.id} onClick={() => dispatch({ type: 'SELECT_QUESTION', questionId: item.id })}>
            <small>{item.source}</small>
            <strong>{item.prompt}</strong>
          </button>
        ))}
      </div>
    );
  }
  if (state.phase === 'action') {
    return <p className="desk-empty">两件关键发现已经放在一起。现在不再需要猜地点。</p>;
  }
  if (state.phase === 'complete') {
    return <p className="desk-success">这一首歌已经完整唱完。</p>;
  }
  return <p className="desk-empty">Pi 正在把刚才的问题变成行动。</p>;
}

function renderPlan(
  state: FountainSessionState,
  question: FountainQuestion | undefined,
  dispatch: (action: FountainSessionAction) => void,
) {
  if (state.phase === 'plan' && question) {
    return (
      <div className="plan-card active">
        <small>因为你问：{question.prompt}</small>
        <strong>“{question.plan}”</strong>
        <p>目的地：{question.destination}</p>
        <button className="fountain-primary" onClick={() => dispatch({ type: 'CONFIRM_PLAN' })}>好，我们去</button>
      </div>
    );
  }
  if (state.phase === 'expedition' && question) {
    return <div className="plan-card travelling"><small>Pi 正在前往</small><strong>{question.destination}</strong><p>{question.plan}</p><button className="fountain-primary" onClick={() => dispatch({ type: 'COMPLETE_EXPEDITION' })}>Pi 带回发现</button></div>;
  }
  if (state.phase === 'action') {
    return (
      <div className="plan-card active sync-plan">
        <small>两件发现一起改变了 Pi 的判断</small>
        <strong>“水压和回应节拍得一起配合。”</strong>
        <p>Pi 想去工具坊安装同步阀。</p>
        <button className="fountain-primary" onClick={() => dispatch({ type: 'PERFORM_SYNC_ACTION' })}>让 Pi 去试试看</button>
      </div>
    );
  }
  if (state.phase === 'complete') {
    return <div className="plan-card complete-plan"><small>Pi 的最后确认</small><strong>“这次真的办好了。”</strong><p>喷泉在晚风里唱完了一整首歌。</p></div>;
  }
  return <p className="desk-empty">选一个未知问题后，Pi 会说明它打算怎么去弄清。</p>;
}

function renderReturn(
  state: FountainSessionState,
  result: FountainSessionState['lastReturn'],
  dispatch: (action: FountainSessionAction) => void,
) {
  if (state.phase === 'return' && result) {
    return (
      <div className={`return-card ${returnTone(result.kind)}`}>
        <small>{result.kind === 'refuted' ? '排除了一个解释' : result.kind === 'refined' ? '问题变得更具体了' : result.kind === 'confirmed' ? '已经确认' : '带回了新答案'}</small>
        <strong>{result.title}</strong>
        <p>{result.body}</p>
        <button className="fountain-primary" onClick={() => dispatch({ type: 'ACKNOWLEDGE_RETURN' })}>把它放回桌上</button>
      </div>
    );
  }
  if (state.phase === 'complete') {
    return <div className="return-card confirmed"><small>城市回响</small><strong>乐手和风铃开始和声。</strong><p>Pi 把纸船送给了码头乐手。</p></div>;
  }
  return <p className="desk-empty">Pi 带回的新发现会放在这里。它可能回答问题，也可能排除一个解释。</p>;
}

function deskTitle(state: FountainSessionState): string {
  if (state.phase === 'arrival') return '先听听喷泉在说什么';
  if (state.phase === 'first-look') return 'Pi 先做一次初看';
  if (state.phase === 'choose-question') return state.facts.includes('sync-valve') ? '怎样才算真的办好了？' : '现在最该弄清什么？';
  if (state.phase === 'plan') return 'Pi 把你的问题变成了计划';
  if (state.phase === 'expedition') return 'Pi 正在亲自去弄清';
  if (state.phase === 'return') return '新发现回到了思考塔';
  if (state.phase === 'action') return 'Pi 换了一个做法';
  return '喷泉唱完了';
}

function piStatus(state: FountainSessionState): string {
  if (state.phase === 'arrival') return '“我们先别猜。我去听一听。”';
  if (state.phase === 'first-look') return '“第七拍有点不对劲。”';
  if (state.phase === 'choose-question') return '“你觉得我们还该弄清什么？”';
  if (state.phase === 'plan') return '“这个问题能帮我决定先去哪里。”';
  if (state.phase === 'expedition') return '“我去把答案带回来。”';
  if (state.phase === 'return') return '“这件新发现改变了我们知道的事。”';
  if (state.phase === 'action') return '“现在我知道该怎么试了。”';
  return '“谢谢你和我一起把它弄明白。”';
}
