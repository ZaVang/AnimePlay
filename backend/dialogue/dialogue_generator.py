"""
辩论式对话生成器 - 处理角色对话的生成逻辑
"""

import random
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class DialogueRequest:
    player_id: str
    card_name: str
    dialogue_type: str  # 'attack', 'defense', 'action'
    style: Optional[str] = None  # '友好安利', '辛辣点评', '赞同', '反驳'
    action_type: Optional[str] = (
        None  # 'objection', 'counterattack', 'victory', 'defeat'
    )
    target_card: Optional[str] = None


@dataclass
class DialogueResponse:
    content: str
    type: str
    action_type: Optional[str] = None
    duration: int = 3000


class DialogueGenerator:
    def __init__(self):
        self.speech_patterns = {
            "attack": {
                "friendly": [
                    "这部作品真的很棒，你应该试试看！",
                    "我觉得这个故事会打动你的！",
                    "相信我，这绝对值得一看！",
                    "这部作品的深度真的很令人惊喜！",
                    "我强烈推荐这个，质量很高！",
                ],
                "harsh": [
                    "你根本没看过这个作品吧？",
                    "这种水平的作品你都不认识？",
                    "你的品味需要提升一下了！",
                    "这明显是经典，你居然不知道？",
                    "看来你对这个类型还不够了解啊！",
                ],
            },
            "defense": {
                "agree": [
                    "太有共鸣了！我也是这么想的！",
                    "确实，我想多了...",
                    "你说得对，惭愧...",
                    "这个观点很有道理！",
                    "我被你说服了！",
                ],
                "disagree": [
                    "你这是恶意黑！",
                    "XX才是真正的神作！",
                    "我看的那个更好！",
                    "但是XX更符合我口味！",
                    "我更喜欢XX类型的！",
                    "这个评价太偏激了吧？",
                ],
            },
            "special": {
                "objection": ["异议！", "等等！", "住手！", "不对！", "慢着！"],
                "counterattack": [
                    "降维打击！",
                    "反击成功！",
                    "你的论点站不住脚！",
                    "这就是实力差距！",
                    "让我来教教你什么叫品味！",
                ],
                "victory": [
                    "看来我的安利成功了！",
                    "这就是经典的魅力！",
                    "终于理解了吧！",
                    "这才是真正的好作品！",
                ],
                "defeat": [
                    "唔...确实有道理...",
                    "你的观点让我重新思考...",
                    "这个角度我没想到...",
                    "看来我还需要学习...",
                ],
            },
        }

    def generate_attack_dialogue(self, style: str, card_name: str) -> str:
        """生成攻击时的对话"""
        style_key = "friendly" if style == "友好安利" else "harsh"
        patterns = self.speech_patterns["attack"][style_key]

        base_dialogue = random.choice(patterns)

        # 30%概率提到具体作品名
        if random.random() < 0.3:
            return base_dialogue.replace("这部作品", f"《{card_name}》").replace(
                "这个", f"《{card_name}》"
            )

        return base_dialogue

    def generate_defense_dialogue(
        self, response: str, attack_card: str, defense_card: Optional[str] = None
    ) -> str:
        """生成防御时的对话"""
        response_key = "agree" if response == "赞同" else "disagree"
        patterns = self.speech_patterns["defense"][response_key]

        base_dialogue = random.choice(patterns)

        if defense_card and "XX" in base_dialogue:
            return base_dialogue.replace("XX", f"《{defense_card}》")

        return base_dialogue

    def generate_action_dialogue(self, action_type: str) -> str:
        """生成特殊动作对话"""
        patterns = self.speech_patterns["special"][action_type]
        return random.choice(patterns)

    def generate_dialogue(self, request: DialogueRequest) -> DialogueResponse:
        """根据请求生成对话"""
        if request.dialogue_type == "attack":
            content = self.generate_attack_dialogue(request.style, request.card_name)
            return DialogueResponse(content=content, type="speech", duration=3000)

        elif request.dialogue_type == "defense":
            content = self.generate_defense_dialogue(
                request.style, request.target_card or "", request.card_name
            )
            return DialogueResponse(content=content, type="speech", duration=3000)

        elif request.dialogue_type == "action":
            content = self.generate_action_dialogue(request.action_type)
            return DialogueResponse(
                content=content,
                type="action",
                action_type=request.action_type,
                duration=2000,
            )

        else:
            return DialogueResponse(content="...", type="speech", duration=1000)


# 全局实例
dialogue_generator = DialogueGenerator()
