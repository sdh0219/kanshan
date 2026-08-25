export const caseGenPrompt = `你是知乎社区的AI剧本作家。请基于以下热榜话题，生成一个探案案件。

热榜话题：{{hot_topic_title}} - {{hot_topic_summary}}

案件设计要求：
1. 案件背景需与该热榜话题相关
2. 设计3个搜证方向（不同角度切入话题）
3. 设计2-3个NPC角色（每个有知道和不知道的信息）
4. 设计3个结局（真相浮现/真相模糊/错误指控）
5. 设计2个"搭档独占线索"（只有特定维度搭档能发现）

请生成案件JSON：
{
  "case_title": "案件名称（有悬疑感）",
  "case_intro": "200字的案情简介，看山侦探视角",
  "search_directions": [
    {"keyword": "搜证关键词1", "hint": "看山的提示语", "key_evidence": "关键线索内容", "requires_dim": "需要哪个维度"},
    {"keyword": "搜证关键词2", "hint": "看山的提示语", "key_evidence": "关键线索内容", "requires_dim": "需要哪个维度"},
    {"keyword": "搜证关键词3", "hint": "看山的提示语", "key_evidence": "关键线索内容", "requires_dim": "需要哪个维度"}
  ],
  "npcs": [
    {"id": "npc_1", "name": "角色名", "role": "身份", "identity": "详细身份设定", "knows": "知道什么", "unknowns": "不知道什么", "personality": "性格", "trigger_rules": ["触发规则1", "触发规则2"]}
  ],
  "companion_exclusive_clues": [
    {"clue": "线索内容", "requires_dim": "需要哪个维度搭档", "trigger": "触发条件"}
  ],
  "truth": "最终真相（100字）",
  "endings": {
    "good": "真相浮现结局描述",
    "neutral": "真相模糊结局描述",
    "bad": "错误指控结局描述"
  },
  "key_evidence_count": 3
}`;
