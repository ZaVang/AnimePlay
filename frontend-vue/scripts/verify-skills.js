/**
 * 验证所有角色技能是否已正确注册
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// 读取 urCharacterSkillsGenerated.ts
const urSkillsPath = join(rootDir, 'src/data/urCharacterSkillsGenerated.ts');
const urSkillsContent = readFileSync(urSkillsPath, 'utf-8');

// 提取所有期望的技能ID
const expectedSkills = new Set();
const skillIdPattern = /id: '([^']+)'/g;
let match;
while ((match = skillIdPattern.exec(urSkillsContent)) !== null) {
  expectedSkills.add(match[1]);
}

console.log(`\n✓ 从 urCharacterSkillsGenerated.ts 找到 ${expectedSkills.size} 个技能定义\n`);

// 读取所有角色技能文件并检查导出
const fs = await import('fs');
const skillsDir = join(rootDir, 'src/skills/characters');
const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.ts'));

console.log(`✓ 找到 ${files.length} 个角色技能文件\n`);

const registeredSkills = new Set();
const issues = [];

files.forEach(file => {
  const content = readFileSync(join(skillsDir, file), 'utf-8');

  // 检查是否有正确的导出格式
  const exportMatch = content.match(/export const (\w+Skills) = \{/);
  if (!exportMatch) {
    issues.push(`${file}: 缺少技能导出`);
    return;
  }

  // 提取技能ID
  const skillPattern = /'([^']+)':/g;
  let skillMatch;
  while ((skillMatch = skillPattern.exec(content)) !== null) {
    registeredSkills.add(skillMatch[1]);
  }
});

console.log(`✓ 从角色文件中找到 ${registeredSkills.size} 个已注册技能\n`);

// 查找未注册的技能
const unregistered = [];
expectedSkills.forEach(skillId => {
  if (!registeredSkills.has(skillId)) {
    unregistered.push(skillId);
  }
});

// 查找多余的技能
const extra = [];
registeredSkills.forEach(skillId => {
  if (!expectedSkills.has(skillId)) {
    extra.push(skillId);
  }
});

// 报告结果
if (issues.length > 0) {
  console.log('❌ 文件格式问题:');
  issues.forEach(issue => console.log(`  - ${issue}`));
  console.log();
}

if (unregistered.length > 0) {
  console.log('❌ 未注册的技能:');
  unregistered.forEach(skill => console.log(`  - ${skill}`));
  console.log();
}

if (extra.length > 0) {
  console.log('⚠️  额外的技能 (未在 urCharacterSkillsGenerated.ts 中定义):');
  extra.forEach(skill => console.log(`  - ${skill}`));
  console.log();
}

if (issues.length === 0 && unregistered.length === 0) {
  console.log('✅ 所有技能都已正确注册！');
  console.log(`   - ${expectedSkills.size} 个期望技能`);
  console.log(`   - ${registeredSkills.size} 个已注册技能`);
  if (extra.length > 0) {
    console.log(`   - ${extra.length} 个额外技能 (可能是非UR角色)`);
  }
} else {
  process.exit(1);
}
