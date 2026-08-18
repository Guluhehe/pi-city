export type CityMissionId = 'lighthouse' | 'parcel' | 'fountain';

export type CityDiscoveryId =
  | 'lighthouse-childhood-sketch'
  | 'lighthouse-unconfirmed-seal'
  | 'old-lane-sign'
  | 'postal-half-receipt'
  | 'wind-bell-fragment'
  | 'melody-after-page';

export interface CityMissionSummary {
  id: CityMissionId;
  chapter: 1;
  resident: string;
  title: string;
  shortWish: string;
  learning: string;
  cityMark: string;
  availableAfter: CityMissionId | null;
}

export const CITY_MISSIONS: Record<CityMissionId, CityMissionSummary> = {
  lighthouse: {
    id: 'lighthouse',
    chapter: 1,
    resident: '露露 · 灯塔守望人',
    title: '灯塔还亮着吗？',
    shortWish: '游行开始时，灯塔还能不能一直亮着？',
    learning: '做过一件事，也要等到该确认的时候再看看。',
    cityMark: '灯塔亮起，入口挂出一张小画。',
    availableAfter: null,
  },
  parcel: {
    id: 'parcel',
    chapter: 1,
    resident: '阿岚 · 邮差',
    title: '迷路的邮包',
    shortWish: '这封生日信该送到哪一扇红门？',
    learning: '以前知道的事，要和眼前的新发现一起想。',
    cityMark: '邮局出现一块新路牌。',
    availableAfter: 'lighthouse',
  },
  fountain: {
    id: 'fountain',
    chapter: 1,
    resident: '码头乐手',
    title: '只会唱半首歌的喷泉',
    shortWish: '它每次唱到第七拍，就不肯再唱了。',
    learning: '新发现带回来后，Pi 可能会换一个办法。',
    cityMark: '喷泉与码头乐手重新合奏。',
    availableAfter: 'parcel',
  },
};

export interface CityDiscovery {
  id: CityDiscoveryId;
  label: string;
  detail: string;
  missionId: CityMissionId;
}

export const CITY_DISCOVERIES: Record<CityDiscoveryId, CityDiscovery> = {
  'lighthouse-childhood-sketch': {
    id: 'lighthouse-childhood-sketch',
    label: '露露小时候画的灯塔',
    detail: '不影响修灯，却让 Pi 知道露露为什么总在游行前担心它。',
    missionId: 'lighthouse',
  },
  'lighthouse-unconfirmed-seal': {
    id: 'lighthouse-unconfirmed-seal',
    label: '尚未确认的萤火印章',
    detail: '过早回信后，灯在游行前又暗了一次；它提醒 Pi 事情要在真正的时刻再确认。',
    missionId: 'lighthouse',
  },
  'old-lane-sign': {
    id: 'old-lane-sign',
    label: '海风巷旧路牌',
    detail: '旧路名没有错，只是城市已经把它改叫潮汐街。',
    missionId: 'parcel',
  },
  'postal-half-receipt': {
    id: 'postal-half-receipt',
    label: '只对上一半的投递回执',
    detail: '先去邮局并不算白跑：Pi 看见只有旧地址或新门牌都还不够。',
    missionId: 'parcel',
  },
  'wind-bell-fragment': {
    id: 'wind-bell-fragment',
    label: '不随风断拍的小铃片',
    detail: '不同风向下，喷泉还是在第七拍停住；Pi 因此排除了“是风”的解释。',
    missionId: 'fountain',
  },
  'melody-after-page': {
    id: 'melody-after-page',
    label: '完整回应节拍的小纸页',
    detail: '乐手后来把缺失的回应节拍补在纸页背面，留给城市继续唱下去。',
    missionId: 'fountain',
  },
};

export interface CityCampaignState {
  source: 'tutorial';
  activeMission: CityMissionId | null;
  completedMissions: CityMissionId[];
  discoveries: CityDiscoveryId[];
}

export type CityCampaignAction =
  | { type: 'BEGIN_MISSION'; missionId: CityMissionId }
  | { type: 'COMPLETE_MISSION'; missionId: CityMissionId }
  | { type: 'ADD_DISCOVERY'; discoveryId: CityDiscoveryId }
  | { type: 'RETURN_TO_HARBOR' }
  | { type: 'RESET_CITY' };

export function createCityCampaign(): CityCampaignState {
  return { source: 'tutorial', activeMission: null, completedMissions: [], discoveries: [] };
}

export function isMissionUnlocked(state: CityCampaignState, missionId: CityMissionId): boolean {
  const gate = CITY_MISSIONS[missionId].availableAfter;
  return gate === null || state.completedMissions.includes(gate);
}

export function cityTrust(state: CityCampaignState): number {
  return state.completedMissions.length;
}

export function reduceCityCampaign(state: CityCampaignState, action: CityCampaignAction): CityCampaignState {
  if (action.type === 'RESET_CITY') return createCityCampaign();
  if (action.type === 'RETURN_TO_HARBOR') return { ...state, activeMission: null };
  if (action.type === 'BEGIN_MISSION') {
    return isMissionUnlocked(state, action.missionId)
      ? { ...state, activeMission: action.missionId }
      : state;
  }
  if (action.type === 'COMPLETE_MISSION') {
    if (state.completedMissions.includes(action.missionId)) return { ...state, activeMission: null };
    return {
      ...state,
      activeMission: null,
      completedMissions: [...state.completedMissions, action.missionId],
    };
  }
  if (action.type === 'ADD_DISCOVERY') {
    if (state.discoveries.includes(action.discoveryId)) return state;
    return { ...state, discoveries: [...state.discoveries, action.discoveryId] };
  }
  return state;
}
