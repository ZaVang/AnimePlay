// 使用 Node.js 检查技能注册状态
import fs from 'fs';
import path from 'path';

console.log('=== 逢坂大河技能检查 ===\n');

// 1. 检查技能文件是否存在
const skillFile = './src/skills/characters/aisaka-taiga.ts';
const skillExists = fs.existsSync(skillFile);
console.log(`技能文件存在: ${skillExists ? '✅' : '❌'} ${skillFile}`);

if (skillExists) {
  const content = fs.readFileSync(skillFile, 'utf8');
  const hasExport = content.includes('export const aisakaTaigaSkills');
  console.log(`导出对象存在: ${hasExport ? '✅' : '❌'} aisakaTaigaSkills`);

  const skills = ['逢坂大河_掌中老虎', '逢坂大河_傲娇反击'];
  skills.forEach(skill => {
    const hasSkill = content.includes(`'${skill}':`);
    console.log(`技能定义: ${hasSkill ? '✅' : '❌'} ${skill}`);
  });
}

// 2. 检查技能数据文件
const dataFile = './src/data/urCharacterSkillsGenerated.ts';
const dataExists = fs.existsSync(dataFile);
console.log(`\n数据文件存在: ${dataExists ? '✅' : '❌'} ${dataFile}`);

if (dataExists) {
  const content = fs.readFileSync(dataFile, 'utf8');
  const skills = ['逢坂大河_掌中老虎', '逢坂大河_傲娇反击'];
  skills.forEach(skill => {
    const hasSkill = content.includes(skill);
    console.log(`数据定义: ${hasSkill ? '✅' : '❌'} ${skill}`);
  });

  // 检查角色ID映射
  const hasCharacterMapping = content.includes('1762:');
  console.log(`角色映射: ${hasCharacterMapping ? '✅' : '❌'} ID 1762 (逢坂大河)`);
}

// 3. 检查注册表逻辑
const registryFile = './src/skills/registry.ts';
const registryExists = fs.existsSync(registryFile);
console.log(`\n注册表文件: ${registryExists ? '✅' : '❌'} ${registryFile}`);

if (registryExists) {
  const content = fs.readFileSync(registryFile, 'utf8');
  const hasGlobImport = content.includes("import.meta.glob('./characters/*.ts'");
  const hasAutoRegistry = content.includes('createSkillRegistry');
  console.log(`自动导入: ${hasGlobImport ? '✅' : '❌'} glob import`);
  console.log(`注册逻辑: ${hasAutoRegistry ? '✅' : '❌'} createSkillRegistry`);
}

console.log('\n=== 检查完成 ===');
console.log('\n下一步：在浏览器控制台运行 testSkills.testAisakaTaigaSkills() 验证运行时注册');