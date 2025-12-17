/**
 * 检查技能文件中调用的外部方法是否已定义
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 收集所有方法调用
const methodCalls = new Set();
const skillsDir = join(rootDir, 'src/skills/characters');
const files = readdirSync(skillsDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const content = readFileSync(join(skillsDir, file), 'utf-8');

  // 匹配 persistentSystem.xxx()
  const persistentMatches = content.matchAll(/persistentSystem\.(\w+)\(/g);
  for (const match of persistentMatches) {
    methodCalls.add(`PersistentEffectSystem.${match[1]}`);
  }

  // 匹配 interactionSystem.xxx()
  const interactionMatches = content.matchAll(/interactionSystem\.(\w+)\(/g);
  for (const match of interactionMatches) {
    methodCalls.add(`InteractionSystem.${match[1]}`);
  }

  // 匹配 helpers.xxx()
  const helperMatches = content.matchAll(/helpers\.(\w+)\(/g);
  for (const match of helperMatches) {
    methodCalls.add(`helpers.${match[1]}`);
  }

  // 匹配 helpers.playerStore.xxx()
  const playerStoreMatches = content.matchAll(/helpers\.playerStore\.(\w+)\(/g);
  for (const match of playerStoreMatches) {
    methodCalls.add(`helpers.playerStore.${match[1]}`);
  }

  // 匹配 helpers.gameStore.xxx()
  const gameStoreMatches = content.matchAll(/helpers\.gameStore\.(\w+)\(/g);
  for (const match of gameStoreMatches) {
    methodCalls.add(`helpers.gameStore.${match[1]}`);
  }

  // 匹配 helpers.historyStore.xxx()
  const historyStoreMatches = content.matchAll(/helpers\.historyStore\.(\w+)\(/g);
  for (const match of historyStoreMatches) {
    methodCalls.add(`helpers.historyStore.${match[1]}`);
  }
});

// 分类整理
const categories = {
  'PersistentEffectSystem': [],
  'InteractionSystem': [],
  'helpers (utils)': [],
  'helpers.playerStore': [],
  'helpers.gameStore': [],
  'helpers.historyStore': []
};

for (const call of methodCalls) {
  if (call.startsWith('PersistentEffectSystem.')) {
    categories['PersistentEffectSystem'].push(call.replace('PersistentEffectSystem.', ''));
  } else if (call.startsWith('InteractionSystem.')) {
    categories['InteractionSystem'].push(call.replace('InteractionSystem.', ''));
  } else if (call.startsWith('helpers.playerStore.')) {
    categories['helpers.playerStore'].push(call.replace('helpers.playerStore.', ''));
  } else if (call.startsWith('helpers.gameStore.')) {
    categories['helpers.gameStore'].push(call.replace('helpers.gameStore.', ''));
  } else if (call.startsWith('helpers.historyStore.')) {
    categories['helpers.historyStore'].push(call.replace('helpers.historyStore.', ''));
  } else if (call.startsWith('helpers.')) {
    categories['helpers (utils)'].push(call.replace('helpers.', ''));
  }
}

// 输出结果
console.log('\n=== 技能文件中调用的外部方法 ===\n');

for (const [category, methods] of Object.entries(categories)) {
  if (methods.length > 0) {
    console.log(`\n📦 ${category}:`);
    methods.sort().forEach(method => {
      console.log(`   - ${method}()`);
    });
  }
}

// 检查已知的方法定义
const knownPersistentMethods = [
  'addEffect', 'addTemporaryBonus', 'addCardTypeCostReduction',
  'addCardTypeStrengthBonus', 'addSkillDisable', 'addForcedAction',
  'getActiveEffects', 'getActiveBonuses', 'getStrengthBonus', 'getCostReduction'
];

const knownInteractionMethods = [
  'viewOpponentHand', 'viewDeckTop', 'selectFromHand', 'selectFromDeck',
  'selectCardType', 'confirm', 'exchangeCards'
];

const knownHelperMethods = [
  'getOpponentId', 'getPlayerName', 'persistentSystem'
];

console.log('\n\n=== 方法定义状态 ===\n');

// 检查 PersistentEffectSystem
const missingPersistent = categories['PersistentEffectSystem'].filter(
  m => !knownPersistentMethods.includes(m)
);
console.log(`✅ PersistentEffectSystem: ${categories['PersistentEffectSystem'].length} 个方法`);
if (missingPersistent.length > 0) {
  console.log(`   ⚠️  可能缺失: ${missingPersistent.join(', ')}`);
}

// 检查 InteractionSystem
const missingInteraction = categories['InteractionSystem'].filter(
  m => !knownInteractionMethods.includes(m)
);
console.log(`✅ InteractionSystem: ${categories['InteractionSystem'].length} 个方法`);
if (missingInteraction.length > 0) {
  console.log(`   ⚠️  可能缺失: ${missingInteraction.join(', ')}`);
}

// 检查 helpers
console.log(`✅ helpers (utils): ${categories['helpers (utils)'].length} 个方法`);
console.log(`✅ helpers.playerStore: ${categories['helpers.playerStore'].length} 个方法`);
console.log(`✅ helpers.gameStore: ${categories['helpers.gameStore'].length} 个方法`);
console.log(`✅ helpers.historyStore: ${categories['helpers.historyStore'].length} 个方法`);

console.log('\n');
