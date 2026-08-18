import '../city-hub.css';
import { CITY_DISCOVERIES, CITY_MISSIONS, type CityCampaignState } from '../game';

const CONCEPTS = [
  ['先去看看', 'Pi 不急着猜，会先去城市里多看一点。', 1],
  ['带回来再想', '新的发现不会停在路上；它会回到思考处改变下一步。', 3],
  ['记得，也对照眼前', '旧线索有用，但 Pi 会让它和新的观察放在一起。', 4],
  ['不是什么都塞进小包', '这一趟带什么，会影响 Pi 此刻能想到什么。', 6],
  ['做过，还要确认', 'Pi 会看见行动真的有效，才把好消息告诉居民。', 7],
  ['先后也会改变城市', '当不止一件心愿同时到来，Pi 也要温柔地安排顺序。', 10],
] as const;

export function CityArchive({ campaign, onBack, onEnterEvidenceCity }: { campaign: CityCampaignState; onBack: () => void; onEnterEvidenceCity: () => void }) {
  const completed = campaign.completedMissions.length;
  const storyObjects = campaign.discoveries.map((id) => CITY_DISCOVERIES[id]).filter(Boolean).slice(-4);
  const next = (Object.values(CITY_MISSIONS)).find((mission) => !campaign.completedMissions.includes(mission.id));
  return <section className="city-archive" aria-label="Pi 档案馆">
    <header><button onClick={onBack}>← 回到心愿码头</button><small>PI CITY 档案馆 · 城市后台</small></header>
    <main>
      <p className="archive-kicker">城市故事的另一面</p>
      <h1>刚才那件小心愿，<br />和 Pi 有什么关系？</h1>
      <p className="archive-intro">你不必读日志也能玩完城市故事。档案馆只在你好奇时，帮你把已经亲手经历的事，慢慢说得更清楚。</p>
      <div className="archive-progress"><span>城市心愿进度</span><b>{completed}<small>/ 12</small></b><p>{next ? `下一件还没收进档案的心愿：${next.title}` : '十二件小心愿都已经成为星光节的一部分。'}</p></div>
      <div className="archive-layers">
        <article className="archive-story"><span>01 · Story</span><h2>城市里发生的事</h2><p>这些居民心愿是作者定义的教学故事。它们帮助你体验 Pi 的节奏，但不是某一段真实运行记录。</p></article>
        <article className="archive-concept"><span>02 · Concept</span><h2>Pi 的一颗心跳</h2><p><b>观察一点没有弄清的事 → 带回新东西 → 让新东西改变下一步 → 在真的需要时确认。</b></p></article>
        <article className="archive-evidence"><span>03 · Evidence Run</span><h2>真实运行档案</h2><p>只有主动走进这扇门，才会看到导入运行、语义事件与既有真实示例。</p><button onClick={onEnterEvidenceCity}>打开真实运行档案 →</button></article>
      </div>
      <section className="archive-concept-wall" aria-label="已体验的Pi现象"><header><small>城市物件 → Pi 的现象</small><h2>Pi 今天已经让你遇见了什么？</h2></header><div>{CONCEPTS.map(([title, body, unlockedAfter], index) => {
        const unlocked = completed >= unlockedAfter;
        return <article key={title} className={unlocked ? 'unlocked' : 'sealed'}><i>{unlocked ? '✦' : String(index + 1).padStart(2, '0')}</i><strong>{unlocked ? title : '还会在城市里遇见的事'}</strong><p>{unlocked ? body : `完成更多居民心愿后，这页城市便签会慢慢翻开。`}</p></article>;
      })}</div></section>
      <section className="archive-object-tray" aria-label="最近带回的城市物件"><header><small>最近收进的物件</small><h2>Pi 的小桌面</h2></header>{storyObjects.length ? <div>{storyObjects.map((item) => <article key={item.id}><i>✦</i><strong>{item.label}</strong><p>{item.detail}</p></article>)}</div> : <p>先陪 Pi 办一件心愿；不走主路时带回的小东西，会留在这张桌面上。</p>}</section>
      <aside><strong>诚实说明</strong><p>城市故事与真实运行档案彼此相邻，但并不互相冒充。当前没有被声明为与任何一件城市心愿逐项对应的真实 Trace；因此这里先保留概念与物件，真实证据只在你主动进入后展示。</p></aside>
    </main>
  </section>;
}
