/**
 * 家园情境台词库（S16-T1/T2/T3）。
 *
 * **纯 config、纯展示层**——台词只是"角色对你说的话"，**绝不携带任何数值效果、绝不驱动奖励**
 * （奖励只由 nurture 的每日互动 / 里程碑数值逻辑决定，台词改文本不影响任何结算）。
 * 这条红线把「名字≠行为」换皮点在台词域结构性锁死（对齐 S14-A squad 教训）。
 *
 * 首版用**通用模板兜底**（按互动类型 / 里程碑档位给一组通用台词），不要求逐角色专属；
 * 缺专属台词的情境**回落通用池、绝不报错/空白**。后续轮可增量补逐角色专属台词。
 * 纯函数按 index 取句（确定、可测）——调用方（view 层）传轮换计数或随机 index。
 */

/** tap 互动（今日首次可互动、给好感）时的问候台词池（第一人称、亲切语气）。 */
const TAP_GREET_LINES: readonly string[] = [
  '又来看我啦？今天也一起加油吧。',
  '你来啦！我等你好久了。',
  '嘿，正好想找你说说话呢。',
  '难得你有空过来，陪我待一会儿吧。',
  '今天过得怎么样？我一直都在这儿。',
  '看到你我就安心了。',
  '要不要一起在广场上转转？',
  '谢谢你还记得来看我。',
];

/** tap 互动（今日已互动过、不再给好感）时的闲聊台词池。 */
const TAP_IDLE_LINES: readonly string[] = [
  '今天已经聊过啦，明天再来找我吧。',
  '嘻嘻，你今天已经来看过我一次咯。',
  '别太黏人嘛……不过我也很开心。',
  '我在这儿好好待着，明天见~',
];

/**
 * ★ 逐角色专属 tap 问候台词（按角色 id = Bangumi 稳定键）。
 * 只覆盖今日首次 tap 的「问候」情境（in-character、第一人称）——让「点凉宫」≠「点初音」，
 * 补上通用池「谁点都说同一批话」的塌陷感。缺专属的角色**回落通用 TAP_GREET_LINES**，绝不报错/空白。
 * 首版小样（高人气/强人设角色），后续可增量补料。纯展示、零数值效果（同 tap 域「名字≠行为」红线）。
 * id 取自 data/selected_character/all_cards.json 的真实角色 id。
 */
const TAP_LINES_BY_CHARACTER: Readonly<Record<number, readonly string[]>> = {
  48: ['来得正好！SOS 团又有新活动了，你也一起！', '哼，算你识相，居然知道来找我。跟上跟上！'], // 凉宫春日
  49: ['……你来了。我在看书。要一起吗。', '（轻轻合上书）……嗯，欢迎回来。'], // 长门有希
  12393: ['又来打扰我做实验了？……也，也不是不欢迎啦。', '别误会，我只是刚好有空而已。'], // 牧濑红莉栖
  12392: ['哼哈哈哈！凤凰院凶真，正等着你的到来！', '这也是命运石之门的选择吗……欢迎，我的助手。'], // 冈部伦太郎
  304: ['终于来了？我可是很忙的，别浪费我时间。', '哼，看在你这么积极的份上，陪你一会儿好了。'], // 明日香
  303: ['……你来了。', '……我不太懂，但是见到你，好像不讨厌。'], // 绫波丽
  3575: ['哦，是你啊。要不要见识一下我的电击？开玩笑的啦。', '别小看我这个 Lv.5——不过，有你在还挺好的。'], // 御坂美琴
  273: ['吾之 Master，今日亦安好？', '身为骑士，守护此地是我的荣幸。'], // 阿尔托莉雅
  87968: ['诶诶诶你、你来了……我、我才没有在发抖！', '（小声）其实……有你来，我很开心……'], // 后藤一里
  10440: ['……你来了。只要我还在，这里就很安全。', '别担心，有些事，交给我就好。'], // 晓美焰
  10439: ['你来啦！我一直在等你呢，一起玩吧！', '只要大家都能笑着，我就觉得很幸福了。'], // 鹿目圆
  35681: ['吾名惠惠！红魔族第一的爆裂魔法使！……今天也来一发？', '爆裂魔法乃我毕生挚爱——啊，你来了，欢迎欢迎！'], // 惠惠
  85: ['哦……是你啊。糖分补充了没？没有的话借我点。', '人生就像自行车，不蹬就会倒——所以别叫我干活。'], // 坂田银时
  1762: ['干、干什么啦！又不是特意等你的！', '哼……既然来了，就陪我一下也不是不行啦。'], // 逢坂大河
  19040: ['来了？希望你不是又来浪费我的时间。', '……难得，今天就破例陪你聊几句吧。'], // 雪之下雪乃
  3: ['来得正好，帮我叫份披萨吧，要芝士边的。', '……哼，你这家伙，倒是挺准时的。'], // C.C.
  1: ['既然你来了，那就见证我的下一步棋吧。', '力量与孤独同在——不过，有你在也不坏。'], // 鲁路修
  466: ['啊，你来啦～我刚在发呆嘿嘿。要吃蛋糕吗？', '唯今天也超有精神哦！一起玩嘛一起玩嘛～'], // 平泽唯
  467: ['你、你别一直盯着我看啦……欢迎回来。', '（脸红）能来陪我，其实我挺高兴的。'], // 秋山澪
  275: ['哟！昨晚肝到三点，新番真香。你也来啦？', '要不要一起打游戏？输了不许哭哦～'], // 泉此方
  86246: ['……你来了。对我而言不过一瞬，但我记得你。', '收集魔法是我的爱好。你呢，今天想做什么？'], // 芙莉莲
  111328: ['又输了……啊不是啦！欢迎欢迎，我可没在难过哦！', '败犬也是有尊严的！……陪我吃点甜的吧？'], // 八奈见杏菜
  14823: ['啊，你来了！我很好奇——今天有什么新鲜事吗？', '我……我很在意！快告诉我快告诉我！'], // 千反田爱瑠
  24094: ['来啦？我给你留了位子哦。', '虽然我很普通啦，但有你在的日常，我很喜欢。'], // 加藤惠
  87973: ['来啦来啦！结束乐队的练习，你也来看嘛！', '保持微笑～今天也一起加油吧！'], // 伊地知虹夏
  87975: ['呀吼～你来啦！今天要不要听我弹一段？', '嘿嘿，见到你，我的心情就像亮了起来一样！'], // 喜多郁代
};

/** 里程碑达成/领取时的通用感言池（缺专属时回落）。 */
const MILESTONE_GENERIC_LINES: readonly string[] = [
  '和你相处的每一天，我都记在心里。',
  '因为有你，这个家才像个家。',
  '我们的羁绊又深了一点呢。',
  '谢谢你一直陪着我。',
];

/** 里程碑专属感言（按 config/nurture BOND_MILESTONES 的 id）。缺则回落 MILESTONE_GENERIC_LINES。 */
const MILESTONE_LINES_BY_ID: Readonly<Record<string, readonly string[]>> = {
  bond_1: ['初次见面还有点紧张，现在……觉得认识你真好。'],
  bond_2: ['和你越来越熟了，在一起很放松。'],
  bond_3: ['能成为要好的朋友，我很珍惜。'],
  bond_4: ['「挚友」这个词，用在你身上刚刚好。'],
  bond_5: ['这份羁绊，我会一直守护下去。'],
  bond_6: ['命运让我们相遇——往后也请多指教。'],
};

/**
 * S16-T4 广场同作品偶遇对话——**角色对彼此说的话**（区别于上面 tap 的「角色对你说的话」）。
 * 一次偶遇是一来一回：发起方 A 冒 opener，约 1.2s 后回应方 B 冒 reply。
 * 首版通用兜底（不区分作品），缺专属回落通用池、绝不报错/空白；后续轮可按作品名补专属池。
 * 纯展示：偶遇零好感、零数值效果（台词改文本不影响任何结算）——「名字≠行为」红线同 tap 域锁死。
 */

/** 偶遇发起句池（A 认出同作品同伴、起个话头，第二人称亲昵语气）。 */
const ENCOUNTER_OPENER_LINES: readonly string[] = [
  '欸，你也在这儿呀！',
  '好巧，又碰到你了。',
  '这不是熟人嘛，一起走走？',
  '嘿，正想找你聊聊呢。',
  '在这边遇到你，真让人安心。',
  '难得能一起晒晒太阳。',
  '看到你就想起以前的事了。',
  '这个家，有你在真好。',
];

/** 偶遇回应句池（B 错峰接话、呼应 A，一来一回的收尾）。 */
const ENCOUNTER_REPLY_LINES: readonly string[] = [
  '嗯，我们又聚到一块儿啦。',
  '是啊，感觉像回到了那时候。',
  '有你在，走到哪儿都热闹。',
  '嘻嘻，那就陪你转一圈吧。',
  '同一个屋檐下，本来就该多聊聊。',
  '别说，还真有点怀念呢。',
  '往后也一起加油吧。',
  '这份缘分，我也很珍惜。',
];

/** 一组偶遇专属池（openers = A 发起、replies = B 回应）。 */
type EncounterPool = { openers: readonly string[]; replies: readonly string[] };

// ── 逐作品偶遇专属池（真实作品，in-character 双人对话）。多个季名变体别名到同一池 ──
// computeBondPairs 取「两角色共享 anime_names 中字典序最小的一个」作键（如「命运石之门」<「命运石之门 0」），
// 但为稳妥把季名变体一并别名到同一池，保证无论命中哪个变体键都取到专属对话。
const ENC_STEINSGATE: EncounterPool = {
  openers: ['凤凰院凶真，此刻正被世界线所召唤！', 'El Psy Kongroo——你也感觉到时间的震颤了吗？', '嘟嚕嚕～是我啦！'],
  replies: ['……又中二病发作了。不过，这也是命运石之门的选择吧。', '别一惊一乍的，会让人误会的。', 'Tuturu～大家在一起真好呢！'],
};
const ENC_HARUHI: EncounterPool = {
  openers: ['SOS 团紧急集合！发现有趣的事了！', '（默默看书，抬头点了点头）', '……又要折腾什么了。'],
  replies: ['哈？谁准你休息了，跟上！', '……嗯。', '这种日常，倒也不算坏。'],
};
const ENC_KON: EncounterPool = {
  openers: ['要不要一起喝茶吃蛋糕呀～', '又在偷懒！该练习了啦！', '（默默端上红茶和点心）'],
  replies: ['放学后音乐部，永远的黄金时光！', '真是的……不过和大家在一起最开心了。', '轻音部，永不散场～'],
};
const ENC_BOCCHI: EncounterPool = {
  openers: ['结束乐队练习时间到——你也来嘛！', '（缩在角落）我、我不是故意挡路的……', '啊，有现金吗？借我点。'],
  replies: ['保持微笑就对啦！', '别紧张，有我们在呢。', '摇滚不死！'],
};
const ENC_MADOKA: EncounterPool = {
  openers: ['只要大家都能笑着就好了。', '……这份日常，我会守护，无论多少次。', '要不要签订契约成为魔法少女？（并没有）'],
  replies: ['嗯！我们一起，一定可以的。', '……谢谢你，一直都在。', '别乱说啦，会吓到人的。'],
};
const ENC_MONOGATARI: EncounterPool = {
  openers: ['（文具盒作响）……站住，别乱动。', '我什么都不知道，我只知道我知道的事。', '……又在偷偷做什么？'],
  replies: ['怪异这种东西，最好别沾上。', '这种拌嘴，也是一种温柔吧。', '物语，还在继续呢。'],
};
const ENC_CLANNAD: EncounterPool = {
  openers: ['团子大家族～你也一起唱嘛！', '这个家，有你们才完整。', '（默默雕海星）……给你一个。'],
  replies: ['一家人在一起，哪儿都是家。', '嗯……真希望这样的日子能一直持续。', '谢谢你，一直陪着大家。'],
};
const ENC_EVA: EncounterPool = {
  openers: ['别发呆了，笨蛋 Shinji 都不如你呢。', '……我在这里。', '（沉默）……'],
  replies: ['哼，至少我们还活着，不是吗。', '……不逃避，也挺好。', '在一起，就不那么孤单了。'],
};
const ENC_FATE: EncounterPool = {
  openers: ['身为骑士，守护是我的职责。', '哼，别添乱就好——不过，谢谢你在。', '我，遵从我的正义。'],
  replies: ['I am the bone of my sword……', '有你们在，这条路不算孤独。', '这份羁绊，值得守护。'],
};
const ENC_MUSHOKU: EncounterPool = {
  openers: ['做人要努力，从今天也开始吧！', '哼、哼，才不是特意来找你的！', '（小声）能和大家在一起，太好了……'],
  replies: ['一步一步来，总会到达的。', '既然来了就好好陪我！', '这样温暖的日子，我很珍惜。'],
};

/**
 * 偶遇专属对话（按作品名 anime_names 稳定键）：缺则回落通用池，**绝不报错/空白**。
 * 首版小样（高人气同住组），季名变体别名到同一池；后续可增量补料。
 */
const ENCOUNTER_LINES_BY_ANIME: Readonly<Record<string, EncounterPool>> = {
  命运石之门: ENC_STEINSGATE,
  '命运石之门 0': ENC_STEINSGATE,
  凉宫春日的忧郁: ENC_HARUHI,
  '凉宫春日的忧郁 2009': ENC_HARUHI,
  轻音少女: ENC_KON,
  '轻音少女 第二季': ENC_KON,
  '孤独摇滚！': ENC_BOCCHI,
  魔法少女小圆: ENC_MADOKA,
  化物语: ENC_MONOGATARI,
  '物语系列 第二季': ENC_MONOGATARI,
  CLANNAD: ENC_CLANNAD,
  'CLANNAD 〜AFTER STORY〜': ENC_CLANNAD,
  新世纪福音战士: ENC_EVA,
  'Fate/stay night [Unlimited Blade Works]': ENC_FATE,
  'Fate/stay night [Unlimited Blade Works] 第二季': ENC_FATE,
  'Fate/Zero': ENC_FATE,
  '无职转生～到了异世界就拿出真本事～': ENC_MUSHOKU,
  '无职转生～到了异世界就拿出真本事～ 第2部分': ENC_MUSHOKU,
};

/** 从池中按 index 取一句（modulo 环绕、容忍负数与非整）。空池返回 ''（防御，正常不发生）。 */
function pickFrom(pool: readonly string[], index: number): string {
  if (pool.length === 0) return '';
  const n = pool.length;
  const i = ((Math.floor(index) % n) + n) % n;
  return pool[i];
}

/**
 * tap 互动台词。`gaveAffection=true`（今日首次、给了好感）取问候池，否则取闲聊池。
 * `characterId`（可选）命中逐角色专属问候池时用专属句（让点不同角色说不同话）；
 * 缺专属 / 已互动（闲聊）情境一律回落通用池。index 决定池内选哪句（调用方轮换/随机）。永不返回空白。
 */
export function pickTapDialogue(gaveAffection: boolean, index: number, characterId?: number): string {
  if (gaveAffection && characterId != null) {
    const bespoke = TAP_LINES_BY_CHARACTER[characterId];
    if (bespoke && bespoke.length > 0) return pickFrom(bespoke, index);
  }
  return pickFrom(gaveAffection ? TAP_GREET_LINES : TAP_IDLE_LINES, index);
}

/**
 * 里程碑感言：优先该 id 专属池，缺/未知 id 回落通用池——**绝不报错/空白**。
 * index 决定池内选哪句。
 */
export function pickMilestoneDialogue(milestoneId: string, index: number): string {
  const bespoke = MILESTONE_LINES_BY_ID[milestoneId];
  const pool = bespoke && bespoke.length > 0 ? bespoke : MILESTONE_GENERIC_LINES;
  return pickFrom(pool, index);
}

/**
 * S16-T10 今日特殊角色台词——**「今天心情特别好」的今日专属问候**（区别于普通 tap 的常规问候）。
 * 由 date-seeded 派生的今日特殊角色 tap 时改喂这里，与普通角色可分辨。
 * 纯展示、零数值效果（改文本不影响任何发放）——「名字≠行为」红线同 tap 域锁死。
 * 首版通用兜底（不逐角色），缺专属回落通用池、绝不报错/空白。
 */
const TODAY_SPECIAL_LINES: readonly string[] = [
  '今天不知怎么的，心情特别好——有你在就更棒了！',
  '嘿嘿，今天感觉是我的幸运日，正好你也来了。',
  '今天阳光正好，我一直盼着你来呢。',
  '不知道为什么，今天特别想见到你，你就出现啦。',
  '今天我可是精神满满哦，要不要一起玩会儿？',
  '今天的我状态绝佳，这份好心情也分你一半！',
  '总觉得今天会有好事发生……果然，你来了。',
  '今天心里暖暖的，谢谢你来陪我。',
];

/**
 * 今日特殊角色台词：按 index 环绕取一句，永不返回空白（池非空）。
 * 供 view 层在「今日特殊角色被 tap」时替代 pickTapDialogue 使用（纯展示分支）。
 */
export function pickTodaySpecialDialogue(index: number): string {
  return pickFrom(TODAY_SPECIAL_LINES, index);
}

/** 今日特殊台词池条数（测试用，验证池非空）。 */
export const TODAY_SPECIAL_LINE_COUNT = TODAY_SPECIAL_LINES.length;

/** 一次偶遇的一来一回台词（opener = A 发起、reply = B 回应）。 */
export interface EncounterDialogue {
  opener: string;
  reply: string;
}

/**
 * S16-T4 偶遇对话：按作品名（anime，稳定键）取一来一回两句——优先该作品专属池，
 * 缺/未知作品回落通用池，**绝不报错/空白**。opener 与 reply 用同一 index 分别在各自池里
 * 环绕取句（调用方传轮换/随机 index）；opener 与 reply 各自池非空即两句都非空。
 */
export function pickEncounterDialogue(anime: string | undefined, index: number): EncounterDialogue {
  const bespoke = anime ? ENCOUNTER_LINES_BY_ANIME[anime] : undefined;
  const openerPool =
    bespoke && bespoke.openers.length > 0 ? bespoke.openers : ENCOUNTER_OPENER_LINES;
  const replyPool =
    bespoke && bespoke.replies.length > 0 ? bespoke.replies : ENCOUNTER_REPLY_LINES;
  return {
    opener: pickFrom(openerPool, index),
    // reply 用 index+1 错开，避免 opener/reply 恰好取到语义重叠的同下标句。
    reply: pickFrom(replyPool, index + 1),
  };
}
