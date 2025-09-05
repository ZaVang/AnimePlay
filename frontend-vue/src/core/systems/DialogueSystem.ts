/**
 * 辩论式对话系统 - 管理战斗中的对话内容和视觉效果
 */
export interface DialogueAction {
  id: string;
  playerId: 'playerA' | 'playerB';
  type: 'speech' | 'action' | 'reaction';
  content: string;
  actionType?: 'objection' | 'counterattack' | 'agreement' | 'dismissal';
  duration?: number;
  timestamp: number;
}


export class DialogueSystem {
  private static instance: DialogueSystem;
  private dialogueQueue: DialogueAction[] = [];
  private currentDialogue: DialogueAction | null = null;
  private listeners: ((action: DialogueAction) => void)[] = [];
  private apiBaseUrl = '/api/dialogue';

  static getInstance(): DialogueSystem {
    if (!DialogueSystem.instance) {
      DialogueSystem.instance = new DialogueSystem();
    }
    return DialogueSystem.instance;
  }

  /**
   * 调用API生成对话
   */
  private async generateDialogueFromAPI(
    dialogueType: 'attack' | 'defense' | 'action',
    options: {
      playerId: 'playerA' | 'playerB';
      cardName: string;
      style?: '友好安利' | '辛辣点评' | '赞同' | '反驳';
      actionType?: 'objection' | 'counterattack' | 'victory' | 'defeat';
      targetCard?: string;
    }
  ): Promise<{ content: string; type: string; actionType?: string; duration: number }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: options.playerId,
          cardName: options.cardName,
          dialogueType,
          style: options.style,
          actionType: options.actionType,
          targetCard: options.targetCard,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate dialogue');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating dialogue:', error);
      // 降级处理：返回默认对话
      return {
        content: '...',
        type: 'speech',
        duration: 1000,
      };
    }
  }

  /**
   * 生成攻击时的对话
   */
  async generateAttackDialogue(
    style: '友好安利' | '辛辣点评',
    cardName: string,
    playerId: 'playerA' | 'playerB' = 'playerA'
  ): Promise<string> {
    const result = await this.generateDialogueFromAPI('attack', {
      playerId,
      cardName,
      style,
    });
    return result.content;
  }

  /**
   * 生成防御时的对话
   */
  async generateDefenseDialogue(
    response: '赞同' | '反驳',
    attackCard: string,
    playerId: 'playerA' | 'playerB' = 'playerB',
    defenseCard?: string
  ): Promise<string> {
    const result = await this.generateDialogueFromAPI('defense', {
      playerId,
      cardName: defenseCard || '',
      style: response,
      targetCard: attackCard,
    });
    return result.content;
  }

  /**
   * 生成特殊动作对话
   */
  async generateActionDialogue(
    actionType: 'objection' | 'counterattack' | 'victory' | 'defeat',
    playerId: 'playerA' | 'playerB',
    cardName: string
  ): Promise<string> {
    const result = await this.generateDialogueFromAPI('action', {
      playerId,
      cardName,
      actionType,
    });
    return result.content;
  }

  /**
   * 添加对话到队列
   */
  addDialogue(playerId: 'playerA' | 'playerB', content: string, type: DialogueAction['type'] = 'speech', actionType?: DialogueAction['actionType']) {
    const action: DialogueAction = {
      id: `dialogue_${Date.now()}_${Math.random()}`,
      playerId,
      type,
      content,
      actionType,
      duration: type === 'action' ? 2000 : 3000,
      timestamp: Date.now()
    };

    this.dialogueQueue.push(action);
    this.processQueue();
  }

  /**
   * 处理对话队列
   */
  private processQueue() {
    if (this.currentDialogue || this.dialogueQueue.length === 0) {
      return;
    }

    const nextAction = this.dialogueQueue.shift()!;
    this.currentDialogue = nextAction;

    // 通知监听器
    this.listeners.forEach(listener => listener(nextAction));

    // 自动清理当前对话
    setTimeout(() => {
      this.currentDialogue = null;
      this.processQueue();
    }, nextAction.duration || 3000);
  }

  /**
   * 注册对话监听器
   */
  onDialogue(listener: (action: DialogueAction) => void) {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   */
  removeListener(listener: (action: DialogueAction) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 清空对话队列
   */
  clearQueue() {
    this.dialogueQueue = [];
    this.currentDialogue = null;
  }

  /**
   * 获取当前对话
   */
  getCurrentDialogue(): DialogueAction | null {
    return this.currentDialogue;
  }
}