// 生成UR角色技能配置的脚本
import fs from 'fs';
import path from 'path';

// 从角色数据文件读取UR角色信息
const characterData = JSON.parse(fs.readFileSync(
  '/Users/lilithgames/Downloads/lilith/bangumi/data/selected_character/all_cards.json', 
  'utf8'
));

// 从技能设计文档解析技能信息
const skillDoc = fs.readFileSync(
  '/Users/lilithgames/Downloads/lilith/bangumi/docs/UR角色技能设计.md',
  'utf8'
);

// 提取UR角色
const urCharacters = characterData.filter(char => char.rarity === 'UR');

console.log(`找到 ${urCharacters.length} 个UR角色`);

// 生成技能ID的函数
function generateSkillId(characterName, skillName, isPassive = false) {
  const cleanName = characterName
    .replace(/[·／]/g, '_')
    .replace(/[^\w\u4e00-\u9fa5]/g, '')
    .toUpperCase();
  
  const cleanSkillName = skillName
    .replace(/[「」]/g, '')
    .replace(/[^\w\u4e00-\u9fa5]/g, '_')
    .toUpperCase();
    
  return `${cleanName}_${cleanSkillName}`;
}

// 解析技能设计文档，提取每个角色的技能
function parseSkillsFromDoc() {
  const skills = [];
  const skillMappings = {};
  
  // 简单的正则解析（这里需要根据实际文档格式调整）
  const characterBlocks = skillDoc.split('### ').slice(1); // 跳过第一个空块
  
  characterBlocks.forEach((block, index) => {
    const lines = block.split('\n');
    const firstLine = lines[0];
    
    // 解析角色名和ID
    const nameMatch = firstLine.match(/\d+\.\s*([^(]+)/);
    if (!nameMatch) return;
    
    const characterName = nameMatch[1].trim();
    
    // 在UR角色列表中找到对应的角色
    const character = urCharacters.find(char => char.name === characterName);
    if (!character) {
      console.log(`未找到角色: ${characterName}`);
      return;
    }
    
    // 解析技能（这里是简化的解析，实际需要更精确的解析）
    let activeSkillName = '';
    let passiveSkillName = '';
    let activeDescription = '';
    let passiveDescription = '';
    let cost = 3;
    let cooldown = 2;
    
    // 寻找技能定义行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('**主动技能**：「') && line.includes('」')) {
        const match = line.match(/「([^」]+)」\((\d+)TP,\s*CD(\d+)\)\s*-\s*(.+)/);
        if (match) {
          activeSkillName = match[1];
          cost = parseInt(match[2]);
          cooldown = parseInt(match[3]);
          activeDescription = match[4];
        }
      }
      
      if (line.includes('**被动光环**：「') && line.includes('」')) {
        const match = line.match(/「([^」]+)」\s*-\s*(.+)/);
        if (match) {
          passiveSkillName = match[1];
          passiveDescription = match[2];
        }
      }
    }
    
    if (activeSkillName && passiveSkillName) {
      const activeSkillId = generateSkillId(characterName, activeSkillName);
      const passiveSkillId = generateSkillId(characterName, passiveSkillName, true);
      
      // 生成主动技能
      skills.push({
        id: activeSkillId,
        name: activeSkillName,
        type: '主动技能',
        description: activeDescription,
        cost: cost,
        cooldown: cooldown,
        initialCooldown: 0,
        effectId: activeSkillId,
      });
      
      // 生成被动技能
      skills.push({
        id: passiveSkillId,
        name: passiveSkillName,
        type: '被动光环',
        description: passiveDescription,
        effectId: passiveSkillId,
      });
      
      // 记录映射
      skillMappings[character.id] = [activeSkillId, passiveSkillId];
      
      console.log(`解析角色: ${characterName} (ID: ${character.id})`);
      console.log(`  - 主动: ${activeSkillName}`);
      console.log(`  - 被动: ${passiveSkillName}`);
    }
  });
  
  return { skills, skillMappings };
}

// 生成技能文件
function generateSkillFile(skills, skillMappings) {
  const skillsCode = `// UR角色专属技能定义
import type { Skill } from '@/types/skill';

// UR角色技能库
export const urCharacterSkills: Skill[] = [
${skills.map(skill => `  {
    id: '${skill.id}',
    name: '${skill.name}',
    type: '${skill.type}',
    description: '${skill.description}',${skill.cost ? `
    cost: ${skill.cost},` : ''}${skill.cooldown ? `
    cooldown: ${skill.cooldown},` : ''}${skill.initialCooldown !== undefined ? `
    initialCooldown: ${skill.initialCooldown},` : ''}
    effectId: '${skill.effectId}',
  }`).join(',\n')}
];

// UR角色ID到技能ID的映射
export const urCharacterSkillMap: Record<number, string[]> = {
${Object.entries(skillMappings).map(([id, skills]) => 
  `  // ${urCharacters.find(c => c.id == id)?.name || '未知角色'}
  ${id}: ['${skills[0]}', '${skills[1]}']`
).join(',\n')}
};
`;

  return skillsCode;
}

// 执行解析和生成
try {
  console.log('开始解析技能设计文档...');
  const { skills, skillMappings } = parseSkillsFromDoc();
  
  console.log(`解析完成！生成了 ${skills.length} 个技能，${Object.keys(skillMappings).length} 个角色映射`);
  
  const skillFileContent = generateSkillFile(skills, skillMappings);
  
  // 输出到文件
  fs.writeFileSync(
    '/Users/lilithgames/Downloads/lilith/bangumi/frontend-vue/src/data/urCharacterSkillsGenerated.ts',
    skillFileContent
  );
  
  console.log('技能文件生成完成：urCharacterSkillsGenerated.ts');
  
} catch (error) {
  console.error('生成失败：', error);
}