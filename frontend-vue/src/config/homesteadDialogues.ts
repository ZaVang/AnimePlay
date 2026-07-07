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

/**
 * 偶遇专属对话（按作品名 anime_names 稳定键）：{ openers, replies } 各一池，缺则回落通用池。
 * 首版留空（通用兜底即可，验收允许）；后续轮按真实作品逐条补料。
 */
const ENCOUNTER_LINES_BY_ANIME: Readonly<
  Record<string, { openers: readonly string[]; replies: readonly string[] }>
> = {};

/** 从池中按 index 取一句（modulo 环绕、容忍负数与非整）。空池返回 ''（防御，正常不发生）。 */
function pickFrom(pool: readonly string[], index: number): string {
  if (pool.length === 0) return '';
  const n = pool.length;
  const i = ((Math.floor(index) % n) + n) % n;
  return pool[i];
}

/**
 * tap 互动台词。`gaveAffection=true`（今日首次、给了好感）取问候池，否则取闲聊池。
 * index 决定池内选哪句（调用方轮换/随机）。永不返回空白（池非空）。
 */
export function pickTapDialogue(gaveAffection: boolean, index: number): string {
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
