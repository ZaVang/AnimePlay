<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import HomesteadView from './HomesteadView.vue';
import NurtureView from './NurtureView.vue';
import SquadBattleView from './SquadBattleView.vue';
import {
  SQUAD_MEMBER_COUNT,
  calculateBattlePower,
  calculateTowerBattleRewards,
  createSeededRng,
  generateBattleStats,
  generateTowerFloorEnemies,
  validateTowerSquadMembers,
  type BattleStats,
} from '@/engine';
import { CHARACTER_IMAGE_POOL } from '@/utils/imageUtils';
import { getSquadSkillKitForCharacter, isSquadSkillKitReady } from '@/data/squadSkillKits';
import { getEquipmentDef, SLOT_META, SLOT_ORDER, formatBonus, type EquipmentSlot } from '@/config/equipment';
import { STAT_META, bondTitleFor } from '@/config/nurture';
import type { CharacterCard } from '@/types/card';

type HubTab = 'home' | 'characters' | 'squad' | 'explore' | 'battle';

interface HubTabItem {
  key: HubTab;
  label: string;
  desc: string;
}

const tabs: HubTabItem[] = [
  { key: 'home', label: '家园', desc: '入住与离线收益' },
  { key: 'characters', label: '角色', desc: '五维/装备/技能' },
  { key: 'squad', label: '编队', desc: '5 人站位与战力' },
  { key: 'explore', label: '探索', desc: '塔层/敌人/奖励' },
  { key: 'battle', label: '战斗', desc: '横板半自动' },
];

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const equipmentStore = useEquipmentStore();

const selectedCharacterId = ref<number | null>(null);
const selectedSquadId = ref<number | null>(null);

function normalizeTab(value: unknown): HubTab {
  return tabs.some(tab => tab.key === value) ? value as HubTab : 'home';
}

const activeTab = computed(() => normalizeTab(route.query.tab));

function switchTab(tab: HubTab) {
  router.replace({
    path: '/homestead',
    query: tab === 'home' ? {} : { tab },
  });
}

const ownedCharacters = computed(() =>
  Array.from(userStore.characterCollection.entries())
    .map(([id]) => gameDataStore.getCharacterCardById(id))
    .filter((card): card is CharacterCard => card != null)
    .sort((a, b) => rarityWeight(b.rarity) - rarityWeight(a.rarity)),
);

watch(ownedCharacters, characters => {
  if (selectedCharacterId.value == null && characters.length > 0) {
    selectedCharacterId.value = characters[0].id;
  }
}, { immediate: true });

const selectedCharacter = computed(() => {
  if (selectedCharacterId.value == null) return ownedCharacters.value[0] ?? null;
  return ownedCharacters.value.find(card => card.id === selectedCharacterId.value) ?? ownedCharacters.value[0] ?? null;
});

const selectedNurture = computed(() => selectedCharacter.value ? userStore.getNurtureData(selectedCharacter.value.id) : null);

const selectedEquipBonus = computed<BattleStats>(() => {
  const character = selectedCharacter.value;
  if (!character) return emptyStats();
  void equipmentStore.equipped;
  return equipmentStore.resolveEquipBonus(character.id);
});

const selectedFinalStats = computed<BattleStats>(() => {
  const character = selectedCharacter.value;
  const nurture = selectedNurture.value;
  if (!character || !nurture) return emptyStats();
  return generateBattleStats(baseStatsOf(character), nurture.statPoints, selectedEquipBonus.value);
});

const selectedStatRows = computed(() => {
  const character = selectedCharacter.value;
  const nurture = selectedNurture.value;
  if (!character || !nurture) return [];
  const base = baseStatsOf(character);
  const equip = selectedEquipBonus.value;
  return STAT_META.map(meta => ({
    key: meta.key,
    label: meta.label,
    base: base[meta.key],
    point: nurture.statPoints[meta.key],
    equip: equip[meta.key],
    total: selectedFinalStats.value[meta.key],
  }));
});

const selectedSkillRows = computed(() => {
  const kit = getSquadSkillKitForCharacter(selectedCharacter.value);
  if (!kit) return [];
  return [
    kit.normalAttack,
    kit.skill1,
    kit.skill2,
    kit.passive,
    kit.ultimate,
  ].map(skill => ({ name: skill.name, desc: skill.description }));
});

const selectedEquipRows = computed(() => {
  const character = selectedCharacter.value;
  if (!character) return [];
  void equipmentStore.equipped;
  const equipped = equipmentStore.getEquipped(character.id);
  return SLOT_ORDER.map(slot => {
    const uid = equipped[slot];
    const item = uid ? equipmentStore.getItem(uid) : null;
    const def = item ? getEquipmentDef(item.defId) : undefined;
    return {
      slot,
      label: SLOT_META[slot].label,
      icon: SLOT_META[slot].icon,
      name: def?.name ?? '未装备',
      bonus: def ? formatBonus(def.bonus) : '无加成',
      rarity: def?.rarity ?? '',
    };
  });
});

watch(() => userStore.presetSquads, squads => {
  if (selectedSquadId.value == null && squads.length > 0) selectedSquadId.value = squads[0].id;
}, { immediate: true, deep: true });

const selectedSquad = computed(() => {
  return userStore.presetSquads.find(squad => squad.id === selectedSquadId.value) ?? userStore.presetSquads[0] ?? null;
});

function squadValidation(squadId: number) {
  return validateTowerSquadMembers({
    members: userStore.getSquadMembers(squadId),
    getCharacter: id => gameDataStore.getCharacterCardById(id),
    isOwned: id => userStore.getCharacterCardCount(id) > 0,
    hasCompleteSkillKit: isSquadSkillKitReady,
  });
}

function memberPower(character: CharacterCard): number {
  const stats = generateBattleStats(
    baseStatsOf(character),
    userStore.getNurtureData(character.id).statPoints,
    equipmentStore.resolveEquipBonus(character.id),
  );
  return calculateBattlePower(stats);
}

function squadPower(squadId: number): number {
  const validation = squadValidation(squadId);
  return validation.characters.reduce((sum, character) => sum + memberPower(character), 0);
}

const selectedSquadSlots = computed(() => {
  const squad = selectedSquad.value;
  if (!squad) return [];
  const validation = squadValidation(squad.id);
  const members = userStore.getSquadMembers(squad.id);
  return Array.from({ length: SQUAD_MEMBER_COUNT }, (_, index) => {
    const character = members[index] ? gameDataStore.getCharacterCardById(members[index]!) : null;
    const kit = getSquadSkillKitForCharacter(character);
    return {
      position: index + 1,
      role: positionLabel(index),
      character,
      ok: validation.slots[index]?.ok ?? false,
      issue: validation.slots[index]?.message ?? '空位',
      power: character ? memberPower(character) : 0,
      skills: kit ? [kit.skill1.name, kit.skill2.name, kit.ultimate.name] : [],
    };
  });
});

const currentFloor = computed(() => userStore.getCurrentChallengeFloor());
const enemyPreview = computed(() => {
  if (gameDataStore.allCharacterCards.length === 0) return null;
  return generateTowerFloorEnemies(
    gameDataStore.allCharacterCards.filter(isSquadSkillKitReady),
    currentFloor.value,
    createSeededRng(currentFloor.value * 7919 + 17),
    CHARACTER_IMAGE_POOL,
  );
});

const rewardPreview = computed(() => calculateTowerBattleRewards({
  floor: currentFloor.value,
  progressed: true,
  outcome: { winner: 'player', reason: 'victory' },
  equipmentDrop: null,
}));

function emptyStats(): BattleStats {
  return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
}

function baseStatsOf(character: CharacterCard): BattleStats {
  return character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };
}

function rarityWeight(rarity: string): number {
  return ({ UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 } as Record<string, number>)[rarity] ?? 0;
}

function positionLabel(index: number): string {
  return ['前排', '前排', '中排', '中排', '后排'][index] ?? '后排';
}

function slotTone(slot: EquipmentSlot): string {
  return slot === 'weapon' ? '进攻' : slot === 'armor' ? '防护' : '支援';
}
</script>

<template>
  <div class="base-hub">
    <header class="hub-hero">
      <div>
        <span class="hub-eyebrow">BASE HUB</span>
        <h1>基地 hub</h1>
        <p>从家园收益、角色养成、5 人编队，到探索挑战塔与横板战斗结算，都在同一个基地入口完成。</p>
      </div>
      <div class="hub-loop">
        <span>家园</span>
        <span>角色</span>
        <span>编队</span>
        <span>探索</span>
        <span>战斗</span>
      </div>
    </header>

    <nav class="hub-tabs" aria-label="基地面板">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="hub-tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <strong>{{ tab.label }}</strong>
        <span>{{ tab.desc }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'home'" class="hub-panel flush-panel">
      <HomesteadView />
    </section>

    <section v-else-if="activeTab === 'characters'" class="hub-panel">
      <div class="panel-heading">
        <div>
          <h2>角色面板</h2>
          <p>五维、装备、等级好感与小队战技能一并查看；下方保留原养成页的完整操作。</p>
        </div>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后查看角色养成。</div>
      <div v-else-if="ownedCharacters.length === 0" class="hub-empty">暂无角色，先去抽卡获得可养成角色。</div>
      <div v-else class="character-grid">
        <aside class="character-list">
          <button
            v-for="character in ownedCharacters.slice(0, 18)"
            :key="character.id"
            type="button"
            class="character-chip"
            :class="{ active: selectedCharacter?.id === character.id }"
            @click="selectedCharacterId = character.id"
          >
            <img :src="character.image_path" :alt="character.name" loading="lazy" decoding="async">
            <span>{{ character.name }}</span>
            <small>{{ character.rarity }} · Lv.{{ userStore.getNurtureData(character.id).level }}</small>
          </button>
        </aside>

        <article v-if="selectedCharacter && selectedNurture" class="character-summary">
          <div class="summary-top">
            <img :src="selectedCharacter.image_path" :alt="selectedCharacter.name" loading="lazy" decoding="async">
            <div>
              <span class="summary-kicker">{{ selectedCharacter.rarity }} · {{ bondTitleFor(selectedNurture.affection) }}</span>
              <h3>{{ selectedCharacter.name }}</h3>
              <p>Lv.{{ selectedNurture.level }} · 好感 {{ selectedNurture.affection }} · 战力 {{ calculateBattlePower(selectedFinalStats) }}</p>
            </div>
          </div>

          <div class="stat-mini-grid">
            <div v-for="row in selectedStatRows" :key="row.key" class="stat-mini">
              <span>{{ row.label }}</span>
              <strong>{{ row.total }}</strong>
              <small>基础 {{ row.base }} / 加点 {{ row.point }} / 装备 {{ row.equip }}</small>
            </div>
          </div>

          <div class="equip-mini-grid">
            <div v-for="row in selectedEquipRows" :key="row.slot" class="equip-mini">
              <span>{{ row.icon }} {{ row.label }} · {{ slotTone(row.slot) }}</span>
              <strong>{{ row.name }}</strong>
              <small>{{ row.rarity ? `${row.rarity} · ` : '' }}{{ row.bonus }}</small>
            </div>
          </div>

          <div class="skill-list">
            <h4>小队战技能</h4>
            <div v-if="selectedSkillRows.length === 0" class="skill-empty">该角色暂不可进入挑战塔。</div>
            <div v-for="skill in selectedSkillRows" :key="skill.name" class="skill-row">
              <strong>{{ skill.name }}</strong>
              <span>{{ skill.desc }}</span>
            </div>
          </div>
        </article>
      </div>

      <div class="embedded-view">
        <NurtureView />
      </div>
    </section>

    <section v-else-if="activeTab === 'squad'" class="hub-panel">
      <div class="panel-heading">
        <div>
          <h2>编队面板</h2>
          <p>挑战塔要求 5 名已拥有且技能完整的 HR/UR 角色；站位、战力与技能摘要在开战前可见。</p>
        </div>
        <button class="btn-primary" type="button" @click="switchTab('explore')">去探索</button>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后配置挑战塔小队。</div>
      <div v-else class="squad-layout">
        <aside class="squad-picker">
          <button
            v-for="squad in userStore.presetSquads"
            :key="squad.id"
            type="button"
            class="squad-select"
            :class="{ active: selectedSquad?.id === squad.id }"
            @click="selectedSquadId = squad.id"
          >
            <span>{{ squad.name }}</span>
            <strong>{{ squadPower(squad.id) }}</strong>
            <small>{{ squadValidation(squad.id).characters.length }}/{{ SQUAD_MEMBER_COUNT }} · {{ squadValidation(squad.id).ok ? '可挑战' : '需补齐' }}</small>
          </button>
        </aside>

        <div class="formation-board">
          <div
            v-for="slot in selectedSquadSlots"
            :key="slot.position"
            class="formation-slot"
            :class="{ ready: slot.ok }"
          >
            <span class="slot-index">{{ slot.position }}</span>
            <span class="slot-role">{{ slot.role }}</span>
            <template v-if="slot.character">
              <img :src="slot.character.image_path" :alt="slot.character.name" loading="lazy" decoding="async">
              <strong>{{ slot.character.name }}</strong>
              <small>{{ slot.character.rarity }} · 战力 {{ slot.power }}</small>
              <em>{{ slot.skills.length ? slot.skills.join(' / ') : slot.issue }}</em>
            </template>
            <template v-else>
              <div class="empty-slot">+</div>
              <strong>空位</strong>
              <small>{{ slot.issue }}</small>
            </template>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'explore'" class="hub-panel">
      <div class="panel-heading">
        <div>
          <h2>探索面板</h2>
          <p>预览当前挑战塔楼层、敌方阵容和通关奖励；确认后进入横板半自动战斗。</p>
        </div>
        <button class="btn-primary" type="button" @click="switchTab('battle')">进入战斗</button>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后进入挑战塔。</div>
      <div v-else class="explore-grid">
        <article class="tower-card">
          <span class="summary-kicker">当前塔层</span>
          <strong>第 {{ currentFloor }} 层</strong>
          <small>历史最高 {{ userStore.towerProgress.maxFloor }} 层 · 每层通过后解锁下一层</small>
        </article>

        <article class="tower-card">
          <span class="summary-kicker">奖励预览</span>
          <strong>经验 +{{ rewardPreview.characterExp }} / KP +{{ rewardPreview.knowledgePoints }}</strong>
          <small>胜利并推进楼层时，参战角色获得经验，并有装备掉落机会。</small>
        </article>

        <article v-if="enemyPreview" class="enemy-preview">
          <div class="enemy-heading">
            <div>
              <span class="summary-kicker">敌方阵容</span>
              <h3>{{ enemyPreview.name }}</h3>
            </div>
            <strong>{{ enemyPreview.floorPower }}</strong>
          </div>
          <p>{{ enemyPreview.description }} · {{ enemyPreview.difficulty }}</p>
          <div class="enemy-lineup">
            <div v-for="enemy in enemyPreview.members" :key="enemy.id" class="enemy-card">
              <img :src="enemy.image_path" :alt="enemy.name" loading="lazy" decoding="async">
              <span>{{ enemy.name }}</span>
              <small>{{ enemy.rarity }}</small>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="hub-panel flush-panel battle-panel">
      <div class="battle-return">
        <button class="btn-secondary" type="button" @click="switchTab('explore')">返回探索预览</button>
        <span>战斗结算后，经验、装备和知识点会回流到角色/装备/基地循环。</span>
      </div>
      <SquadBattleView />
    </section>
  </div>
</template>

<style scoped>
.base-hub { display: flex; flex-direction: column; gap: 1rem; }
.hub-hero {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem;
  padding: 1.2rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: linear-gradient(135deg, rgb(var(--c-surface)), rgb(var(--c-accent-soft) / .65));
}
.hub-eyebrow, .summary-kicker { display: block; font-size: .72rem; font-weight: 800; color: rgb(var(--c-accent)); }
.hub-hero h1 { margin: .1rem 0; font-size: 2rem; font-weight: 800; color: rgb(var(--c-ink)); }
.hub-hero p { max-width: 760px; color: rgb(var(--c-ink-2)); font-size: .95rem; }
.hub-loop { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .4rem; }
.hub-loop span {
  padding: .35rem .55rem; border: 1px solid rgb(var(--c-line)); border-radius: 6px;
  background: rgb(var(--c-surface) / .72); color: rgb(var(--c-ink-2)); font-size: .78rem; font-weight: 700;
}
.hub-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .55rem; }
.hub-tab {
  min-height: 76px; padding: .75rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface)); text-align: left; transition: border-color .15s, box-shadow .15s, transform .15s;
}
.hub-tab:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); }
.hub-tab.active { border-color: rgb(var(--c-accent)); box-shadow: inset 0 0 0 1px rgb(var(--c-accent)); background: rgb(var(--c-accent-soft) / .7); }
.hub-tab strong { display: block; color: rgb(var(--c-ink)); font-size: .98rem; }
.hub-tab span { display: block; margin-top: .2rem; color: rgb(var(--c-ink-3)); font-size: .74rem; line-height: 1.3; }
.hub-panel {
  padding: 1rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface) / .72);
}
.flush-panel { padding: 0; border: 0; background: transparent; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.panel-heading h2 { font-size: 1.35rem; font-weight: 800; color: rgb(var(--c-ink)); }
.panel-heading p { color: rgb(var(--c-ink-2)); font-size: .9rem; }
.hub-empty { padding: 2.5rem 1rem; text-align: center; color: rgb(var(--c-ink-2)); }
.character-grid { display: grid; grid-template-columns: minmax(220px, 300px) minmax(0, 1fr); gap: 1rem; }
.character-list { display: grid; gap: .5rem; max-height: 520px; overflow: auto; padding-right: .25rem; }
.character-chip {
  display: grid; grid-template-columns: 46px minmax(0, 1fr); column-gap: .65rem; align-items: center;
  min-height: 58px; padding: .45rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface-2)); text-align: left;
}
.character-chip.active { border-color: rgb(var(--c-accent)); background: rgb(var(--c-accent-soft) / .7); }
.character-chip img { grid-row: span 2; width: 46px; height: 46px; border-radius: 7px; object-fit: cover; object-position: top; }
.character-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgb(var(--c-ink)); font-weight: 700; font-size: .86rem; }
.character-chip small { color: rgb(var(--c-ink-3)); font-size: .72rem; }
.character-summary, .enemy-preview, .tower-card {
  border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface)); padding: 1rem;
}
.summary-top { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
.summary-top img { width: 84px; height: 112px; border-radius: 8px; object-fit: cover; object-position: top; }
.summary-top h3 { font-size: 1.35rem; font-weight: 800; color: rgb(var(--c-ink)); }
.summary-top p { color: rgb(var(--c-ink-2)); font-size: .86rem; }
.stat-mini-grid, .equip-mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .6rem; margin-bottom: 1rem; }
.stat-mini, .equip-mini, .skill-row {
  padding: .7rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface-2) / .78);
}
.stat-mini span, .equip-mini span { display: block; color: rgb(var(--c-ink-2)); font-size: .72rem; }
.stat-mini strong, .equip-mini strong { display: block; color: rgb(var(--c-ink)); font-size: .95rem; }
.stat-mini small, .equip-mini small { display: block; color: rgb(var(--c-ink-3)); font-size: .68rem; line-height: 1.35; }
.skill-list h4 { margin-bottom: .5rem; color: rgb(var(--c-ink)); font-weight: 800; }
.skill-list { display: grid; gap: .45rem; }
.skill-row strong { display: block; color: rgb(var(--c-ink)); font-size: .82rem; }
.skill-row span, .skill-empty { color: rgb(var(--c-ink-2)); font-size: .76rem; line-height: 1.4; }
.embedded-view { margin-top: 1rem; border-top: 1px solid rgb(var(--c-line)); }
.squad-layout { display: grid; grid-template-columns: minmax(200px, 260px) minmax(0, 1fr); gap: 1rem; }
.squad-picker { display: grid; align-content: start; gap: .55rem; }
.squad-select {
  min-height: 86px; padding: .75rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface)); text-align: left;
}
.squad-select.active { border-color: rgb(var(--c-accent)); box-shadow: inset 0 0 0 1px rgb(var(--c-accent)); }
.squad-select span, .squad-select strong, .squad-select small { display: block; }
.squad-select span { color: rgb(var(--c-ink)); font-weight: 800; }
.squad-select strong { color: rgb(var(--c-highlight)); font-size: 1.35rem; }
.squad-select small { color: rgb(var(--c-ink-3)); }
.formation-board { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: .7rem; }
.formation-slot {
  position: relative; min-height: 270px; padding: .75rem; border: 1px dashed rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface-2) / .72); overflow: hidden;
}
.formation-slot.ready { border-style: solid; border-color: rgb(var(--c-success)); }
.slot-index, .slot-role { position: absolute; top: .45rem; z-index: 1; font-size: .7rem; font-weight: 800; }
.slot-index { left: .45rem; color: rgb(var(--c-accent)); }
.slot-role { right: .45rem; color: rgb(var(--c-ink-3)); }
.formation-slot img { width: 100%; height: 128px; margin-top: .8rem; border-radius: 7px; object-fit: cover; object-position: top; }
.formation-slot strong, .formation-slot small, .formation-slot em { display: block; }
.formation-slot strong { margin-top: .5rem; color: rgb(var(--c-ink)); font-size: .9rem; }
.formation-slot small { color: rgb(var(--c-ink-2)); font-size: .75rem; }
.formation-slot em { margin-top: .35rem; color: rgb(var(--c-accent)); font-size: .7rem; line-height: 1.35; font-style: normal; }
.empty-slot { display: grid; place-items: center; height: 128px; margin-top: .8rem; border: 1px dashed rgb(var(--c-line)); border-radius: 7px; color: rgb(var(--c-ink-3)); font-size: 2rem; }
.explore-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.tower-card strong { display: block; margin: .2rem 0; color: rgb(var(--c-ink)); font-size: 1.6rem; }
.tower-card small { color: rgb(var(--c-ink-2)); }
.enemy-preview { grid-column: 1 / -1; }
.enemy-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.enemy-heading h3 { color: rgb(var(--c-ink)); font-size: 1.25rem; font-weight: 800; }
.enemy-heading strong { color: rgb(var(--c-highlight)); font-size: 1.4rem; }
.enemy-preview p { margin: .35rem 0 .85rem; color: rgb(var(--c-ink-2)); font-size: .88rem; }
.enemy-lineup { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); gap: .65rem; }
.enemy-card { padding: .55rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface-2)); }
.enemy-card img { width: 100%; height: 92px; border-radius: 6px; object-fit: cover; object-position: top; }
.enemy-card span { display: block; margin-top: .35rem; color: rgb(var(--c-ink)); font-weight: 700; font-size: .78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.enemy-card small { color: rgb(var(--c-ink-3)); }
.battle-return {
  display: flex; align-items: center; gap: .75rem; margin-bottom: .75rem; padding: .75rem;
  border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface));
}
.battle-return span { color: rgb(var(--c-ink-2)); font-size: .85rem; }
@media (max-width: 1180px) {
  .formation-board, .enemy-lineup { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
}
@media (max-width: 860px) {
  .hub-hero, .panel-heading, .battle-return { flex-direction: column; align-items: stretch; }
  .hub-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .character-grid, .squad-layout, .explore-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .hub-tabs { grid-template-columns: 1fr; }
  .hub-panel { padding: .75rem; }
  .summary-top { align-items: flex-start; }
  .summary-top img { width: 72px; height: 96px; }
}
</style>
