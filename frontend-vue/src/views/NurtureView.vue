<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/nurture';
import {
  calculateBattlePower,
  MAX_CHARACTER_LEVEL,
  MAX_BREAKTHROUGH,
  breakthroughCost,
  breakthroughStatBonus,
  type BattleStats,
} from '@/engine';
import { resolveMemberBattleStats, resolveNurturedStatPointsFor } from '@/utils/battleStats';
import { bondTier } from '@/config/nurtureColors';
import { rarityStyle } from '@/config/equipmentColors';
import {
  getEquipmentDef,
  formatBonus,
  setProgressFor,
  setBonusFor,
  SLOT_META,
  SLOT_ORDER,
  type EquipmentSlot,
  type EquipmentDef,
} from '@/config/equipment';
import InventoryPanel from '@/components/nurture/InventoryPanel.vue';
import EquipPickerModal from '@/components/nurture/EquipPickerModal.vue';
import CharacterAvatar from '@/components/CharacterAvatar.vue';
import { getSquadSkillKitForCharacter } from '@/data/squadSkillKits';
import {
  STAT_DISPLAY_REF,
  STAT_META,
  BOND_MILESTONES,
  bondTitleFor,
  isMilestoneClaimable,
  bondOverflowExchange,
  DAILY_BOND_INTERACTION_AFFECTION,
  DAILY_BOND_INTERACTION_EXP,
  tutoringCost,
  tutoringExpGain,
} from '@/config/nurture';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const equipmentStore = useEquipmentStore();

const selectedCharacterId = ref<number | null>(null);

const rarityOrder: Record<string, number> = { UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

// 已拥有角色列表（按稀有度 → 等级排序），附养成数据
const ownedCharacters = computed(() => {
  return Array.from(userStore.characterCollection.entries())
    .map(([id]) => {
      const character = gameDataStore.getCharacterCardById(id);
      if (!character) return null;
      return { ...character, nurtureData: userStore.getNurtureData(id) };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const r = (rarityOrder[b!.rarity] || 0) - (rarityOrder[a!.rarity] || 0);
      if (r !== 0) return r;
      return (b!.nurtureData.level || 1) - (a!.nurtureData.level || 1);
    }) as (CharacterCard & { nurtureData: CharacterNurtureData })[];
});

// 首个角色自动选中（无壳内嵌，进面板即有内容）
watch(ownedCharacters, list => {
  if (selectedCharacterId.value == null && list.length > 0) selectedCharacterId.value = list[0].id;
}, { immediate: true });

const selectedCharacter = computed(() => {
  if (selectedCharacterId.value == null) return null;
  return ownedCharacters.value.find(c => c.id === selectedCharacterId.value) || null;
});

function selectCharacter(id: number) {
  selectedCharacterId.value = id;
}

// --- box → detail 两级导航（阶段2 唯一新增本地态） ---
type NurtureMode = 'box' | 'detail';
type DetailTab = 'skill' | 'stat' | 'equip' | 'star' | 'bond';
const mode = ref<NurtureMode>('box');
const activeTab = ref<DetailTab>('skill');

const detailTabs: { key: DetailTab; label: string }[] = [
  { key: 'skill', label: '技能' },
  { key: 'stat', label: '属性' },
  { key: 'equip', label: '装备' },
  { key: 'star', label: '突破' },
  { key: 'bond', label: '好感' },
];

/** 点 box 头像进详情：选中 + 切详情 + 回到默认签。 */
function openDetail(id: number) {
  selectCharacter(id);
  activeTab.value = 'skill';
  mode.value = 'detail';
}

function backToBox() {
  mode.value = 'box';
}

// 技能签：读小队战技能包（skill1 / passive / ultimate；无 kit 显占位）。
const skillKit = computed(() => getSquadSkillKitForCharacter(selectedCharacter.value));

// 一键装备（阶段1 equipmentStore.autoEquipBest）：落地后飘字提示 changed / powerAfter。
const autoEquipToast = ref<string>('');
let autoEquipToastTimer = 0;
function doAutoEquip() {
  const c = selectedCharacter.value;
  if (!c) return;
  const { changed, powerBefore, powerAfter } = equipmentStore.autoEquipBest(c.id);
  autoEquipToast.value = changed > 0
    ? `已优化 ${changed} 个槽位 · 战力 ${powerBefore} → ${powerAfter}（+${powerAfter - powerBefore}）`
    : '当前配装已是最优，无需更换';
  clearTimeout(autoEquipToastTimer);
  autoEquipToastTimer = window.setTimeout(() => { autoEquipToast.value = ''; }, 2400);
}

// --- 派生展示 ---

const levelProgress = computed(() =>
  selectedCharacter.value ? userStore.getLevelProgress(selectedCharacter.value.nurtureData) : null,
);

const isLevelMax = computed(() => (selectedCharacter.value?.nurtureData.level ?? 0) >= MAX_CHARACTER_LEVEL);

const baseStats = computed<BattleStats>(
  () => selectedCharacter.value?.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
);

// 装备加成：与小队/进战斗同源 resolveEquipBonus（口径全站一致，避免数字打架）。
const equipBonus = computed<BattleStats>(() => {
  const c = selectedCharacter.value;
  if (!c) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  void equipmentStore.equipped; // 触发依赖收集
  return equipmentStore.resolveEquipBonus(c.id);
});

// 养成合成加点（等级加点 + 突破 + 好感永久）——全站单一战力口径。
const nurturedStatPoints = computed<BattleStats>(() => {
  const c = selectedCharacter.value;
  if (!c) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  return resolveNurturedStatPointsFor(c.nurtureData, baseStats.value);
});

const finalStats = computed<BattleStats>(() => {
  if (!selectedCharacter.value) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  return resolveMemberBattleStats(baseStats.value, selectedCharacter.value.nurtureData, equipBonus.value);
});

const battlePower = computed(() => calculateBattlePower(finalStats.value));

// 五维显示行：base / 加点（含突破+好感永久） / 装备 / 合计 + 软上限条填充
const statRows = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return [];
  const eb = equipBonus.value;
  const np = nurturedStatPoints.value;
  return STAT_META.map(meta => {
    const base = baseStats.value[meta.key];
    const point = np[meta.key];
    const equip = eb[meta.key];
    const total = base + point + equip;
    const ref = STAT_DISPLAY_REF[meta.key];
    const fillPct = Math.min(100, (total / ref) * 100);
    return { ...meta, base, point, equip, total, ref, fillPct, isMax: total >= ref };
  });
});

// --- SC-T3 星级/突破 ---
const breakthroughStar = computed(() => selectedCharacter.value?.nurtureData.breakthrough ?? 0);
const isBreakthroughMax = computed(() => breakthroughStar.value >= MAX_BREAKTHROUGH);
// 可消耗重复卡（保留本体 1 张）
const spareCards = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return 0;
  return Math.max(0, userStore.getCharacterCardCount(c.id) - 1);
});
const nextBreakthroughCost = computed(() => (isBreakthroughMax.value ? 0 : breakthroughCost(breakthroughStar.value)));
const canBreakthroughNow = computed(
  () => !isBreakthroughMax.value && spareCards.value >= nextBreakthroughCost.value,
);
// 突破一星的五维增量预览（下一星 vs 当前星）
const breakthroughPreview = computed(() => {
  const c = selectedCharacter.value;
  if (!c || isBreakthroughMax.value) return null;
  const cur = breakthroughStatBonus(breakthroughStar.value, baseStats.value);
  const next = breakthroughStatBonus(breakthroughStar.value + 1, baseStats.value);
  return STAT_META.map(meta => ({ key: meta.key, short: meta.short, delta: next[meta.key] - cur[meta.key] }))
    .filter(r => r.delta > 0);
});
const breakthroughStars = computed(() =>
  Array.from({ length: MAX_BREAKTHROUGH }, (_, i) => i < breakthroughStar.value),
);

function doBreakthrough() {
  const c = selectedCharacter.value;
  if (!c) return;
  userStore.breakthroughCharacter(c.id);
}

// 好感档（语义色 + 称号）
const bond = computed(() => {
  const aff = selectedCharacter.value?.nurtureData.affection || 0;
  return { ...bondTier(aff), title: bondTitleFor(aff), affection: aff };
});

// 好感进度：朝下一个未达成里程碑推进
const bondProgress = computed(() => {
  const aff = selectedCharacter.value?.nurtureData.affection || 0;
  const next = BOND_MILESTONES.find(m => aff < m.threshold);
  if (!next) return { pct: 100, current: aff, target: BOND_MILESTONES[BOND_MILESTONES.length - 1].threshold, targetTitle: '', maxed: true };
  const prevThreshold = BOND_MILESTONES.filter(m => aff >= m.threshold).pop()?.threshold ?? 0;
  const span = next.threshold - prevThreshold;
  const pct = span > 0 ? ((aff - prevThreshold) / span) * 100 : 0;
  return { pct: Math.min(100, Math.max(0, pct)), current: aff, target: next.threshold, targetTitle: next.title, maxed: false };
});

// 里程碑列表（达成 / 可领 / 已领 + 永久加成 %）
const milestones = computed(() => {
  const c = selectedCharacter.value;
  const aff = c?.nurtureData.affection || 0;
  const claimed = c?.nurtureData.claimedBondMilestones || [];
  return BOND_MILESTONES.map(m => ({
    ...m,
    reached: aff >= m.threshold,
    claimed: claimed.includes(m.id),
    claimable: c ? isMilestoneClaimable(aff, claimed, m) : false,
    bonusPctText: `+${Math.round(m.statBonusPct * 100)}% 五维`,
  }));
});

// 可领里程碑计数（标题徽章 + 左侧列表红点用）
const claimableCount = computed(() => milestones.value.filter(m => m.claimable).length);

function charClaimableCount(nd: CharacterNurtureData): number {
  const aff = nd.affection || 0;
  const claimed = nd.claimedBondMilestones || [];
  return BOND_MILESTONES.filter(m => isMilestoneClaimable(aff, claimed, m)).length;
}

// --- SC-T4 每日互动 + 好感溢出转 KP ---
const canDailyInteract = computed(() => {
  const c = selectedCharacter.value;
  return !!c && userStore.canDailyBondInteract(c.id);
});
const bondOverflow = computed(() => {
  const aff = selectedCharacter.value?.nurtureData.affection || 0;
  return bondOverflowExchange(aff);
});

function doDailyInteract() {
  const c = selectedCharacter.value;
  if (c) userStore.dailyBondInteraction(c.id);
}
function doClaimOverflow() {
  const c = selectedCharacter.value;
  if (c) userStore.claimBondOverflow(c.id);
}

// ★ SF-T2：补习成本随等级递增，按钮文案动态显示当前等级实际成本（非写死定额）。
const tutorCost = computed(() => {
  const c = selectedCharacter.value;
  return c ? tutoringCost(c.nurtureData.level) : tutoringCost(1);
});

const canTutor = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return false;
  return c.nurtureData.level < MAX_CHARACTER_LEVEL && userStore.playerState.knowledgePoints >= tutorCost.value;
});

// ★ SD-T4：补习产出随等级递增，按钮文案动态显示当前等级的实际经验（避免「描述≠行为」）。
const tutorExpGain = computed(() => {
  const c = selectedCharacter.value;
  return c ? tutoringExpGain(c.nurtureData.level) : tutoringExpGain(1);
});

// 本次补习的随机加点增量（飘字提示用，仅展示）
const lastGain = ref<Record<string, number> | null>(null);
// ★ SF-T2 批量补习一次性汇总飘字（勿逐次闪烁）。
const batchToast = ref<string>('');
let gainClearTimer = 0;
let batchToastTimer = 0;

function tutor() {
  const c = selectedCharacter.value;
  if (!c) return;
  const before: Record<string, number> = { ...c.nurtureData.statPoints };
  userStore.tutorCharacter(c.id);
  const after = c.nurtureData.statPoints;
  const gain: Record<string, number> = {};
  let any = false;
  for (const meta of STAT_META) {
    const d = (after[meta.key] ?? 0) - (before[meta.key] ?? 0);
    if (d > 0) { gain[meta.key] = d; any = true; }
  }
  if (any) {
    lastGain.value = gain;
    clearTimeout(gainClearTimer);
    gainClearTimer = window.setTimeout(() => { lastGain.value = null; }, 1800);
  }
}

/** ★ SF-T2 批量补习（×10 / 补到下一级）：逐份扣费在 store 内完成，此处只汇总飘字。 */
function tutorBatch(mode: 'times' | 'toNextLevel') {
  const c = selectedCharacter.value;
  if (!c) return;
  const result = userStore.tutorCharacterBatch(c.id, mode, mode === 'times' ? 10 : 100);
  if (result.times > 0) {
    const levelText = result.levelsGained > 0 ? ` · 升 ${result.levelsGained} 级` : '';
    batchToast.value = `本批 ${result.times} 次：+${result.gainedExp} 经验${levelText}（-${result.spentKp} KP）`;
    clearTimeout(batchToastTimer);
    batchToastTimer = window.setTimeout(() => { batchToast.value = ''; }, 2400);
  }
}

onUnmounted(() => { clearTimeout(gainClearTimer); clearTimeout(batchToastTimer); clearTimeout(autoEquipToastTimer); });

function claimMilestone(milestoneId: string) {
  if (selectedCharacter.value) userStore.claimBondMilestone(selectedCharacter.value.id, milestoneId);
}

// 3 个装备槽位（C2 接配装：点击开 picker 弹窗）
const equipSlots = SLOT_ORDER.map(key => ({ key, ...SLOT_META[key] }));

// 当前角色三槽已装定义（展示槽里穿了什么）
const equippedDefs = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return {} as Record<EquipmentSlot, EquipmentDef | undefined>;
  void equipmentStore.equipped; // 触发依赖收集
  const slots = equipmentStore.getEquipped(c.id);
  const out = {} as Record<EquipmentSlot, EquipmentDef | undefined>;
  for (const s of SLOT_ORDER) {
    const uid = slots[s];
    out[s] = uid ? getEquipmentDef(equipmentStore.getItem(uid)?.defId ?? '') : undefined;
  }
  return out;
});

// SF-T7①：当前角色三槽已装 defId 列表（喂 setProgressFor / setBonusFor，单一真相源）。
const equippedDefIds = computed<string[]>(() =>
  SLOT_ORDER.map(s => equippedDefs.value[s]?.id).filter((id): id is string => !!id),
);

// SF-T7①：套装进度 chip（复用 config setProgressFor，与配装弹窗同源；tier>0 点亮，未齐灰显 count/3）。
const setProgressRows = computed(() => setProgressFor(equippedDefIds.value));

/**
 * SF-T7①：齐套贡献的战力 delta（含套装 − 不含套装）。
 * finalStats 已含 setBonus（resolveEquipBonus 内已叠 setBonusFor），此处从 finalStats **减去** setBonus 再重算，
 * 得到齐套的边际战力增量——**不再叠一次 setBonusFor**，避免复现「预览≠实战」双算。
 */
const setPowerDelta = computed<number>(() => {
  const rows = setProgressRows.value;
  if (rows.length === 0 || !rows.some(r => r.tier > 0)) return 0;
  const setBonus = setBonusFor(equippedDefIds.value);
  const withSet = finalStats.value;
  const withoutSet: BattleStats = {
    hp: withSet.hp - (setBonus.hp ?? 0),
    atk: withSet.atk - (setBonus.atk ?? 0),
    def: withSet.def - (setBonus.def ?? 0),
    sp: withSet.sp - (setBonus.sp ?? 0),
    spd: withSet.spd - (setBonus.spd ?? 0),
  };
  return Math.max(0, calculateBattlePower(withSet) - calculateBattlePower(withoutSet));
});

// 配装弹窗状态
const pickerOpen = ref(false);
const pickerSlot = ref<EquipmentSlot>('weapon');

function openPicker(slot: EquipmentSlot) {
  if (!selectedCharacter.value) return;
  pickerSlot.value = slot;
  pickerOpen.value = true;
}

function quickUnequip(slot: EquipmentSlot) {
  if (selectedCharacter.value) userStore.unequipItem(selectedCharacter.value.id, slot);
}
</script>

<template>
  <!-- SC-T6：无壳可内嵌组件（去 min-h-screen / 页级 h1 / 独立未登录空态；仅保留紧凑无角色兜底）。
       阶段2：box → detail 两级；视觉套 hub 手游语言（g-card 质感 / 胖按钮 / 令牌色 / 稀有度既有色）。 -->
  <div class="nurture-embed">
    <!-- 无角色紧凑兜底（未登录/无角色由 hub 壳统一处理；此处仅防独立渲染空白） -->
    <div v-if="ownedCharacters.length === 0" class="nt-empty">
      <div class="nt-empty-emoji">🎴</div>
      <p>暂无可养成角色，去抽卡获得角色后即可在此培养。</p>
    </div>

    <!-- ============ box 模式：我的 Box 头像网格 ============ -->
    <div v-else-if="mode === 'box'" class="g-card nt-box">
      <div class="nt-box-head">
        <h2>我的 Box · {{ ownedCharacters.length }}</h2>
        <span class="g-chip">点头像进养成</span>
      </div>
      <div class="nt-box-grid">
        <button
          v-for="character in ownedCharacters"
          :key="character.id"
          type="button"
          class="nt-cell"
          @click="openDetail(character.id)"
        >
          <div class="nt-cell-art">
            <!-- 小头像用 sprite 正面帧（CharacterAvatar 兜底链 sprite→立绘）；大立绘 hero 仍用原图 -->
            <CharacterAvatar
              :character-id="character.id"
              :name="character.name"
              :size="96"
              rounded
              class="nt-cell-avatar"
            />
            <!-- 稀有度识别：既有 rarityStyle 渐变徽章（颜色铁律固定例外，不自造 hex） -->
            <span
              class="nt-cell-rr bg-gradient-to-r"
              :class="rarityStyle(character.rarity).gradient"
            >{{ character.rarity }}</span>
            <span class="nt-cell-lv">Lv.{{ character.nurtureData.level }}</span>
            <span v-if="character.nurtureData.breakthrough > 0" class="nt-cell-star">★{{ character.nurtureData.breakthrough }}</span>
            <span
              v-if="charClaimableCount(character.nurtureData) > 0"
              class="nt-cell-dot"
              title="有可领取的好感里程碑"
            ></span>
          </div>
          <span class="nt-cell-name">{{ character.name }}</span>
        </button>
      </div>
    </div>

    <!-- ============ detail 模式：立绘 hero + tabs ============ -->
    <div v-else-if="selectedCharacter" class="nt-detail">
      <div class="nt-detail-head">
        <button type="button" class="btn-secondary nt-back" @click="backToBox">‹ 返回 Box</button>
        <span class="g-eyebrow">角色养成</span>
      </div>

      <div class="nt-detail-body">
        <!-- 左：立绘 hero + 等级/好感条 + 补习/互动按钮组 -->
        <div class="nt-hero-col">
          <div class="nt-hero g-card">
            <img
              :src="selectedCharacter.image_path"
              :alt="selectedCharacter.name"
              class="nt-hero-img"
              loading="lazy"
              decoding="async"
            >
            <span
              class="nt-hero-rr bg-gradient-to-r"
              :class="rarityStyle(selectedCharacter.rarity).gradient"
            >{{ selectedCharacter.rarity }}</span>
            <div class="nt-hero-id">
              <h3>{{ selectedCharacter.name }}</h3>
              <div class="nt-hero-sub">
                <span :class="bond.color">{{ bond.icon }} {{ bond.title }}</span>
                <span v-if="breakthroughStar > 0" class="nt-hero-star">★{{ breakthroughStar }}</span>
                <span class="g-chip gold">战力 {{ battlePower }}</span>
              </div>
            </div>
          </div>

          <!-- 等级 / 好感 常驻条 -->
          <div class="nt-prog">
            <div class="nt-prog-row">
              <div class="nt-prog-lbl">
                <span>⚡ 等级 Lv.{{ selectedCharacter.nurtureData.level }}</span>
                <span class="nt-prog-v num" v-if="levelProgress">
                  <template v-if="isLevelMax">MAX</template>
                  <template v-else>{{ levelProgress.current }}/{{ levelProgress.required }}</template>
                </span>
              </div>
              <div class="nt-bar">
                <i
                  :class="isLevelMax ? 'bg-accent' : 'bg-highlight'"
                  :style="{ width: `${isLevelMax ? 100 : (levelProgress?.percentage || 0)}%` }"
                ></i>
              </div>
            </div>
            <div class="nt-prog-row">
              <div class="nt-prog-lbl">
                <span>❤️ 好感 {{ bond.affection }}</span>
                <span class="nt-prog-v">
                  <template v-if="bondProgress.maxed">已圆满</template>
                  <template v-else>下一档 · {{ bondProgress.targetTitle }} ({{ bondProgress.target }})</template>
                </span>
              </div>
              <div class="nt-bar">
                <i :class="bond.barColor" :style="{ width: `${bondProgress.pct}%` }"></i>
              </div>
            </div>
          </div>

          <!-- 补习 / ×10 / 补到下一级 / 每日互动 / 好感溢出 -->
          <div class="nt-actbtns">
            <button
              type="button"
              class="btn-primary nt-act"
              :disabled="!canTutor"
              @click="tutor"
            >📚 补习 (-{{ tutorCost }} KP → +{{ tutorExpGain }} 经验)</button>
            <button
              type="button"
              class="btn-secondary nt-act"
              :disabled="!canTutor"
              @click="tutorBatch('times')"
            >×10</button>
            <button
              type="button"
              class="btn-secondary nt-act"
              :disabled="!canTutor"
              @click="tutorBatch('toNextLevel')"
            >补到下一级</button>
            <button
              type="button"
              class="btn-secondary nt-act"
              :disabled="!canDailyInteract"
              @click="doDailyInteract"
            >🎁 每日互动 (+{{ DAILY_BOND_INTERACTION_AFFECTION }} 好感 / +{{ DAILY_BOND_INTERACTION_EXP }} 经验)</button>
          </div>
          <div class="nt-act-hints">
            <span v-if="isLevelMax" class="nt-hint-accent">已满级</span>
            <span v-else-if="!canTutor" class="nt-hint-warn">知识点不足</span>
            <span v-if="!canDailyInteract" class="nt-hint-mut">今日已互动</span>
            <span v-if="batchToast" class="nt-hint-ok">{{ batchToast }}</span>
          </div>
          <button
            v-if="bondOverflow.kp > 0"
            type="button"
            class="btn-ghost nt-overflow"
            @click="doClaimOverflow"
          >♻️ 好感溢出兑换 (-{{ bondOverflow.spendAffection }} 好感 → +{{ bondOverflow.kp }} KP)</button>
        </div>

        <!-- 右：tabs（技能 / 属性 / 装备 / 突破 / 好感） -->
        <div class="nt-tab-col">
          <div class="nt-tabs">
            <button
              v-for="t in detailTabs"
              :key="t.key"
              type="button"
              :class="{ on: activeTab === t.key }"
              @click="activeTab = t.key"
            >
              {{ t.label }}
              <span v-if="t.key === 'bond' && claimableCount > 0" class="nt-tab-badge">{{ claimableCount }}</span>
            </button>
          </div>

          <!-- 技能签 -->
          <div v-if="activeTab === 'skill'" class="nt-pane">
            <template v-if="skillKit">
              <div class="nt-skl">
                <span class="nt-skl-ic">技</span>
                <div class="nt-skl-body">
                  <b>{{ skillKit.skill1.name }}</b>
                  <p>{{ skillKit.skill1.description }}</p>
                </div>
              </div>
              <div class="nt-skl">
                <span class="nt-skl-ic pas">被</span>
                <div class="nt-skl-body">
                  <b>{{ skillKit.passive.name }}</b>
                  <p>{{ skillKit.passive.description }}</p>
                </div>
              </div>
              <div class="nt-skl">
                <span class="nt-skl-ic ult">奥</span>
                <div class="nt-skl-body">
                  <b>{{ skillKit.ultimate.name }} <em class="nt-skl-kd">· 大招</em></b>
                  <p>{{ skillKit.ultimate.description }}</p>
                </div>
              </div>
            </template>
            <div v-else class="nt-placeholder">
              该角色暂无小队战技能包（仅 SSR/HR/UR 且已完成设计的角色拥有招牌技能）。
            </div>
          </div>

          <!-- 属性签：五维软上限条（既有全保留） -->
          <div v-else-if="activeTab === 'stat'" class="nt-pane">
            <div v-for="row in statRows" :key="row.key" class="nt-stat">
              <div class="nt-stat-head">
                <span class="nt-stat-lbl">{{ row.label }}</span>
                <span class="nt-stat-val">
                  <span class="num">{{ row.total }}</span>
                  <small>
                    ({{ row.base }}<span class="nt-stat-pt" v-if="row.point > 0"> +{{ row.point }}</span><span class="nt-stat-eq" v-if="row.equip > 0"> +{{ row.equip }}装</span>)
                  </small>
                  <span v-if="row.isMax" class="nt-stat-max">MAX</span>
                  <span v-if="lastGain && lastGain[row.key]" class="stat-gain-pop nt-stat-gain">+{{ lastGain[row.key] }}</span>
                </span>
              </div>
              <div class="nt-bar">
                <i :class="row.isMax ? 'bg-accent' : 'bg-highlight'" :style="{ width: `${row.fillPct}%` }"></i>
              </div>
            </div>
            <p class="nt-note">「加点」段含升级加点 + 突破 + 好感永久加成，与实战战力同源；条按「值 / 参考值」填充。</p>
          </div>

          <!-- 装备签：3 槽 + 一键装备 + 套装 + 背包 -->
          <div v-else-if="activeTab === 'equip'" class="nt-pane">
            <div class="nt-eq-slots">
              <div v-for="slot in equipSlots" :key="slot.key" class="nt-eq-slot-wrap">
                <button
                  type="button"
                  class="nt-eq-slot"
                  :class="{ on: equippedDefs[slot.key] }"
                  @click="openPicker(slot.key)"
                >
                  <template v-if="equippedDefs[slot.key]">
                    <span
                      class="nt-eq-rr bg-gradient-to-r"
                      :class="rarityStyle(equippedDefs[slot.key]!.rarity).gradient"
                    >{{ equippedDefs[slot.key]!.rarity }}</span>
                    <div class="nt-eq-name">{{ equippedDefs[slot.key]!.name }}</div>
                    <div class="nt-eq-bonus">{{ formatBonus(equippedDefs[slot.key]!.bonus) }}</div>
                  </template>
                  <template v-else>
                    <div class="nt-eq-icon">{{ slot.icon }}</div>
                    <div class="nt-eq-sl">{{ slot.label }}</div>
                    <div class="nt-eq-hint">点击装备</div>
                  </template>
                </button>
                <button
                  v-if="equippedDefs[slot.key]"
                  type="button"
                  class="nt-eq-off"
                  title="卸下"
                  @click.stop="quickUnequip(slot.key)"
                >✕</button>
              </div>
            </div>

            <div class="nt-eq-cta">
              <button type="button" class="g-cta-gold nt-eq-auto" @click="doAutoEquip">✨ 一键装备（自动填最优）</button>
            </div>
            <transition name="nt-fade">
              <p v-if="autoEquipToast" class="nt-eq-toast">{{ autoEquipToast }}</p>
            </transition>

            <!-- 套装进度 chip（复用 setProgressFor / setPowerDelta，与配装弹窗同源） -->
            <div v-if="setProgressRows.length > 0" class="nt-set">
              <div class="nt-set-head">
                <span>套装搭配</span>
                <span v-if="setPowerDelta > 0" class="nt-set-delta">齐套战力 +{{ setPowerDelta }}</span>
              </div>
              <div class="nt-set-chips">
                <span
                  v-for="p in setProgressRows"
                  :key="p.set.id"
                  class="g-chip"
                  :class="p.tier > 0 ? 'gold' : 'mut'"
                  :title="p.tier > 0 ? formatBonus(p.currentBonus) : `凑齐 2 件解锁 ${p.set.hint}`"
                >
                  🎯 {{ p.set.name }}
                  <template v-if="p.tier > 0">齐{{ p.tier }}</template>
                  <template v-else>{{ p.count }}/3</template>
                </span>
              </div>
            </div>

            <!-- 背包（既有子组件，点槽位换装同源） -->
            <div class="nt-inv">
              <InventoryPanel />
            </div>
          </div>

          <!-- 突破签：星级（既有全保留） -->
          <div v-else-if="activeTab === 'star'" class="nt-pane">
            <div class="nt-stars">
              <span
                v-for="(filled, i) in breakthroughStars"
                :key="i"
                :class="filled ? 'on' : 'off'"
              >★</span>
              <span class="nt-stars-count">{{ breakthroughStar }} / {{ MAX_BREAKTHROUGH }}</span>
            </div>
            <p class="nt-note nt-note-lead">消化重复角色卡换永久五维加成（保留本体 1 张）。</p>

            <div class="g-card nt-bt-card">
              <div class="nt-bt-info">
                <div class="nt-bt-title">
                  <template v-if="isBreakthroughMax">已达最高突破</template>
                  <template v-else>突破至 ★{{ breakthroughStar + 1 }}</template>
                </div>
                <div v-if="breakthroughPreview && breakthroughPreview.length > 0" class="nt-bt-preview">
                  下一星：{{ breakthroughPreview.map(r => `${r.short}+${r.delta}`).join(' ') }}
                </div>
                <div v-if="!isBreakthroughMax" class="nt-bt-spare">
                  可用重复卡 <b :class="canBreakthroughNow ? 'nt-hint-ok' : 'nt-hint-warn'">{{ spareCards }}</b> / 需 {{ nextBreakthroughCost }}
                </div>
              </div>
              <button
                type="button"
                class="btn-primary nt-bt-btn"
                :disabled="!canBreakthroughNow"
                @click="doBreakthrough"
              >
                <template v-if="isBreakthroughMax">已达最高</template>
                <template v-else>✨ 突破（{{ nextBreakthroughCost }} 张重复卡）</template>
              </button>
            </div>
            <p class="nt-note">突破保留本体 1 张卡不被消耗；加成永久生效并计入综合战力。</p>
          </div>

          <!-- 好感签：里程碑列表（既有全保留） -->
          <div v-else class="nt-pane">
            <div class="nt-mile-head">
              好感里程碑
              <span v-if="claimableCount > 0" class="nt-mile-badge">{{ claimableCount }} 可领</span>
            </div>
            <div
              v-for="m in milestones"
              :key="m.id"
              class="nt-mile"
              :class="{ locked: !m.reached }"
            >
              <div class="nt-mile-mt">
                <b>{{ m.reached ? '🏅' : '🔒' }} {{ m.title }}</b>
                <span>好感 {{ m.threshold }} · 奖励 {{ m.reward }} KP · {{ m.bonusPctText }}</span>
              </div>
              <button
                v-if="m.claimable"
                type="button"
                class="btn-primary nt-mile-claim"
                @click="claimMilestone(m.id)"
              >领取</button>
              <span v-else-if="m.claimed" class="g-chip good">已领</span>
              <span v-else-if="!m.reached" class="nt-hint-mut">未达成</span>
            </div>
            <p class="nt-note">领取里程碑除一次性 KP 外，永久提升五维（累计封顶 +15%）。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 配装弹窗（picker，传养成合成加点保证预览战力口径一致） -->
    <EquipPickerModal
      v-if="selectedCharacter"
      :is-open="pickerOpen"
      :char-id="selectedCharacter.id"
      :equip-slot="pickerSlot"
      :base-stats="baseStats"
      :stat-points="nurturedStatPoints"
      @close="pickerOpen = false"
    />
  </div>
</template>

<style scoped>
/* ============ 外壳共同语言（与 hub 手游语言一致：g-card 质感 / g-chip / g-cta-gold / 令牌色）============ */
.nurture-embed { width: 100%; }
.num { font-variant-numeric: tabular-nums; letter-spacing: -.01em; }

/* 胖卡：面 + 1px 线边 + 面板圆角 + 柔和投影 + 顶部 40% 高光 */
.g-card {
  position: relative; background: rgb(var(--c-surface));
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  box-shadow: var(--sk-shadow-card);
}
.g-card::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 40%; pointer-events: none;
  border-radius: var(--sk-radius-panel) var(--sk-radius-panel) 0 0;
  background: linear-gradient(180deg, rgb(var(--c-elevated) / .5), transparent);
}
.g-eyebrow {
  display: inline-block; font-size: .62rem; font-weight: 900; letter-spacing: .12em;
  text-transform: uppercase; color: rgb(var(--c-accent-2));
}
.g-chip {
  display: inline-flex; align-items: center; gap: .3rem; font-size: .66rem; font-weight: 800;
  padding: .16rem .5rem; border-radius: 999px;
  background: rgb(var(--c-accent-soft)); color: rgb(var(--c-accent-2));
}
.g-chip.gold { background: rgb(var(--c-highlight) / .16); color: rgb(var(--c-highlight)); }
.g-chip.good { background: rgb(var(--c-success) / .16); color: rgb(var(--c-success)); }
.g-chip.mut { background: rgb(var(--c-surface-2)); color: rgb(var(--c-ink-3)); }
/* 金色主 CTA */
.g-cta-gold {
  display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
  font-weight: 800; font-size: .86rem; padding: .55rem 1.2rem; border: 0; cursor: pointer;
  border-radius: var(--sk-radius-control); color: rgb(var(--c-on-accent));
  background: linear-gradient(180deg, rgb(var(--c-highlight)), rgb(var(--c-highlight) / .82));
  box-shadow: 0 3px 0 rgb(var(--c-highlight) / .55), var(--sk-shadow-card);
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
}
.g-cta-gold:hover { filter: brightness(1.05); }
.g-cta-gold:active { transform: translateY(1px); box-shadow: 0 1px 0 rgb(var(--c-highlight) / .55); }

/* 令牌进度条（等级/好感/五维共用） */
.nt-bar {
  width: 100%; height: 8px; border-radius: 999px; overflow: hidden;
  background: rgb(var(--c-surface-2)); border: 1px solid rgb(var(--c-line));
}
.nt-bar i { display: block; height: 100%; border-radius: 999px; transition: width .5s ease; }
.bg-accent { background: rgb(var(--c-accent)); }
.bg-highlight { background: rgb(var(--c-highlight)); }
.bg-danger { background: rgb(var(--c-danger)); }
.bg-success { background: rgb(var(--c-success)); }
.bg-warning { background: rgb(var(--c-warning)); }
.bg-info { background: rgb(var(--c-info)); }
.bg-ink-2 { background: rgb(var(--c-ink-2)); }

.nt-note { margin-top: .55rem; font-size: .72rem; line-height: 1.5; color: rgb(var(--c-ink-3)); }
.nt-note-lead { margin-top: .35rem; margin-bottom: .7rem; color: rgb(var(--c-ink-2)); }
.nt-hint-ok { color: rgb(var(--c-success)); font-weight: 700; }
.nt-hint-warn { color: rgb(var(--c-warning)); font-weight: 700; }
.nt-hint-accent { color: rgb(var(--c-accent)); font-weight: 700; }
.nt-hint-mut { color: rgb(var(--c-ink-3)); }

/* 无角色兜底 */
.nt-empty { text-align: center; padding: 3rem 1rem; color: rgb(var(--c-ink-2)); }
.nt-empty-emoji { font-size: 2.5rem; margin-bottom: .75rem; }

/* ============ box 模式 ============ */
.nt-box { padding: 0; overflow: hidden; }
.nt-box-head {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: .95rem 1rem .55rem;
}
.nt-box-head h2 { font-size: 1.1rem; font-weight: 900; color: rgb(var(--c-ink)); }
.nt-box-grid {
  /* 固定列宽贴合 CharacterAvatar 的 size（其内部按像素裁 sprite，不能拉伸），行内居中平铺 */
  display: grid; grid-template-columns: repeat(auto-fill, 96px); justify-content: center;
  gap: .7rem 1rem; padding: .4rem 1rem 1.1rem; max-height: 62vh; overflow: auto;
}
.nt-cell {
  position: relative; padding: 0; border: 0; background: none; cursor: pointer;
  display: flex; flex-direction: column; gap: .3rem; transition: transform .12s ease;
}
.nt-cell:hover { transform: translateY(-3px); }
.nt-cell-art {
  position: relative; aspect-ratio: 1; border-radius: var(--sk-radius-control); overflow: hidden;
  border: 1px solid rgb(var(--c-line)); box-shadow: var(--sk-shadow-card); background: rgb(var(--c-surface-2));
  display: grid; place-items: center;
}
.nt-cell:hover .nt-cell-art { box-shadow: inset 0 0 0 2px rgb(var(--c-accent)), var(--sk-shadow-card); }
/* CharacterAvatar 内部按 size 像素裁 sprite 正面帧（不可拉伸失配）；去掉自带边框，外层 .nt-cell-art 已描边。
   立绘兜底时按 cover 铺满方格。 */
.nt-cell-avatar { border: 0 !important; border-radius: 0 !important; }
.nt-cell-avatar :deep(.avatar-portrait) { object-position: top; }
/* 稀有度徽章（既有 rarityStyle 渐变；白字属压片白字例外） */
.nt-cell-rr {
  position: absolute; top: 3px; left: 3px; padding: .04rem .34rem; border-radius: 5px;
  font-size: .54rem; font-weight: 900; color: #fff;
}
.nt-cell-lv {
  position: absolute; left: 3px; bottom: 3px; padding: .02rem .3rem; border-radius: 5px;
  font-size: .56rem; font-weight: 900; color: #fff; background: rgb(0 0 0 / .6);
}
.nt-cell-star {
  position: absolute; right: 3px; top: 3px; padding: .02rem .3rem; border-radius: 5px;
  font-size: .56rem; font-weight: 900; color: rgb(var(--c-on-accent)); background: rgb(var(--c-highlight));
}
.nt-cell-dot {
  position: absolute; right: 4px; bottom: 4px; width: 9px; height: 9px; border-radius: 50%;
  background: rgb(var(--c-accent)); box-shadow: 0 0 0 2px rgb(var(--c-surface));
}
.nt-cell-name {
  font-size: .64rem; font-weight: 700; text-align: center; color: rgb(var(--c-ink-2));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ============ detail 模式 ============ */
.nt-detail { display: flex; flex-direction: column; gap: 1rem; }
.nt-detail-head { display: flex; align-items: center; gap: .7rem; }
.nt-back { font-size: .8rem; padding: .35rem .9rem; white-space: nowrap; }
.nt-detail-body {
  display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 1fr); gap: 1.1rem; align-items: start;
}
@media (max-width: 760px) { .nt-detail-body { grid-template-columns: 1fr; } }

/* 左：立绘 hero */
.nt-hero-col { display: flex; flex-direction: column; gap: .8rem; }
.nt-hero { position: relative; aspect-ratio: 3 / 4; overflow: hidden; }
.nt-hero::before { display: none; }
.nt-hero-img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.nt-hero-rr {
  position: absolute; top: 8px; left: 8px; padding: .06rem .42rem; border-radius: 6px;
  font-size: .62rem; font-weight: 900; color: #fff; z-index: 2;
}
.nt-hero-id {
  position: absolute; inset: auto 0 0 0; padding: 1.6rem .9rem .8rem;
  background: linear-gradient(transparent, rgb(0 0 0 / .62)); text-align: left; z-index: 2;
}
.nt-hero-id h3 { font-size: 1.15rem; font-weight: 900; color: #fff; }
.nt-hero-sub { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; margin-top: .25rem; font-size: .7rem; }
.nt-hero-sub > span:first-child { font-weight: 800; }
.nt-hero-sub :is(.text-accent, .text-danger, .text-highlight, .text-info, .text-success, .text-warning, .text-ink-2) {
  /* 好感语义色本为浅底文字色；hero 压深渐变底，为可读性提亮为白（压片白字例外） */
  color: #fff;
}
.nt-hero-star { color: rgb(var(--c-highlight)); font-weight: 800; }

/* 语义好感色（tab 页非压底处正常使用令牌） */
.text-accent { color: rgb(var(--c-accent)); }
.text-danger { color: rgb(var(--c-danger)); }
.text-highlight { color: rgb(var(--c-highlight)); }
.text-info { color: rgb(var(--c-info)); }
.text-success { color: rgb(var(--c-success)); }
.text-warning { color: rgb(var(--c-warning)); }
.text-ink-2 { color: rgb(var(--c-ink-2)); }

/* 等级/好感常驻条 */
.nt-prog { display: flex; flex-direction: column; gap: .55rem; }
.nt-prog-row { display: flex; flex-direction: column; gap: .25rem; }
.nt-prog-lbl { display: flex; align-items: center; justify-content: space-between; gap: .5rem; font-size: .72rem; font-weight: 800; }
.nt-prog-lbl > span:first-child { color: rgb(var(--c-ink)); }
.nt-prog-v { color: rgb(var(--c-ink-3)); font-weight: 700; }

/* 补习/互动按钮组 */
.nt-actbtns { display: flex; flex-wrap: wrap; gap: .45rem; }
.nt-act { font-size: .74rem; padding: .4rem .7rem; flex: 1 1 auto; min-width: fit-content; }
.nt-act:disabled { opacity: .5; cursor: not-allowed; }
.nt-act-hints { display: flex; flex-wrap: wrap; gap: .6rem; font-size: .72rem; min-height: .9rem; }
.nt-overflow { font-size: .72rem; padding: .35rem .8rem; align-self: flex-start; }

/* 右：tabs */
.nt-tab-col { min-width: 0; }
.nt-tabs {
  display: flex; gap: .3rem; margin-bottom: .8rem; padding: .3rem;
  background: rgb(var(--c-surface-2) / .6); border-radius: var(--sk-radius-control);
}
.nt-tabs button {
  position: relative; flex: 1; padding: .45rem .3rem; border: 0; background: none; cursor: pointer;
  border-radius: calc(var(--sk-radius-control) - .15rem); font-size: .78rem; font-weight: 800;
  color: rgb(var(--c-ink-2)); transition: background .15s, color .15s;
}
.nt-tabs button.on { background: rgb(var(--c-surface)); color: rgb(var(--c-accent-2)); box-shadow: var(--sk-shadow-card); }
.nt-tab-badge {
  display: inline-grid; place-items: center; margin-left: .2rem; min-width: 1.05rem; height: 1.05rem;
  padding: 0 .25rem; border-radius: 999px; font-size: .6rem; font-weight: 900;
  color: rgb(var(--c-on-accent)); background: rgb(var(--c-accent));
}
.nt-pane { animation: ntFade .25s ease; }
@keyframes ntFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* 技能 */
.nt-skl {
  display: flex; gap: .6rem; align-items: flex-start; margin-bottom: .55rem;
  padding: .65rem; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / .5); border: 1px solid rgb(var(--c-line));
}
.nt-skl-ic {
  flex: 0 0 auto; width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center;
  font-size: 1rem; font-weight: 800; color: rgb(var(--c-on-accent));
  background: linear-gradient(135deg, rgb(var(--c-accent-soft)), rgb(var(--c-accent)));
}
.nt-skl-ic.ult { background: linear-gradient(135deg, rgb(var(--c-highlight) / .7), rgb(var(--c-highlight))); }
.nt-skl-ic.pas { background: linear-gradient(135deg, rgb(var(--c-info) / .7), rgb(var(--c-info))); }
.nt-skl-body { min-width: 0; }
.nt-skl-body b { font-size: .84rem; font-weight: 800; color: rgb(var(--c-ink)); }
.nt-skl-kd { font-size: .62rem; font-weight: 700; font-style: normal; color: rgb(var(--c-ink-3)); }
.nt-skl-body p { margin-top: .2rem; font-size: .72rem; line-height: 1.5; color: rgb(var(--c-ink-2)); }
.nt-placeholder {
  padding: 1.4rem 1rem; border: 1px dashed rgb(var(--c-line)); border-radius: var(--sk-radius-control);
  text-align: center; font-size: .78rem; color: rgb(var(--c-ink-3));
}

/* 属性 */
.nt-stat { margin-bottom: .75rem; }
.nt-stat-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .3rem; font-size: .76rem; }
.nt-stat-lbl { font-weight: 800; color: rgb(var(--c-ink-2)); }
.nt-stat-val { display: inline-flex; align-items: center; gap: .35rem; }
.nt-stat-val > .num { font-weight: 800; color: rgb(var(--c-ink)); }
.nt-stat-val small { font-size: .66rem; color: rgb(var(--c-ink-3)); }
.nt-stat-pt { color: rgb(var(--c-success)); }
.nt-stat-eq { color: rgb(var(--c-highlight)); }
.nt-stat-max { font-size: .66rem; font-weight: 800; color: rgb(var(--c-accent)); }
.nt-stat-gain { font-size: .7rem; font-weight: 800; color: rgb(var(--c-success)); }

/* 装备 */
.nt-eq-slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem; }
.nt-eq-slot-wrap { position: relative; }
.nt-eq-slot {
  width: 100%; aspect-ratio: 1; padding: .4rem; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .15rem; text-align: center;
  border: 1.5px dashed rgb(var(--c-line)); border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / .6); transition: border-color .15s, box-shadow .15s;
}
.nt-eq-slot:hover { border-color: rgb(var(--c-accent) / .7); }
.nt-eq-slot.on { border-style: solid; border-color: rgb(var(--c-accent) / .6); }
.nt-eq-rr { padding: .04rem .34rem; border-radius: 5px; font-size: .54rem; font-weight: 900; color: #fff; margin-bottom: .1rem; }
.nt-eq-name { font-size: .68rem; font-weight: 700; line-height: 1.2; color: rgb(var(--c-ink)); }
.nt-eq-bonus { font-size: .56rem; line-height: 1.2; color: rgb(var(--c-ink-3)); }
.nt-eq-icon { font-size: 1.4rem; opacity: .5; }
.nt-eq-sl { font-size: .66rem; font-weight: 700; color: rgb(var(--c-ink-2)); }
.nt-eq-hint { font-size: .56rem; color: rgb(var(--c-ink-3)); }
.nt-eq-off {
  position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
  display: grid; place-items: center; font-size: .68rem;
  border: 1px solid rgb(var(--c-line)); background: rgb(var(--c-surface-2)); color: rgb(var(--c-ink-2));
  box-shadow: var(--sk-shadow-card); transition: color .15s;
}
.nt-eq-off:hover { color: rgb(var(--c-danger)); }
.nt-eq-cta { margin-top: .7rem; }
.nt-eq-auto { width: 100%; }
.nt-eq-toast {
  margin-top: .45rem; padding: .35rem .6rem; border-radius: var(--sk-radius-control);
  font-size: .72rem; font-weight: 700; text-align: center;
  color: rgb(var(--c-success)); background: rgb(var(--c-success) / .12); border: 1px solid rgb(var(--c-success) / .3);
}
.nt-set { margin-top: .8rem; padding-top: .7rem; border-top: 1px solid rgb(var(--c-line)); }
.nt-set-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .45rem; font-size: .72rem; font-weight: 800; color: rgb(var(--c-ink-2)); }
.nt-set-delta { font-size: .7rem; font-weight: 800; color: rgb(var(--c-highlight)); }
.nt-set-chips { display: flex; flex-wrap: wrap; gap: .4rem; }
.nt-inv { margin-top: .9rem; }

/* 突破 */
.nt-stars { display: flex; align-items: center; gap: .1rem; font-size: 1.5rem; letter-spacing: 2px; }
.nt-stars .on { color: rgb(var(--c-highlight)); }
.nt-stars .off { color: rgb(var(--c-line-2)); }
.nt-stars-count { margin-left: .5rem; font-size: .72rem; font-weight: 700; letter-spacing: normal; color: rgb(var(--c-ink-2)); }
.nt-bt-card { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .85rem 1rem; }
.nt-bt-info { min-width: 0; }
.nt-bt-title { font-size: .84rem; font-weight: 800; color: rgb(var(--c-ink)); }
.nt-bt-preview { margin-top: .2rem; font-size: .68rem; color: rgb(var(--c-success)); }
.nt-bt-spare { margin-top: .2rem; font-size: .68rem; color: rgb(var(--c-ink-2)); }
.nt-bt-spare b { font-weight: 800; }
.nt-bt-btn { flex: 0 0 auto; font-size: .78rem; padding: .45rem .9rem; }
.nt-bt-btn:disabled { opacity: .5; cursor: not-allowed; }

/* 好感里程碑 */
.nt-mile-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .6rem; font-size: .84rem; font-weight: 800; color: rgb(var(--c-ink)); }
.nt-mile-badge {
  display: inline-grid; place-items: center; padding: .06rem .45rem; border-radius: 999px;
  font-size: .6rem; font-weight: 900; color: rgb(var(--c-on-accent)); background: rgb(var(--c-accent));
}
.nt-mile {
  display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-bottom: .45rem;
  padding: .6rem .7rem; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / .5); border: 1px solid rgb(var(--c-line));
}
.nt-mile.locked { opacity: .55; }
.nt-mile-mt { min-width: 0; }
.nt-mile-mt b { font-size: .78rem; font-weight: 800; color: rgb(var(--c-ink)); }
.nt-mile-mt span { display: block; margin-top: .1rem; font-size: .64rem; color: rgb(var(--c-ink-3)); }
.nt-mile-claim { flex: 0 0 auto; font-size: .72rem; padding: .3rem .8rem; }

/* 一键装备飘字过渡 */
.nt-fade-enter-active, .nt-fade-leave-active { transition: opacity .3s ease, transform .3s ease; }
.nt-fade-enter-from { opacity: 0; transform: translateY(4px); }
.nt-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* 升级随机加点的「+N」飘字：浮现 → 上升淡出，与 lastGain 的 1.8s 清除同步 */
@keyframes statGainPop {
  0% { opacity: 0; transform: translateY(4px); }
  25% { opacity: 1; transform: translateY(0); }
  75% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-6px); }
}
.stat-gain-pop { display: inline-block; animation: statGainPop 1.8s ease-out forwards; }
</style>
