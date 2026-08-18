import type { CityDiscoveryId, CityMissionId } from './city-campaign';

export type ChapterMissionId = Exclude<CityMissionId, 'fountain'>;
export type CityMissionPhase = 'arrival' | 'first-look' | 'choose-question' | 'plan' | 'expedition' | 'return' | 'complete';
export type CityMissionReturnKind = 'fact' | 'detour' | 'confirmed' | 'reply';

export interface CityMissionFact {
  id: string;
  label: string;
  detail: string;
}

export interface CityMissionQuestion {
  id: string;
  destination: string;
  observation: string;
  plan: string;
}

export interface CityMissionReturn {
  kind: CityMissionReturnKind;
  title: string;
  body: string;
  fact?: CityMissionFact;
  discovery?: CityDiscoveryId;
}

export interface CityMissionState {
  missionId: ChapterMissionId;
  source: 'tutorial';
  phase: CityMissionPhase;
  facts: string[];
  factCards: CityMissionFact[];
  questionsAsked: string[];
  pendingQuestion?: string;
  lastReturn?: CityMissionReturn;
  completed: boolean;
}

export type CityMissionAction =
  | { type: 'BEGIN' }
  | { type: 'COMPLETE_FIRST_LOOK' }
  | { type: 'SELECT_QUESTION'; questionId: string }
  | { type: 'CONFIRM_PLAN' }
  | { type: 'COMPLETE_EXPEDITION' }
  | { type: 'ACKNOWLEDGE_RETURN' }
  | { type: 'RESTART' };

type MissionDefinition = {
  title: string;
  resident: string;
  opening: string;
  firstLook: CityMissionReturn;
  questions: Record<string, CityMissionQuestion>;
  available: (state: CityMissionState) => string[];
  resolve: (state: CityMissionState, questionId: string) => CityMissionReturn;
  nextPhase: (state: CityMissionState) => CityMissionPhase;
};

const has = (state: CityMissionState, fact: string) => state.facts.includes(fact);

const LIGHTHOUSE: MissionDefinition = {
  title: '灯塔还亮着吗？',
  resident: '露露 · 灯塔守望人',
  opening: '游行开始时，灯塔还能不能一直亮着？',
  firstLook: {
    kind: 'fact',
    title: '灯塔比平常早暗了一点',
    body: 'Pi 先看见灯塔的定时齿轮在游行前就停住了。现在还不知道该修什么，也不知道修好后会不会一直亮。',
    fact: { id: 'light-early', label: '灯塔提早熄灭', detail: 'Pi 在游行前看见灯光比平常早暗下去。' },
  },
  questions: {
    overlook: { id: 'overlook', destination: '灯塔观察台', observation: '齿轮停下时，塔顶的光也跟着变暗。', plan: '我去看看定时齿轮到底在哪里停住。' },
    library: { id: 'library', destination: '旧日图书馆', observation: '露露的旧画里，灯塔旁还有一条小小的游行路线。', plan: '我去问问露露以前怎么守着这盏灯。' },
    workshop: { id: 'workshop', destination: '铜工工具坊', observation: '只有知道齿轮哪里停住，工具坊才知道要调哪一枚。', plan: '我带着齿轮的观察去请工具坊调校。' },
    garden: { id: 'garden', destination: '暮色花园', observation: '真正的游行时刻还没到；要等暮色落下来才能确认。', plan: '我想等灯塔经历一次傍晚，再回来告诉露露。' },
    reply: { id: 'reply', destination: '露露的回信码头', observation: '如果现在就回信，我们还没有看见灯在游行时会不会再暗。', plan: '我先把现在知道的告诉露露。' },
  },
  available(state) {
    if (has(state, 'light-confirmed')) return ['reply', ...(!state.questionsAsked.includes('library') ? ['library'] : [])];
    const next = ['overlook', 'library', 'reply'].filter((id) => !state.questionsAsked.includes(id));
    if (has(state, 'gear-stopped')) next.push('workshop');
    if (has(state, 'gear-adjusted')) next.push('garden');
    return [...new Set(next)];
  },
  resolve(state, questionId) {
    if (questionId === 'overlook') return {
      kind: 'fact', title: '定时齿轮过早停下', body: 'Pi 找到一枚比正常时刻早停住的齿轮。现在工具坊终于知道该调哪里。', fact: { id: 'gear-stopped', label: '定时齿轮过早停下', detail: '它解释了灯为什么提前变暗，但还没有证明调校能撑过游行。' },
    };
    if (questionId === 'library') return {
      kind: 'fact', title: '露露小时候画的灯塔', body: '这张小画不直接修灯，却让 Pi 知道露露为什么每年游行前都会紧张。', discovery: 'lighthouse-childhood-sketch', fact: { id: 'lighthouse-sketch', label: '露露小时候画的灯塔', detail: '一件可选发现；它让居民的心愿有了自己的来处。' },
    };
    if (questionId === 'workshop' && has(state, 'gear-stopped')) return {
      kind: 'fact', title: '齿轮已经调校', body: '工具坊把齿轮调回正确节拍。不过，做过不等于真的办好了。', fact: { id: 'gear-adjusted', label: '铜色调校回执', detail: 'Pi 已经动手，但还没有在游行时刻确认灯是否一直亮着。' },
    };
    if (questionId === 'garden' && has(state, 'gear-adjusted')) return {
      kind: 'confirmed', title: '灯塔撑过了傍晚', body: '暮色落下，灯塔没有再暗。Pi 现在可以放心回信。', fact: { id: 'light-confirmed', label: '萤火确认印章', detail: '只有真正等到傍晚，Pi 才知道调校确实办好了。' },
    };
    if (questionId === 'reply' && has(state, 'light-confirmed')) return {
      kind: 'reply', title: '露露收到了放心的回信', body: '灯塔亮着，游行可以出发了。露露把那张小画挂在入口。', fact: { id: 'reply-sent', label: '露露的纸船回信', detail: '这件心愿被真正办好了。' },
    };
    return {
      kind: 'detour', title: '还没到能放心回信的时候', body: '露露刚要出发，灯又闪了一下。Pi 带回一枚“尚未确认”的萤火印章：不是做错了，只是还需要在真正的时刻看看。', discovery: 'lighthouse-unconfirmed-seal', fact: { id: 'needs-confirmation', label: '尚未确认的萤火印章', detail: '一次温和绕路：它让“确认”有了世界内的原因。' },
    };
  },
  nextPhase(state) {
    return has(state, 'reply-sent') ? 'complete' : 'choose-question';
  },
};

const PARCEL: MissionDefinition = {
  title: '迷路的邮包',
  resident: '阿岚 · 邮差',
  opening: '这封生日信该送到哪一扇红门？',
  firstLook: {
    kind: 'fact', title: '信上只写着“红门旁的阿岚”', body: 'Pi 听清了心愿，却发现这座城里不只一扇红门。过去的地址和现在的门牌，可能都值得看看。', fact: { id: 'red-door-clue', label: '红门旁的阿岚', detail: '一张还不够具体的生日信封。' },
  },
  questions: {
    library: { id: 'library', destination: '旧日图书馆', observation: '馆藏的旧地图还写着“海风巷”。', plan: '我去找找这封信以前可能写的是哪一条街。' },
    overlook: { id: 'overlook', destination: '新门牌观察台', observation: '港口那边的蓝牌写着“潮汐街”。', plan: '我去看看现在的门牌和旧地图有没有不同。' },
    post: { id: 'post', destination: '邮局红门', observation: '一封信必须同时对上人和地点，才不会又送错。', plan: '我去邮局试着把这封信送出去。' },
  },
  available(state) {
    if (has(state, 'delivered')) return [];
    if (has(state, 'old-address') && has(state, 'new-street')) return ['post'];
    return ['library', 'overlook', 'post'].filter((id) => !state.questionsAsked.includes(id));
  },
  resolve(state, questionId) {
    if (questionId === 'library') return {
      kind: 'fact', title: '旧地址：海风巷 9 号', body: 'Pi 找到旧地址；它很有用，但城市可能已经改过路名。', fact: { id: 'old-address', label: '旧地址：海风巷 9 号', detail: '过去的记忆给了 Pi 一条线索。' },
    };
    if (questionId === 'overlook') return {
      kind: 'fact', title: '新门牌：潮汐街', body: 'Pi 看见海风巷已经改叫潮汐街。现在的问题是：它们是不是同一处？', fact: { id: 'new-street', label: '新门牌：潮汐街', detail: '眼前的观察提示旧信息需要再对照。' },
    };
    if (questionId === 'post' && has(state, 'old-address') && has(state, 'new-street')) return {
      kind: 'reply', title: '生日信送到了真正的红门', body: 'Pi 把旧巷名和新门牌放在一起，才找到阿岚。邮局挂起一块新路牌。', fact: { id: 'delivered', label: '阿岚的生日纸船', detail: '过去与现在放在一起，才让这封信可靠送达。' },
    };
    return {
      kind: 'detour', title: '只对上了一半', body: '邮局没有把信退回来，而是给 Pi 一张半成功回执：只靠旧地址或新门牌，还不能确定收件人。', discovery: 'postal-half-receipt', fact: { id: 'half-matched', label: '只对上一半的投递回执', detail: '一次温和绕路，让 Pi 看见需要把过去和现在同时带回来。' },
    };
  },
  nextPhase(state) {
    return has(state, 'delivered') ? 'complete' : 'choose-question';
  },
};

const DEFINITIONS: Record<ChapterMissionId, MissionDefinition> = { lighthouse: LIGHTHOUSE, parcel: PARCEL };

export function createCityMission(missionId: ChapterMissionId): CityMissionState {
  return { missionId, source: 'tutorial', phase: 'arrival', facts: [], factCards: [], questionsAsked: [], completed: false };
}

export function cityMissionDefinition(missionId: ChapterMissionId): MissionDefinition {
  return DEFINITIONS[missionId];
}

export function availableCityMissionQuestions(state: CityMissionState): CityMissionQuestion[] {
  const definition = DEFINITIONS[state.missionId];
  return state.phase === 'choose-question'
    ? definition.available(state).map((id) => definition.questions[id]).filter(Boolean)
    : [];
}

function addFact(state: CityMissionState, fact?: CityMissionFact): CityMissionState {
  if (!fact || state.facts.includes(fact.id)) return state;
  return { ...state, facts: [...state.facts, fact.id], factCards: [...state.factCards, fact] };
}

export function cityMissionFactDetails(state: CityMissionState): CityMissionFact[] {
  return state.factCards;
}

export function reduceCityMission(state: CityMissionState, action: CityMissionAction): CityMissionState {
  const definition = DEFINITIONS[state.missionId];
  if (action.type === 'RESTART') return createCityMission(state.missionId);
  if (action.type === 'BEGIN') return state.phase === 'arrival' ? { ...state, phase: 'first-look' } : state;
  if (action.type === 'COMPLETE_FIRST_LOOK') {
    if (state.phase !== 'first-look') return state;
    return { ...addFact(state, definition.firstLook.fact), phase: 'choose-question', lastReturn: definition.firstLook };
  }
  if (action.type === 'SELECT_QUESTION') {
    if (state.phase !== 'choose-question' || !definition.available(state).includes(action.questionId)) return state;
    return { ...state, phase: 'plan', pendingQuestion: action.questionId, lastReturn: undefined };
  }
  if (action.type === 'CONFIRM_PLAN') return state.phase === 'plan' ? { ...state, phase: 'expedition' } : state;
  if (action.type === 'COMPLETE_EXPEDITION') {
    if (state.phase !== 'expedition' || !state.pendingQuestion) return state;
    const result = definition.resolve(state, state.pendingQuestion);
    const withFact = addFact(state, result.fact);
    return { ...withFact, phase: 'return', pendingQuestion: state.pendingQuestion, questionsAsked: [...state.questionsAsked, state.pendingQuestion], lastReturn: result };
  }
  if (action.type === 'ACKNOWLEDGE_RETURN') {
    if (state.phase !== 'return') return state;
    const next = definition.nextPhase(state);
    return { ...state, phase: next, pendingQuestion: undefined, completed: next === 'complete' };
  }
  return state;
}
