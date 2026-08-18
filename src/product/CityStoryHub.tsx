import { useMemo, useState } from 'react';
import '../city-hub.css';
import { FountainStoryScene } from '../world/FountainStoryScene';
import {
  CITY_DISCOVERIES,
  CITY_MISSIONS,
  cityTrust,
  isMissionUnlocked,
  type CityCampaignState,
  type CityMissionId,
} from '../game';
import type { FountainSessionState } from '../game';

const SEASON_PREVIEW = [
  ['找不到家的小风筝', 'Pi 会记得，也会重新想'],
  ['两把钥匙', '新的证据会让 Pi 放下第一种猜法'],
  ['雨天的露天电影', 'Pi 要选择这次带什么回来'],
  ['花园里醒不过来的种子', '做完后仍要看见结果'],
  ['同一晚的两张心愿单', '先帮谁会改变城市的一点节奏'],
] as const;

export function CityStoryHub({
  campaign,
  onBeginMission,
  onOpenArchives,
}: {
  campaign: CityCampaignState;
  onBeginMission: (missionId: CityMissionId) => void;
  onOpenArchives: () => void;
}) {
  const [showDiscoveries, setShowDiscoveries] = useState(false);
  const backdrop = useMemo<FountainSessionState>(() => ({
    scenarioId: 'fountain-d-greybox', source: 'tutorial', phase: campaign.completedMissions.includes('fountain') ? 'complete' : 'arrival',
    facts: ['pressure-drop'], questionsAsked: [], completed: campaign.completedMissions.includes('fountain'),
  }), [campaign.completedMissions]);
  const completed = campaign.completedMissions.length;
  const discoveries = campaign.discoveries.map((id) => CITY_DISCOVERIES[id]);

  return <section className={`city-hub trust-${completed}`} aria-label="Pi City 心愿码头">
    <FountainStoryScene state={backdrop} onSelectQuestion={() => {}} />
    <header className="hub-topbar">
      <div><small>PI 的城市故事 · 第一章</small><strong>心愿码头</strong></div>
      <div className="hub-top-actions"><button onClick={() => setShowDiscoveries((value) => !value)}>发现册 {discoveries.length ? `· ${discoveries.length}` : ''}</button><button onClick={onOpenArchives}>Pi 档案馆</button></div>
    </header>

    <section className="hub-hero">
      <p>今晚，港口有人在等 Pi 帮忙。</p>
      <h1>陪 Pi 把一件件<br />小心愿办好。</h1>
      <span>{completed === 0 ? '先从第一件心愿开始。' : `你已经让 ${completed} 处城市角落亮起来。`}</span>
    </section>

    <section className="trust-map" aria-label="城市信任图">
      <small>城市信任图</small>
      <div>{(['灯塔', '邮局', '喷泉'] as const).map((label, index) => <span key={label} className={completed > index ? 'lit' : ''}><i>{completed > index ? '✦' : '○'}</i>{label}</span>)}</div>
    </section>

    <section className="wish-dock" aria-label="第一章居民心愿">
      <header><div><small>第一章 · 第一次把事办好</small><strong>谁在等 Pi？</strong></div><p>每件心愿只要几分钟；城市会记住你们办成的事。</p></header>
      <div className="wish-cards">{(Object.values(CITY_MISSIONS) as typeof CITY_MISSIONS[CityMissionId][]).map((mission) => {
        const done = campaign.completedMissions.includes(mission.id);
        const unlocked = isMissionUnlocked(campaign, mission.id);
        return <article key={mission.id} className={`${done ? 'done' : ''} ${unlocked ? 'available' : 'waiting'}`}>
          <small>{done ? '城市记得这件事' : unlocked ? mission.resident : '有人会在之后来码头等 Pi'}</small>
          <h2>{mission.title}</h2>
          <p>{done ? mission.cityMark : unlocked ? mission.shortWish : mission.learning}</p>
          <button disabled={!unlocked} onClick={() => onBeginMission(mission.id)}>{done ? '再去看看' : unlocked ? '和 Pi 一起去' : '等前一件心愿办好'}</button>
        </article>;
      })}</div>
      <div className="season-preview"><small>这座城市还会慢慢出现的新心愿</small>{SEASON_PREVIEW.map(([title, learning]) => <span key={title}><b>{title}</b>{learning}</span>)}</div>
    </section>

    {showDiscoveries && <aside className="discovery-drawer" aria-label="城市发现册"><button onClick={() => setShowDiscoveries(false)}>收起发现册 ×</button><h2>Pi 带回来的小东西</h2>{discoveries.length ? discoveries.map((item) => <article key={item.id}><strong>{item.label}</strong><p>{item.detail}</p></article>) : <p>等 Pi 从城市里带回第一件值得留下的东西。</p>}</aside>}
  </section>;
}
