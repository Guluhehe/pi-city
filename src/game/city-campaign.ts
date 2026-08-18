export type CityMissionId =
  | 'lighthouse' | 'parcel' | 'fountain'
  | 'kite' | 'keys' | 'cinema'
  | 'seed' | 'card' | 'windmill'
  | 'orders' | 'fogbell' | 'festival';

export type CityChapter = 1 | 2 | 3 | 4;
export type CityDiscoveryId = string;

export interface CityMissionSummary {
  id: CityMissionId;
  chapter: CityChapter;
  resident: string;
  title: string;
  shortWish: string;
  learning: string;
  cityMark: string;
  availableAfter: CityMissionId | null;
}

export const CITY_MISSIONS: Record<CityMissionId, CityMissionSummary> = {
  lighthouse: { id: 'lighthouse', chapter: 1, resident: '露露 · 灯塔守望人', title: '灯塔还亮着吗？', shortWish: '游行开始时，灯塔还能不能一直亮着？', learning: '做过一件事，也要等到该确认的时候再看看。', cityMark: '灯塔亮起，入口挂出一张小画。', availableAfter: null },
  parcel: { id: 'parcel', chapter: 1, resident: '阿岚 · 邮差', title: '迷路的邮包', shortWish: '这封生日信该送到哪一扇红门？', learning: '以前的事，要和眼前的新发现一起想。', cityMark: '邮局挂上“Pi 路线图”。', availableAfter: 'lighthouse' },
  fountain: { id: 'fountain', chapter: 1, resident: '码头乐手', title: '只会唱半首歌的喷泉', shortWish: '它每次唱到第七拍，就不肯再唱了。', learning: '新发现带回来后，Pi 可能会换一个办法。', cityMark: '喷泉与码头乐手重新合奏。', availableAfter: 'parcel' },
  kite: { id: 'kite', chapter: 2, resident: '小米 · 风筝主人', title: '找不到家的小风筝', shortWish: '它只记得风筝落在“有红门的地方”。', learning: '记忆是一条线索，不必是最后的答案。', cityMark: '屋顶之间挂起风筝绳和一条小路。', availableAfter: 'fountain' },
  keys: { id: 'keys', chapter: 2, resident: '椿 · 图书管理员', title: '两把钥匙', shortWish: '两把钥匙都像对的，哪一把能开小门？', learning: '新证据可以让 Pi 放下第一种猜法。', cityMark: '档案馆多了一扇可进入的小门。', availableAfter: 'kite' },
  cinema: { id: 'cinema', chapter: 2, resident: '茉莉 · 放映员', title: '雨天的露天电影', shortWish: '电影快开场了，天上却要下雨。', learning: 'Pi 不能每次都带上所有东西，要挑此刻有用的。', cityMark: '广场支起雨棚，夜里有电影灯。', availableAfter: 'keys' },
  seed: { id: 'seed', chapter: 3, resident: '朵朵 · 园丁', title: '花园里醒不过来的种子', shortWish: '庆典前，夜花能醒过来吗？', learning: '行动的结果必须被看见，才能确定真的有效。', cityMark: '花园出现一片会发光的夜花。', availableAfter: 'cinema' },
  card: { id: 'card', chapter: 3, resident: '米洛 · 咖啡师', title: '一张没有署名的感谢卡', shortWish: '两位居民都以为这张卡写给自己。', learning: 'Pi 会把新发现带回来，重新估量原来的路线。', cityMark: '邮局墙上出现“谢谢你”卡片展。', availableAfter: 'seed' },
  windmill: { id: 'windmill', chapter: 3, resident: '桑 · 面粉师', title: '风车的秘密时间', shortWish: '风车总会在同一刻停下来。', learning: '眼前的问题和真正原因，有时不是一件事。', cityMark: '风车成为可以远眺的风向提示。', availableAfter: 'card' },
  orders: { id: 'orders', chapter: 4, resident: '面包师与港口乐队', title: '同一晚的两张心愿单', shortWish: '送货路线和演出海报，都在等 Pi。', learning: '先帮谁，会改变这一晚城市的节奏。', cityMark: '市场与剧场同时准备开门。', availableAfter: 'windmill' },
  fogbell: { id: 'fogbell', chapter: 4, resident: '船长阿黎', title: '海雾里的船铃', shortWish: '雾太大了，大家给出的方向却不一样。', learning: '面对不一致的信息，Pi 会继续查，而不是假装确定。', cityMark: '港口亮起雾灯，船铃可以被听见。', availableAfter: 'orders' },
  festival: { id: 'festival', chapter: 4, resident: '整座城市', title: '星光节的最后一盏灯', shortWish: '把大家留下的小光，带到节日的最后一盏灯旁。', learning: '记忆、行动、确认和回应，能连成一整条办事能力。', cityMark: '星光节点亮，完整信任图与 Pi 档案馆开放。', availableAfter: 'fogbell' },
};

export interface CityDiscovery { id: CityDiscoveryId; label: string; detail: string; missionId: CityMissionId; chapter: CityChapter; }

export const CITY_DISCOVERIES: Record<CityDiscoveryId, CityDiscovery> = {
  'lighthouse-childhood-sketch': { id: 'lighthouse-childhood-sketch', label: '露露小时候画的灯塔', detail: '不影响修灯，却让 Pi 知道露露为什么总在游行前担心它。', missionId: 'lighthouse', chapter: 1 },
  'lighthouse-unconfirmed-seal': { id: 'lighthouse-unconfirmed-seal', label: '尚未确认的萤火印章', detail: '过早回信后，灯在游行前又暗了一次；它提醒 Pi 在真正的时刻再确认。', missionId: 'lighthouse', chapter: 1 },
  'old-lane-sign': { id: 'old-lane-sign', label: '海风巷旧路牌', detail: '旧路名没有错，只是城市已经把它改叫潮汐街。', missionId: 'parcel', chapter: 1 },
  'postal-half-receipt': { id: 'postal-half-receipt', label: '只对上一半的投递回执', detail: '先去邮局并不算白跑：只有旧地址或新门牌都还不够。', missionId: 'parcel', chapter: 1 },
  'wind-bell-fragment': { id: 'wind-bell-fragment', label: '不随风断拍的小铃片', detail: '不同风向下，喷泉还是在第七拍停住；Pi 因此排除了“是风”的解释。', missionId: 'fountain', chapter: 1 },
  'melody-after-page': { id: 'melody-after-page', label: '完整回应节拍的小纸页', detail: '乐手把缺失的回应节拍补在纸页背面，留给城市继续唱下去。', missionId: 'fountain', chapter: 1 },
  'kite-tail-note': { id: 'kite-tail-note', label: '风筝尾巴上的旧便签', detail: '它记得曾经的红门，却没有告诉 Pi 风筝现在在哪里。', missionId: 'kite', chapter: 2 },
  'keyhole-rubbing': { id: 'keyhole-rubbing', label: '门锁拓印纸', detail: '第一把钥匙留下的轻微划痕，让第二次观察有了意义。', missionId: 'keys', chapter: 2 },
  'rain-ticket': { id: 'rain-ticket', label: '雨天电影票根', detail: '少带一件东西也不算失败；它留下一张下次可以再看的票根。', missionId: 'cinema', chapter: 2 },
  'night-seed-shell': { id: 'night-seed-shell', label: '夜花的种壳', detail: '工具坊做过的事，只有在花园里看见花开才算真的回来了。', missionId: 'seed', chapter: 3 },
  'unsigned-stroke': { id: 'unsigned-stroke', label: '感谢卡上的一笔蓝墨', detail: '一笔新笔迹改变了 Pi 原本打算去的方向。', missionId: 'card', chapter: 3 },
  'windmill-clock-chip': { id: 'windmill-clock-chip', label: '风车的刻时木片', detail: '快修可以让它现在转起来，木片则让 Pi 看见它为何总会再停。', missionId: 'windmill', chapter: 3 },
  'waiting-bread-tag': { id: 'waiting-bread-tag', label: '等候中的面包牌', detail: '先去剧场时，面包师没有生气，只把一张温热的等候牌留在窗口。', missionId: 'orders', chapter: 4 },
  'foggy-compass': { id: 'foggy-compass', label: '被海雾打湿的罗盘', detail: '它指向一个方向，却与码头的铃声不同；Pi 需要再查一遍。', missionId: 'fogbell', chapter: 4 },
  'starlight-thread': { id: 'starlight-thread', label: '各街区捻成的星光线', detail: '每一段都来自此前办好的小心愿。', missionId: 'festival', chapter: 4 },
};

export interface CityCampaignState { source: 'tutorial'; activeMission: CityMissionId | null; completedMissions: CityMissionId[]; discoveries: CityDiscoveryId[]; }
export type CityCampaignAction =
  | { type: 'BEGIN_MISSION'; missionId: CityMissionId }
  | { type: 'COMPLETE_MISSION'; missionId: CityMissionId }
  | { type: 'ADD_DISCOVERY'; discoveryId: CityDiscoveryId }
  | { type: 'RETURN_TO_HARBOR' }
  | { type: 'RESET_CITY' };

export function createCityCampaign(): CityCampaignState { return { source: 'tutorial', activeMission: null, completedMissions: [], discoveries: [] }; }
export function isMissionUnlocked(state: CityCampaignState, missionId: CityMissionId): boolean { const gate = CITY_MISSIONS[missionId].availableAfter; return gate === null || state.completedMissions.includes(gate); }
export function cityTrust(state: CityCampaignState): number { return state.completedMissions.length; }
export function chapterTrust(state: CityCampaignState, chapter: CityChapter): number { return state.completedMissions.filter((id) => CITY_MISSIONS[id].chapter === chapter).length; }

export function reduceCityCampaign(state: CityCampaignState, action: CityCampaignAction): CityCampaignState {
  if (action.type === 'RESET_CITY') return createCityCampaign();
  if (action.type === 'RETURN_TO_HARBOR') return { ...state, activeMission: null };
  if (action.type === 'BEGIN_MISSION') return isMissionUnlocked(state, action.missionId) ? { ...state, activeMission: action.missionId } : state;
  if (action.type === 'COMPLETE_MISSION') return state.completedMissions.includes(action.missionId) ? { ...state, activeMission: null } : { ...state, activeMission: null, completedMissions: [...state.completedMissions, action.missionId] };
  if (action.type === 'ADD_DISCOVERY') return state.discoveries.includes(action.discoveryId) ? state : { ...state, discoveries: [...state.discoveries, action.discoveryId] };
  return state;
}
