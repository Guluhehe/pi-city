export type FountainFactId =
  | 'pressure-drop'
  | 'melody-page'
  | 'pressure-pattern'
  | 'wind-refuted'
  | 'sync-valve'
  | 'stable-water'
  | 'full-song';

export type FountainQuestionId = 'melody' | 'water' | 'wind' | 'full-song' | 'stable-water';

export type FountainPhase =
  | 'arrival'
  | 'first-look'
  | 'choose-question'
  | 'plan'
  | 'expedition'
  | 'return'
  | 'action'
  | 'complete';

export type FountainReturnKind = 'answered' | 'refuted' | 'refined' | 'confirmed';

export interface FountainFact {
  id: FountainFactId;
  label: string;
  detail: string;
}

export interface FountainQuestion {
  id: FountainQuestionId;
  prompt: string;
  source: string;
  plan: string;
  destination: string;
}

export interface FountainReturn {
  kind: FountainReturnKind;
  title: string;
  body: string;
  fact?: FountainFact;
}

export interface FountainSessionState {
  scenarioId: 'fountain-d-greybox';
  source: 'tutorial';
  phase: FountainPhase;
  facts: FountainFactId[];
  pendingQuestion?: FountainQuestionId;
  lastReturn?: FountainReturn;
  questionsAsked: FountainQuestionId[];
  completed: boolean;
}

export type FountainSessionAction =
  | { type: 'BEGIN' }
  | { type: 'COMPLETE_FIRST_LOOK' }
  | { type: 'SELECT_QUESTION'; questionId: FountainQuestionId }
  | { type: 'CONFIRM_PLAN' }
  | { type: 'COMPLETE_EXPEDITION' }
  | { type: 'ACKNOWLEDGE_RETURN' }
  | { type: 'PERFORM_SYNC_ACTION' }
  | { type: 'RESTART' };

const FACTS: Record<FountainFactId, FountainFact> = {
  'pressure-drop': {
    id: 'pressure-drop',
    label: '第七拍，水压下降',
    detail: 'Pi 第一次听见喷泉在第七拍停住时带回的观察。',
  },
  'melody-page': {
    id: 'melody-page',
    label: '第七拍缺少回应节拍',
    detail: '码头乐手记得第七拍后本来还有一段回应。',
  },
  'pressure-pattern': {
    id: 'pressure-pattern',
    label: '水压总是跟着缺拍出现',
    detail: 'Pi 对照多次后发现水压下降不是随意发生的。',
  },
  'wind-refuted': {
    id: 'wind-refuted',
    label: '不是风',
    detail: '不同风向下，喷泉仍然恰好在第七拍停住。',
  },
  'sync-valve': {
    id: 'sync-valve',
    label: '同步阀已经装好',
    detail: 'Pi 让水压与第七拍回应同步的行动结果。',
  },
  'stable-water': {
    id: 'stable-water',
    label: '水流一直稳定',
    detail: '同步阀让水流稳定，但还没有证明整首歌能唱完。',
  },
  'full-song': {
    id: 'full-song',
    label: '已经唱完一整首',
    detail: '晚风里的试演确认喷泉没有再在第七拍停住。',
  },
};

export const FOUNTAIN_QUESTIONS: Record<FountainQuestionId, FountainQuestion> = {
  melody: {
    id: 'melody',
    prompt: '是不是还缺旋律的信息？',
    source: '来自：第七拍，水压下降',
    plan: '我去问问码头乐手。',
    destination: '码头乐手',
  },
  water: {
    id: 'water',
    prompt: '水压下降是原因，还是碰巧一起发生？',
    source: '来自：第七拍，水压下降',
    plan: '我回去对着节拍再听一次。',
    destination: '喷泉观察台',
  },
  wind: {
    id: 'wind',
    prompt: '风会不会吹断了声音？',
    source: '来自：第七拍，水压下降',
    plan: '我去港口看看风铃和水面。',
    destination: '港口风铃',
  },
  'full-song': {
    id: 'full-song',
    prompt: '让它在晚风里唱完一整首。',
    source: '来自：同步阀已经装好',
    plan: '我想等晚风来试一试。',
    destination: '试演花园',
  },
  'stable-water': {
    id: 'stable-water',
    prompt: '看看水流是不是一直稳定。',
    source: '来自：同步阀已经装好',
    plan: '我先去看看水流稳不稳。',
    destination: '工具坊水槽',
  },
};

export function createFountainSession(): FountainSessionState {
  return {
    scenarioId: 'fountain-d-greybox',
    source: 'tutorial',
    phase: 'arrival',
    facts: [],
    questionsAsked: [],
    completed: false,
  };
}

function includes(state: FountainSessionState, fact: FountainFactId): boolean {
  return state.facts.includes(fact);
}

function addFact(state: FountainSessionState, fact: FountainFactId): FountainSessionState {
  return includes(state, fact) ? state : { ...state, facts: [...state.facts, fact] };
}

function canAsk(state: FountainSessionState, questionId: FountainQuestionId): boolean {
  if (state.questionsAsked.includes(questionId)) return false;
  if (!includes(state, 'pressure-drop')) return false;
  if (includes(state, 'sync-valve')) {
    if (questionId === 'full-song') return true;
    return questionId === 'stable-water' && !includes(state, 'stable-water');
  }
  if (questionId === 'full-song' || questionId === 'stable-water') return false;
  if (questionId === 'melody') return !includes(state, 'melody-page');
  if (questionId === 'water') return !includes(state, 'pressure-pattern');
  return questionId === 'wind' && !includes(state, 'wind-refuted');
}

export function availableFountainQuestions(state: FountainSessionState): FountainQuestion[] {
  const candidateIds: FountainQuestionId[] = includes(state, 'sync-valve')
    ? ['full-song', 'stable-water']
    : ['melody', 'water', 'wind'];
  return candidateIds.filter((id) => canAsk(state, id)).map((id) => FOUNTAIN_QUESTIONS[id]);
}

function resolveQuestion(questionId: FountainQuestionId): FountainReturn {
  if (questionId === 'melody') {
    return {
      kind: 'answered',
      title: '第七拍缺少回应节拍',
      body: '原来歌里还少了一小段。不过，我们还不知道水为什么会跟着低下来。',
      fact: FACTS['melody-page'],
    };
  }
  if (questionId === 'water') {
    return {
      kind: 'refined',
      title: '水压总是跟着缺拍出现',
      body: '水压不是随便变的。可我们还不知道第七拍到底少了什么。',
      fact: FACTS['pressure-pattern'],
    };
  }
  if (questionId === 'wind') {
    return {
      kind: 'refuted',
      title: '不是风',
      body: '风有时大，有时小；喷泉却总在第七拍停住。现在我们知道该把注意力放回喷泉和那首歌上。',
      fact: FACTS['wind-refuted'],
    };
  }
  if (questionId === 'stable-water') {
    return {
      kind: 'answered',
      title: '水流一直稳定',
      body: '水没有问题了。可我们还没听见它唱完整首歌。',
      fact: FACTS['stable-water'],
    };
  }
  return {
    kind: 'confirmed',
    title: '已经唱完一整首',
    body: '晚风里的试演结束了。喷泉没有再在第七拍停住。',
    fact: FACTS['full-song'],
  };
}

export function factDetails(state: FountainSessionState): FountainFact[] {
  return state.facts.map((id) => FACTS[id]);
}

export function reduceFountainSession(
  state: FountainSessionState,
  action: FountainSessionAction,
): FountainSessionState {
  if (action.type === 'RESTART') return createFountainSession();

  if (action.type === 'BEGIN') {
    return state.phase === 'arrival' ? { ...state, phase: 'first-look' } : state;
  }

  if (action.type === 'COMPLETE_FIRST_LOOK') {
    if (state.phase !== 'first-look') return state;
    return {
      ...addFact(state, 'pressure-drop'),
      phase: 'choose-question',
      lastReturn: {
        kind: 'answered',
        title: 'Pi 的第一次初看',
        body: '到第七拍时，水柱忽然低了一点，歌也停住了。现在我们知道了一点点。',
        fact: FACTS['pressure-drop'],
      },
    };
  }

  if (action.type === 'SELECT_QUESTION') {
    if (state.phase !== 'choose-question' || !canAsk(state, action.questionId)) return state;
    return {
      ...state,
      phase: 'plan',
      pendingQuestion: action.questionId,
      lastReturn: undefined,
    };
  }

  if (action.type === 'CONFIRM_PLAN') {
    return state.phase === 'plan' && state.pendingQuestion
      ? { ...state, phase: 'expedition' }
      : state;
  }

  if (action.type === 'COMPLETE_EXPEDITION') {
    if (state.phase !== 'expedition' || !state.pendingQuestion) return state;
    const result = resolveQuestion(state.pendingQuestion);
    const withFact = result.fact ? addFact(state, result.fact.id) : state;
    return {
      ...withFact,
      phase: 'return',
      pendingQuestion: state.pendingQuestion,
      questionsAsked: [...state.questionsAsked, state.pendingQuestion],
      lastReturn: result,
    };
  }

  if (action.type === 'ACKNOWLEDGE_RETURN') {
    if (state.phase !== 'return') return state;
    if (includes(state, 'full-song')) {
      return { ...state, phase: 'complete', completed: true, pendingQuestion: undefined };
    }
    if (includes(state, 'melody-page') && includes(state, 'pressure-pattern') && !includes(state, 'sync-valve')) {
      return { ...state, phase: 'action', pendingQuestion: undefined };
    }
    return { ...state, phase: 'choose-question', pendingQuestion: undefined };
  }

  if (action.type === 'PERFORM_SYNC_ACTION') {
    if (state.phase !== 'action') return state;
    return {
      ...addFact(state, 'sync-valve'),
      phase: 'choose-question',
      pendingQuestion: undefined,
      lastReturn: {
        kind: 'answered',
        title: '同步阀已经装好',
        body: 'Pi 让水压与第七拍回应同步了。不过，我们怎样才算真的办好了？',
        fact: FACTS['sync-valve'],
      },
    };
  }

  return state;
}

export function fountainProgressLabel(state: FountainSessionState): string {
  if (state.phase === 'arrival') return '码头委托';
  if (state.phase === 'first-look') return 'Pi 正在初看';
  if (state.phase === 'choose-question') return includes(state, 'sync-valve') ? '定义完成条件' : '提出未知问题';
  if (state.phase === 'plan') return 'Pi 正在计划';
  if (state.phase === 'expedition') return 'Pi 正在调查';
  if (state.phase === 'return') return '新发现回到思考塔';
  if (state.phase === 'action') return 'Pi 已经有了新计划';
  return '喷泉唱完了';
}
