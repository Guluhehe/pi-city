import { useEffect, useMemo, useState } from 'react';
import '../city-hub.css';
import { FountainStoryScene } from '../world/FountainStoryScene';
import {
  CITY_DISCOVERIES,
  CITY_MISSIONS,
  chapterTrust,
  isMissionUnlocked,
  type CityCampaignState,
  type CityChapter,
  type CityMissionId,
} from '../game';
import type { FountainSessionState } from '../game';

const CHAPTERS: Array<{ id: CityChapter; title: string; subtitle: string; district: string }> = [
  { id: 1, title: '第一次把事办好', subtitle: '先看、带回、再确认', district: '港口与广场' },
  { id: 2, title: 'Pi 会记得，也会重新想', subtitle: '旧线索与新发现', district: '屋顶、档案与银幕' },
  { id: 3, title: 'Pi 会动手，也会认真收尾', subtitle: '行动、改路与真正原因', district: '花园、邮局与风车' },
  { id: 4, title: '更多人开始相信 Pi', subtitle: '先后、矛盾与共同星光', district: '市场、雾港与节日广场' },
];

export function CityStoryHub({ campaign, onBeginMission, onOpenArchives }: { campaign: CityCampaignState; onBeginMission: (missionId: CityMissionId) => void; onOpenArchives: () => void }) {
  const [showDiscoveries, setShowDiscoveries] = useState(false);
  const [memoryWindStage, setMemoryWindStage] = useState<'intro' | 'invite' | 'explore'>('intro');
  const [memoryWindReady, setMemoryWindReady] = useState(false);
  const nextMission = (Object.values(CITY_MISSIONS) as Array<typeof CITY_MISSIONS[CityMissionId]>).find((mission) => isMissionUnlocked(campaign, mission.id) && !campaign.completedMissions.includes(mission.id));
  const latest = campaign.completedMissions.at(-1);
  const activeChapter: CityChapter = nextMission?.chapter ?? (latest ? CITY_MISSIONS[latest].chapter : 1);
  const [selectedChapter, setSelectedChapter] = useState<CityChapter>(activeChapter);
  const selected = CHAPTERS.find((chapter) => chapter.id === selectedChapter) ?? CHAPTERS[0];
  const memoryWindActive = selectedChapter === 2 && nextMission?.id === 'kite';
  const artPrototype = new URLSearchParams(window.location.search).get('artPrototype') === 'memory-wind';
  useEffect(() => {
    setMemoryWindReady(false);
    setMemoryWindStage(memoryWindActive ? 'intro' : 'explore');
  }, [memoryWindActive]);
  useEffect(() => {
    if (!memoryWindActive || !memoryWindReady) return;
    const invite = window.setTimeout(() => setMemoryWindStage('invite'), 2400);
    const explore = window.setTimeout(() => setMemoryWindStage('explore'), 16000);
    return () => { window.clearTimeout(invite); window.clearTimeout(explore); };
  }, [memoryWindActive, memoryWindReady]);
  const chapterMissions = (Object.values(CITY_MISSIONS) as Array<typeof CITY_MISSIONS[CityMissionId]>).filter((mission) => mission.chapter === selectedChapter);
  const completed = campaign.completedMissions.length;
  const discoveries = campaign.discoveries.map((id) => CITY_DISCOVERIES[id]).filter(Boolean);
  const backdrop = useMemo<FountainSessionState>(() => ({
    scenarioId: 'fountain-d-greybox', source: 'tutorial', phase: completed >= 3 && !memoryWindActive ? 'complete' : 'arrival', facts: ['pressure-drop'], questionsAsked: [], completed: completed >= 3 && !memoryWindActive,
  }), [completed, memoryWindActive]);

  const stagingMemoryWind = memoryWindActive && memoryWindStage !== 'explore';
  return <section className={`city-hub trust-${completed} chapter-${selectedChapter} ${memoryWindActive ? `memory-wind-stage-${memoryWindStage}` : ''}`} aria-label="Pi City 心愿码头">
    <FountainStoryScene state={backdrop} onSelectQuestion={() => {}} missionTheme={memoryWindActive ? 'kite' : 'fountain'} memoryWind={memoryWindActive} memoryWindBeat={memoryWindStage === 'intro' ? 'notice' : 'hold'} heroPi={artPrototype} onSceneReady={() => setMemoryWindReady(true)} />
    <header className="hub-topbar">
      <div><small>PI 的城市故事 · 第{selectedChapter}章</small><strong>心愿码头</strong></div>
      <div className="hub-top-actions"><button onClick={() => setShowDiscoveries((value) => !value)}>发现册 <em>{discoveries.length}/{Object.keys(CITY_DISCOVERIES).length}</em></button><button onClick={onOpenArchives}>Pi 档案馆</button></div>
    </header>

    {memoryWindActive && <section className="memory-wind-invite" aria-live="polite">
      <p>风把一段旧记忆吹散了。</p>
      <strong>Pi 先抬头看见了它。</strong>
      <span>“我们先别急着猜。”</span>
      <button onClick={() => onBeginMission('kite')}>和 Pi 一起看看 <i>→</i></button>
    </section>}

    {!stagingMemoryWind && <section className="hub-hero">
      <p>{selected.district}</p>
      <h1>陪 Pi 把一件件<br />小心愿办好。</h1>
      <span>{nextMission ? `下一件心愿：${nextMission.title}` : '所有心愿都在城市里留下了光。'}</span>
    </section>}

    {!stagingMemoryWind && <section className="trust-map trust-atlas" aria-label="城市信任图">
      <header><small>城市信任图</small><b>{completed}/12</b></header>
      <div className="trust-chapters">{CHAPTERS.map((chapter) => {
        const trust = chapterTrust(campaign, chapter.id);
        return <button key={chapter.id} className={`${selectedChapter === chapter.id ? 'selected' : ''} ${trust === 3 ? 'complete' : ''}`} onClick={() => setSelectedChapter(chapter.id)}><i>{trust === 3 ? '✦' : trust ? '◐' : '○'}</i><span>第{chapter.id}章</span><strong>{trust}/3</strong></button>;
      })}</div>
      <p>{selected.title}<small>{selected.subtitle}</small></p>
    </section>}

    {!stagingMemoryWind && <section className="wish-dock" aria-label={`第${selectedChapter}章居民心愿`}>
      <header><div><small>第{selectedChapter}章 · {selected.subtitle}</small><strong>{selected.title}</strong></div><p>{completed === 0 ? '每件心愿只要几分钟；城市会记住你们办成的事。' : `已经有 ${completed} 处角落亮起来，新的居民开始愿意把心愿交给 Pi。`}</p></header>
      <div className="wish-cards">{chapterMissions.map((mission) => {
        const done = campaign.completedMissions.includes(mission.id);
        const unlocked = isMissionUnlocked(campaign, mission.id);
        const waitingForCurrent = !unlocked && selectedChapter > activeChapter;
        return <article key={mission.id} className={`${done ? 'done' : ''} ${unlocked ? 'available' : 'waiting'} ${waitingForCurrent ? 'future' : ''}`}>
          <small>{done ? '城市记得这件事' : unlocked ? mission.resident : waitingForCurrent ? `第${activeChapter}章还在发生` : '有人会在之后来码头等 Pi'}</small>
          <h2>{mission.title}</h2>
          <p>{done ? mission.cityMark : unlocked ? mission.shortWish : mission.learning}</p>
          <button disabled={!unlocked} onClick={() => onBeginMission(mission.id)}>{done ? '再去看看' : unlocked ? '和 Pi 一起去' : waitingForCurrent ? '先把眼前的心愿办好' : '等前一件心愿办好'}</button>
        </article>;
      })}</div>
      <footer className="chapter-footer"><span>✦ 每一章的三件心愿都会让一个街区真正变亮。</span>{selectedChapter < 4 && <button onClick={() => setSelectedChapter((selectedChapter + 1) as CityChapter)}>看看下一章的街区 →</button>}</footer>
    </section>}

    {showDiscoveries && <aside className="discovery-drawer discovery-shelf" aria-label="城市发现册"><button onClick={() => setShowDiscoveries(false)}>收起发现册 ×</button><header><small>PI 带回来的小东西</small><h2>城市发现书架</h2><p>留在书架上的不是分数，而是每次绕路、记起或重新确认时带回来的物件。</p></header>{CHAPTERS.map((chapter) => {
      const shelf = Object.values(CITY_DISCOVERIES).filter((item) => item.chapter === chapter.id);
      return <section key={chapter.id}><h3>第{chapter.id}章 · {chapter.title}</h3><div>{shelf.map((item) => {
        const found = campaign.discoveries.includes(item.id);
        return <article key={item.id} className={found ? 'found' : 'unknown'}><i>{found ? '✦' : '○'}</i><strong>{found ? item.label : '城市里还有一件小东西'}</strong><p>{found ? item.detail : '等 Pi 在一条不是必须走的路上，把它带回来。'}</p></article>;
      })}</div></section>;
    })}</aside>}
  </section>;
}
