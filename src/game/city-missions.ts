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

type SequentialMissionConfig = {
  id: ChapterMissionId;
  title: string;
  resident: string;
  opening: string;
  firstLook: CityMissionFact;
  first: CityMissionQuestion & { fact: CityMissionFact };
  second: CityMissionQuestion & { fact: CityMissionFact };
  reply: CityMissionQuestion & { fact: CityMissionFact; body: string };
  optional: CityMissionQuestion & { fact: CityMissionFact; discovery: CityDiscoveryId };
  detour: CityMissionQuestion & { fact: CityMissionFact; discovery: CityDiscoveryId; body: string };
};

function makeSequentialMission(config: SequentialMissionConfig): MissionDefinition {
  const questions: Record<string, CityMissionQuestion> = {
    [config.first.id]: config.first, [config.second.id]: config.second, [config.reply.id]: config.reply,
    [config.optional.id]: config.optional, [config.detour.id]: config.detour,
  };
  return {
    title: config.title,
    resident: config.resident,
    opening: config.opening,
    firstLook: { kind: 'fact', title: config.firstLook.label, body: config.firstLook.detail, fact: config.firstLook },
    questions,
    available(state) {
      if (has(state, config.reply.fact.id)) return [];
      if (has(state, config.second.fact.id)) return [config.reply.id, ...(!state.questionsAsked.includes(config.optional.id) ? [config.optional.id] : [])];
      if (has(state, config.first.fact.id)) return [config.second.id, ...(!state.questionsAsked.includes(config.optional.id) ? [config.optional.id] : [])];
      return [config.first.id, ...(!state.questionsAsked.includes(config.optional.id) ? [config.optional.id] : []), ...(!state.questionsAsked.includes(config.detour.id) ? [config.detour.id] : [])];
    },
    resolve(state, questionId) {
      if (questionId === config.first.id) return { kind: 'fact', title: config.first.fact.label, body: config.first.plan, fact: config.first.fact };
      if (questionId === config.second.id && has(state, config.first.fact.id)) return { kind: 'fact', title: config.second.fact.label, body: config.second.plan, fact: config.second.fact };
      if (questionId === config.optional.id) return { kind: 'fact', title: config.optional.fact.label, body: config.optional.plan, fact: config.optional.fact, discovery: config.optional.discovery };
      if (questionId === config.reply.id && has(state, config.second.fact.id)) return { kind: 'reply', title: config.reply.fact.label, body: config.reply.body, fact: config.reply.fact };
      return { kind: 'detour', title: config.detour.fact.label, body: config.detour.body, fact: config.detour.fact, discovery: config.detour.discovery };
    },
    nextPhase(state) { return has(state, config.reply.fact.id) ? 'complete' : 'choose-question'; },
  };
}

const SEQUENTIAL_MISSIONS: Record<Exclude<ChapterMissionId, 'lighthouse' | 'parcel'>, MissionDefinition> = {
  kite: makeSequentialMission({
    id: 'kite', title: '找不到家的小风筝', resident: '小米 · 风筝主人', opening: '它只记得落在“有红门的地方”。',
    firstLook: { id: 'kite-red-door', label: '一段关于红门的记忆', detail: '小米记得风筝曾飞过红门，却不知道风后来往哪里去了。' },
    first: { id: 'kite-library', destination: '旧日图书馆', observation: '旧日图书馆收着屋顶间的风向札记。', plan: '我先把旧日风向带回来看看。', fact: { id: 'kite-old-wind', label: '屋顶风向札记', detail: '过去的记忆给了 Pi 一条方向，但不是答案。' } },
    second: { id: 'kite-overlook', destination: '高处观察台', observation: '最高的屋顶上有一小段新鲜的风筝线。', plan: '我去看看风筝现在有没有留下新的线。', fact: { id: 'kite-new-string', label: '新鲜的风筝线', detail: '眼前的线索让 Pi 改往真正的屋顶去。' } },
    reply: { id: 'kite-reply', destination: '屋顶红门', observation: '旧记忆和新风筝线终于指向同一扇门。', plan: '我带着这两件东西把风筝送回去。', fact: { id: 'kite-home', label: '风筝回到小米手里', detail: '记忆与新观察放在一起，才让 Pi 找到现在的答案。' }, body: '小米把风筝绳系在屋顶之间，大家有了一条可以走的小路。' },
    optional: { id: 'kite-tail', destination: '风铃小巷', observation: '风铃旁卡着一张褪色的小便签。', plan: '我顺路把便签带回来。', fact: { id: 'kite-tail-note', label: '风筝尾巴上的旧便签', detail: '它记得曾经的红门，却没有告诉 Pi 风筝现在在哪里。' }, discovery: 'kite-tail-note' },
    detour: { id: 'kite-quick', destination: '第一扇红门', observation: '只凭“红门”就去，城里可能有不止一个。', plan: '我先去最近的红门问问。', fact: { id: 'kite-wrong-door', label: '第一扇红门的小纸旗', detail: '一段没有白走的绕路。' }, discovery: 'kite-tail-note', body: '门后没有风筝，邻居递给 Pi 一张小纸旗：记忆值得带着，但也得看看现在。' },
  }),
  keys: makeSequentialMission({
    id: 'keys', title: '两把钥匙', resident: '椿 · 图书管理员', opening: '两把钥匙都像对的，哪一把能打开档案小门？',
    firstLook: { id: 'keys-two', label: '两把看似正确的钥匙', detail: 'Pi 发现它们的齿纹很像，却不该只凭第一眼挑一把。' },
    first: { id: 'keys-try', destination: '档案小门', observation: '第一把钥匙在锁里留下细小划痕。', plan: '我去看看第一把钥匙究竟碰到了哪里。', fact: { id: 'keys-rubbing', label: '门锁拓印', detail: '新痕迹让 Pi 不再只相信最像的钥匙。' } },
    second: { id: 'keys-workshop', destination: '铜工工具坊', observation: '拓印显示另一把钥匙的齿纹少了一道弯。', plan: '我带拓印去请工具坊比一比两把钥匙。', fact: { id: 'keys-second', label: '第二把钥匙的弯齿', detail: '证据改变了 Pi 最初的选择。' } },
    reply: { id: 'keys-reply', destination: '档案小门', observation: '现在可以带着新判断回到小门。', plan: '我去打开那扇一直锁着的小门。', fact: { id: 'keys-open', label: '档案小门打开了', detail: 'Pi 放下第一种猜法后，找到了真正能开的钥匙。' }, body: '椿把一盏小灯放进门里，档案馆多了一个能被探索的角落。' },
    optional: { id: 'keys-note', destination: '旧日图书馆', observation: '钥匙盒背面夹着一张孩子的借书单。', plan: '我把借书单也带回来。', fact: { id: 'keyhole-rubbing', label: '门锁拓印纸', detail: '第一把钥匙留下的轻微划痕，让第二次观察有了意义。' }, discovery: 'keyhole-rubbing' },
    detour: { id: 'keys-quick', destination: '最近的锁孔', observation: '看起来最亮的钥匙不一定就是对的。', plan: '我先用最亮的一把试试。', fact: { id: 'keys-first-guess', label: '没打开的钥匙扣', detail: '一条把猜想变成新证据的绕路。' }, discovery: 'keyhole-rubbing', body: '门没有开，但锁留下的划痕让 Pi 获得了真正可用的新线索。' },
  }),
  cinema: makeSequentialMission({
    id: 'cinema', title: '雨天的露天电影', resident: '茉莉 · 放映员', opening: '电影快开场了，天上却要下雨。',
    firstLook: { id: 'cinema-cloud', label: '正靠近的雨云', detail: 'Pi 的小包这次只够装两件有用东西，不能把每一样都带走。' },
    first: { id: 'cinema-sky', destination: '高处观察台', observation: '雨云照片能告诉 Pi 雨什么时候到。', plan: '我把眼前的雨云拍下来。', fact: { id: 'cinema-rain-photo', label: '雨云照片', detail: '一件现在的观察。小包还剩一格。' } },
    second: { id: 'cinema-library', destination: '旧日图书馆', observation: '旧天气册记着这片云常在几时散开。', plan: '我带一页旧天气册回来，和照片放在一起。', fact: { id: 'cinema-weather-book', label: '旧天气册的一页', detail: '过去的天气与眼前的云刚好拼成一条判断。' } },
    reply: { id: 'cinema-reply', destination: '露天银幕', observation: 'Pi 的两格小包已经装着现在和过去。', plan: '我去告诉茉莉什么时候支起雨棚。', fact: { id: 'cinema-ready', label: '雨棚下的第一张电影票', detail: 'Pi 选择了此刻真正需要的两件发现。' }, body: '雨落下来时，电影已经在雨棚下亮起。' },
    optional: { id: 'cinema-umbrella', destination: '回信码头', observation: '借伞回执也很温暖，但小包这趟没有更多位置。', plan: '我把借伞回执放在码头，留给下一次。', fact: { id: 'rain-ticket', label: '雨天电影票根', detail: '少带一件东西也不算失败；它留下一张下次可以再看的票根。' }, discovery: 'rain-ticket' },
    detour: { id: 'cinema-quick', destination: '露天银幕', observation: '如果现在就开场，Pi 还不知道雨什么时候来。', plan: '我先去银幕旁看看。', fact: { id: 'cinema-wet-seat', label: '被雨打湿的座位牌', detail: '一次不扣分的提醒。' }, discovery: 'rain-ticket', body: '茉莉收起一张座位牌：不是不能开场，只是 Pi 还缺能决定时刻的东西。' },
  }),
  seed: makeSequentialMission({
    id: 'seed', title: '花园里醒不过来的种子', resident: '朵朵 · 园丁', opening: '庆典前，夜花能醒过来吗？',
    firstLook: { id: 'seed-sleep', label: '还在沉睡的夜花种子', detail: '花园的光不够暖，但 Pi 还不知道要调哪里。' },
    first: { id: 'seed-look', destination: '暮色花园', observation: '同一片种子在不同灯下有不同的影子。', plan: '我先看看夜花真正缺的是什么。', fact: { id: 'seed-light', label: '夜花的光线卡', detail: 'Pi 看见了种子对温度的细小反应。' } },
    second: { id: 'seed-tool', destination: '铜工工具坊', observation: '知道缺什么后，工具坊才知道要调哪盏灯。', plan: '我带着光线卡去调温。', fact: { id: 'seed-warmth', label: '温灯调校回执', detail: '工具已经做过一件事，但花是否真的会开还不知道。' } },
    reply: { id: 'seed-confirm', destination: '暮色花园', observation: '要亲眼看见花开，才能把好消息告诉朵朵。', plan: '我回到花园等夜花醒来。', fact: { id: 'seed-bloom', label: '第一朵夜花', detail: '行动结果被看见，才算真正回来。' }, body: '夜花在庆典前亮起来，花园多了一片会呼吸的光。' },
    optional: { id: 'seed-shell', destination: '旧日图书馆', observation: '旧园丁笔记夹着一枚半透明的种壳。', plan: '我把种壳带回来。', fact: { id: 'night-seed-shell', label: '夜花的种壳', detail: '工具坊做过的事，只有在花园里看见花开才算真的回来了。' }, discovery: 'night-seed-shell' },
    detour: { id: 'seed-quick', destination: '回信码头', observation: '现在回信，花还没有醒。', plan: '我先去告诉朵朵已经调好了灯。', fact: { id: 'seed-early-note', label: '还在等待的花瓣', detail: '一段需要确认的绕路。' }, discovery: 'night-seed-shell', body: '朵朵没有失望，只把一片还没张开的花瓣交给 Pi：等看见它开再回来。' },
  }),
  card: makeSequentialMission({
    id: 'card', title: '一张没有署名的感谢卡', resident: '米洛 · 咖啡师', opening: '两位居民都以为卡片写给自己。',
    firstLook: { id: 'card-no-name', label: '没有署名的感谢卡', detail: '第一眼的地点线索指向咖啡店，笔迹却像从别处来的。' },
    first: { id: 'card-photo', destination: '旧日图书馆', observation: '旧照片里有同样的蓝色笔迹。', plan: '我先找找这笔字以前出现在哪里。', fact: { id: 'card-old-hand', label: '旧照片上的蓝墨', detail: '过去的笔迹带来了一条看似可信的路线。' } },
    second: { id: 'card-look', destination: '新门牌观察台', observation: '卡片角落的新印章来自另一条街。', plan: '我去看看眼前的新印章到底通向哪里。', fact: { id: 'card-new-stamp', label: '刚盖上的街区印章', detail: '新发现让 Pi 改写原本的送信路线。' } },
    reply: { id: 'card-reply', destination: '邮局红门', observation: '旧笔迹和新印章指向了真正的收卡人。', plan: '我把卡送到新的那条路去。', fact: { id: 'card-delivered', label: '卡片展的第一张感谢卡', detail: 'Pi 没有照第一眼的线索行动，而是重新估量了路线。' }, body: '邮局墙上挂起一排“谢谢你”，两位居民都笑着留下了自己的卡。' },
    optional: { id: 'card-stroke', destination: '风铃小巷', observation: '风铃旁晾着一张写字练习。', plan: '我带回那一笔蓝墨。', fact: { id: 'unsigned-stroke', label: '感谢卡上的一笔蓝墨', detail: '一笔新笔迹改变了 Pi 原本打算去的方向。' }, discovery: 'unsigned-stroke' },
    detour: { id: 'card-quick', destination: '第一家咖啡店', observation: '只看地点，卡片可能会送给错误的人。', plan: '我先去最近的咖啡店问问。', fact: { id: 'card-empty-cup', label: '空着的咖啡杯垫', detail: '一趟没有白跑的问路。' }, discovery: 'unsigned-stroke', body: '米洛没有收下卡，他把杯垫翻过来：Pi 还得看看是谁写下这笔字。' },
  }),
  windmill: makeSequentialMission({
    id: 'windmill', title: '风车的秘密时间', resident: '桑 · 面粉师', opening: '风车总会在同一刻停下来。',
    firstLook: { id: 'windmill-stop', label: '同一刻停下的风车', detail: '眼前修好齿轮很快，但 Pi 想知道它为什么总会再停。' },
    first: { id: 'windmill-fast', destination: '铜工工具坊', observation: '工具坊能让当前齿轮马上转起来。', plan: '我先让风车重新动起来。', fact: { id: 'windmill-fast-fix', label: '快修齿轮回执', detail: '现在的问题暂时好了，原因却还在别处。' } },
    second: { id: 'windmill-slow', destination: '高处观察台', observation: '远处的风向每到同一刻就撞向磨盘。', plan: '我去找出它反复停转的真正原因。', fact: { id: 'windmill-cause', label: '固定风向的刻时图', detail: '慢路线让 Pi 看到表面问题背后的原因。' } },
    reply: { id: 'windmill-reply', destination: '风铃小巷', observation: '现在不仅能让它转，也知道怎么不再被同一阵风卡住。', plan: '我带着刻时图回去调整风车。', fact: { id: 'windmill-steady', label: '稳定转动的风车叶', detail: '真正原因被带回来，城市有了可靠的风向提示。' }, body: '风车在晚风里稳定转动，桑把第一袋面粉送给码头。' },
    optional: { id: 'windmill-chip', destination: '旧日图书馆', observation: '旧书里夹着一片刻有时间的木片。', plan: '我把木片带回来。', fact: { id: 'windmill-clock-chip', label: '风车的刻时木片', detail: '快修可以让它现在转起来，木片则让 Pi 看见它为何总会再停。' }, discovery: 'windmill-clock-chip' },
    detour: { id: 'windmill-quick', destination: '回信码头', observation: '只快修后回信，风车明天还会停。', plan: '我先去告诉桑已经修好了。', fact: { id: 'windmill-early-flour', label: '会撒下来的面粉袋', detail: '一段提醒 Pi 继续查的绕路。' }, discovery: 'windmill-clock-chip', body: '一阵同样的风又吹来，面粉袋轻轻摇了一下；Pi 知道还得找真正原因。' },
  }),
  orders: makeSequentialMission({
    id: 'orders', title: '同一晚的两张心愿单', resident: '面包师与港口乐队', opening: '送货路线和演出海报，都在等 Pi。',
    firstLook: { id: 'orders-two', label: '两张同时来到码头的心愿单', detail: 'Pi 不能同时走两条路；先帮谁会让另一边的夜晚稍有不同。' },
    first: { id: 'orders-market', destination: '夜市面包铺', observation: '面包师的车已经在等一条不积水的路。', plan: '我先看看夜市这边缺什么。', fact: { id: 'orders-bread-route', label: '面包车的干燥路线', detail: '一张今晚能用的送货路线。' } },
    second: { id: 'orders-stage', destination: '港口剧场', observation: '乐队的海报少了一枚能被看见的灯。', plan: '我带着路线回来，再看看剧场的海报。', fact: { id: 'orders-stage-light', label: '剧场海报的小灯', detail: '第二件心愿没有消失，只是在城市里安静等 Pi。' } },
    reply: { id: 'orders-reply', destination: '心愿码头', observation: '两边都有了可以开始的一点帮助。', plan: '我把今晚的安排带回给大家。', fact: { id: 'orders-evening', label: '市场与剧场的双面节目单', detail: '先后顺序改变了等待时的城市气氛，但两件事都被照顾到了。' }, body: '夜市先亮起，剧场随后传来试音；码头多了一张双面节目单。' },
    optional: { id: 'orders-wait', destination: '港口剧场', observation: '乐队把一张等候中的海报夹在门边。', plan: '我顺路带回海报。', fact: { id: 'waiting-bread-tag', label: '等候中的面包牌', detail: '先去剧场时，面包师没有生气，只把一张温热的等候牌留在窗口。' }, discovery: 'waiting-bread-tag' },
    detour: { id: 'orders-both', destination: '两条街中间', observation: '想一次把两件都办好，会让 Pi 哪边都没带到东西。', plan: '我先往两条路的中间跑跑看。', fact: { id: 'orders-split-note', label: '被风吹开的两张便签', detail: '一条需要决定先后的绕路。' }, discovery: 'waiting-bread-tag', body: 'Pi 没有失败，只是带回两张被风吹开的便签：先选一边，另一边会等。' },
  }),
  fogbell: makeSequentialMission({
    id: 'fogbell', title: '海雾里的船铃', resident: '船长阿黎', opening: '雾太大了，大家给出的方向却不一样。',
    firstLook: { id: 'fogbell-mist', label: '互相矛盾的雾中方向', detail: '罗盘、铃声和岸灯都在说不同的方向。' },
    first: { id: 'fogbell-compass', destination: '旧日图书馆', observation: '一只旧罗盘还指着看似可信的方向。', plan: '我先看看罗盘留下了什么。', fact: { id: 'fogbell-compass-clue', label: '被海雾打湿的罗盘', detail: '它指向一边，却还不足以让 Pi 假装确定。' } },
    second: { id: 'fogbell-listen', destination: '港口船铃', observation: '另一边传来的铃声节拍和罗盘不同。', plan: '我去听听铃声真正从哪里来。', fact: { id: 'fogbell-sound-clue', label: '雾中的三下船铃', detail: '新观察与旧罗盘不一致，Pi 需要继续校正。' } },
    reply: { id: 'fogbell-reply', destination: '雾灯码头', observation: '两条不一致的线索可以放在一起再查。', plan: '我带着它们去点亮真正的雾灯。', fact: { id: 'fogbell-clear', label: '雾灯下的靠岸旗', detail: 'Pi 没有假装确定，而是继续查到能让船靠岸。' }, body: '雾灯亮起，船铃变得清楚，阿黎把靠岸旗插在码头。' },
    optional: { id: 'fogbell-note', destination: '回信码头', observation: '一张潮汐便签被雾打湿了。', plan: '我把便签也带回来。', fact: { id: 'foggy-compass', label: '被海雾打湿的罗盘', detail: '它指向一个方向，却与码头的铃声不同；Pi 需要再查一遍。' }, discovery: 'foggy-compass' },
    detour: { id: 'fogbell-guess', destination: '错误的泊位', observation: '只信一个方向，会把船带到看不见的地方。', plan: '我先照罗盘走走看。', fact: { id: 'fogbell-empty-post', label: '空着的系船柱', detail: '一条把矛盾变得可见的绕路。' }, discovery: 'foggy-compass', body: '系船柱旁没有船，Pi 带回一个清楚的理由：还得去听另一边的铃声。' },
  }),
  festival: makeSequentialMission({
    id: 'festival', title: '星光节的最后一盏灯', resident: '整座城市', opening: '把大家留下的小光，带到节日的最后一盏灯旁。',
    firstLook: { id: 'festival-last', label: '还没亮起的最后一盏星灯', detail: '它需要的不是一个答案，而是这座城市此前留下的几种小光。' },
    first: { id: 'festival-map', destination: '心愿码头', observation: '码头收着大家办好事情后留下的纸船与印章。', plan: '我先把城市留下的小光带到思考塔。', fact: { id: 'festival-memory', label: '居民留下的三枚小光', detail: '过去办好的事情现在也能帮助新的委托。' } },
    second: { id: 'festival-light', destination: '暮色花园', observation: '花园的夜花能让星灯看见该往哪里聚。', plan: '我去看最后一盏灯缺的方向。', fact: { id: 'festival-direction', label: '夜花指向的星光线', detail: '新的观察让过去的小光有了共同的方向。' } },
    reply: { id: 'festival-reply', destination: '星光广场', observation: '过去与现在的发现终于可以一起点亮最后一盏灯。', plan: '我把星光线带回广场。', fact: { id: 'festival-lit', label: '星光节的最后一盏灯', detail: 'Pi 的记忆、行动、确认和回应连成了城市的一条光。' }, body: '所有街区的灯一盏盏亮起来，星光节和完整信任图一起出现。' },
    optional: { id: 'festival-thread', destination: '档案小门', observation: '档案小门里捻着一根来自各街区的星光线。', plan: '我把星光线也带回来。', fact: { id: 'starlight-thread', label: '各街区捻成的星光线', detail: '每一段都来自此前办好的小心愿。' }, discovery: 'starlight-thread' },
    detour: { id: 'festival-quick', destination: '星光广场', observation: '现在就点灯，还缺能让它聚拢的方向。', plan: '我先去广场试着点亮它。', fact: { id: 'festival-dim', label: '没有聚起来的微光', detail: '一段提醒 Pi 带回彼此关联的绕路。' }, discovery: 'starlight-thread', body: '灯闪了一下又暗下去；Pi 带回的不是失败，而是需要把小光连起来的理由。' },
  }),
};

const DEFINITIONS: Record<ChapterMissionId, MissionDefinition> = { lighthouse: LIGHTHOUSE, parcel: PARCEL, ...SEQUENTIAL_MISSIONS };

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
