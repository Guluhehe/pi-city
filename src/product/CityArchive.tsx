import '../city-hub.css';

export function CityArchive({ onBack, onEnterEvidenceCity }: { onBack: () => void; onEnterEvidenceCity: () => void }) {
  return <section className="city-archive" aria-label="Pi 档案馆">
    <header><button onClick={onBack}>← 回到心愿码头</button><small>PI CITY 档案馆</small></header>
    <main>
      <p className="archive-kicker">城市故事的另一面</p>
      <h1>刚才那件小心愿，<br />和 Pi 有什么关系？</h1>
      <p className="archive-intro">你不必读日志也能玩完城市故事。只有想多看一层时，才来到这里。</p>
      <div className="archive-layers">
        <article className="archive-story"><span>01 · Story</span><h2>城市里发生的事</h2><p>露露、阿岚和码头乐手的心愿，是作者定义的教学故事。它们帮助你体验 Pi 的节奏，但不是一段真实运行记录。</p></article>
        <article className="archive-concept"><span>02 · Concept</span><h2>Pi 的一颗心跳</h2><p><b>观察一点没有弄清的事 → 带回新东西 → 让新东西改变下一步 → 在真的需要时确认。</b> 灯塔、邮包与喷泉分别让这颗心跳显出不同的一面。</p></article>
        <article className="archive-evidence"><span>03 · Evidence Run</span><h2>真实运行档案</h2><p>这里不会把城市故事硬贴到任何日志上。现在可以进入 Pi City 的证据保存探索器，查看导入运行、语义事件和已有的真实示例。</p><button onClick={onEnterEvidenceCity}>打开真实运行档案 →</button></article>
      </div>
      <aside><strong>诚实说明</strong><p>当前没有一段被声明为与这三个城市心愿逐项对应的真实 Trace。因此这里保留概念层与真实档案的距离，而不制造“这就是刚才那段故事”的错觉。</p></aside>
    </main>
  </section>;
}
