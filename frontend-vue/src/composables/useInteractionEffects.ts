import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';

export function useInteractionEffects(
  character: CharacterCard & { nurtureData: CharacterNurtureData }
) {
  const userStore = useUserStore();

  // 赠送礼物
  function giveGift(gift: any) {
    if (userStore.playerState.knowledgePoints < gift.cost) {
      userStore.addLog('知识点不足，无法赠送礼物！', 'warning');
      return;
    }

    // 扣除知识点
    userStore.playerState.knowledgePoints -= gift.cost;
    
    // 增加好感度
    userStore.increaseAffection(character.id, gift.affectionGain);
    
    // 应用其他效果
    const nurtureData = userStore.getNurtureData(character.id);
    if (gift.moodGain) {
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + gift.moodGain);
    }
    if (gift.charmGain) {
      userStore.enhanceAttribute(character.id, 'charm', gift.charmGain);
    }
    if (gift.intelligenceGain) {
      userStore.enhanceAttribute(character.id, 'intelligence', gift.intelligenceGain);
    }
    
    // 记录礼物
    nurtureData.gifts.push(gift.id);
    userStore.addLog(`${character.name} 收到了${gift.name}，看起来很开心！`, 'success');
  }

  // 进行活动
  function doActivity(activity: any) {
    const affection = character.nurtureData.affection;
    
    if (affection < activity.requirements.affection) {
      userStore.addLog('羁绊值不足，无法进行此活动！', 'warning');
      return;
    }
    
    if (userStore.playerState.knowledgePoints < activity.cost) {
      userStore.addLog('知识点不足，无法进行活动！', 'warning');
      return;
    }

    // 扣除知识点
    userStore.playerState.knowledgePoints -= activity.cost;
    
    // 增加好感度
    userStore.increaseAffection(character.id, activity.affectionGain);
    
    // 应用其他效果
    const nurtureData = userStore.getNurtureData(character.id);
    if (activity.moodGain) {
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + activity.moodGain);
    }
    if (activity.charmGain) {
      userStore.enhanceAttribute(character.id, 'charm', activity.charmGain);
    }
    if (activity.intelligenceGain) {
      userStore.enhanceAttribute(character.id, 'intelligence', activity.intelligenceGain);
    }
    if (activity.strengthGain) {
      userStore.enhanceAttribute(character.id, 'strength', activity.strengthGain);
    }
    
    // 记录活动
    userStore.interactWithCharacter(character.id, activity.id);
    userStore.addLog(`${character.name} 和你一起${activity.name}，度过了愉快的时光！`, 'success');
  }

  // 进行校园活动
  function doCampusActivity(activity: any) {
    const affection = character.nurtureData.affection;
    const mood = character.nurtureData.attributes.mood;
    
    if (affection < activity.requirements.affection || mood < activity.requirements.mood) {
      userStore.addLog('条件不满足，无法参加校园活动！', 'warning');
      return;
    }
    
    if (userStore.playerState.knowledgePoints < activity.cost) {
      userStore.addLog('知识点不足，无法参加活动！', 'warning');
      return;
    }

    // 扣除知识点
    userStore.playerState.knowledgePoints -= activity.cost;
    
    // 增加羁绊值
    userStore.increaseAffection(character.id, activity.affectionGain);
    
    // 应用其他效果
    const nurtureData = userStore.getNurtureData(character.id);
    if (activity.moodGain) {
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + activity.moodGain);
    }
    if (activity.charmGain) {
      userStore.enhanceAttribute(character.id, 'charm', activity.charmGain);
    }
    if (activity.strengthGain) {
      userStore.enhanceAttribute(character.id, 'strength', activity.strengthGain);
    }
    if (activity.intelligenceGain) {
      userStore.enhanceAttribute(character.id, 'intelligence', activity.intelligenceGain);
    }
    
    // 记录特殊事件
    nurtureData.specialEvents.push(`campus_${activity.id}_${Date.now()}`);
    userStore.addLog(`${character.name} 和你一起参加了${activity.name}，增进了彼此的了解！`, 'success');
  }

  // 简单的聊天互动
  function quickChat() {
    const chatTopics = [
      { id: 'weather', text: '今天天气真好呢', affectionGain: 5 },
      { id: 'hobby', text: '你平时都有什么爱好？', affectionGain: 8 },
      { id: 'anime', text: '最近看了什么好看的动画吗？', affectionGain: 10 },
      { id: 'compliment', text: '你今天看起来很不错！', affectionGain: 15 }
    ];
    
    const randomTopic = chatTopics[Math.floor(Math.random() * chatTopics.length)];
    userStore.increaseAffection(character.id, randomTopic.affectionGain);
    userStore.interactWithCharacter(character.id, randomTopic.id);
  }

  // 快速赠送小礼物
  function quickGift() {
    if (userStore.playerState.knowledgePoints >= 25) { // 从10增至25
      const smallGifts = ['flower', 'candy', 'book', 'music_cd'];
      const randomGift = smallGifts[Math.floor(Math.random() * smallGifts.length)];
      
      userStore.playerState.knowledgePoints -= 25; // 从10增至25
      userStore.giveGift(character.id, randomGift);
      userStore.increaseAffection(character.id, 15); // 从20降至15，降低效率
    }
  }

  return {
    giveGift,
    doActivity,
    doCampusActivity,
    quickChat,
    quickGift
  };
}