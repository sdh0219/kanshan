export const socialPrompt = `基于以下玩家的思维指纹，生成3个互补型知乎用户搜索方向。

玩家思维指纹：
- 弱项维度：{{weak_dims}}
- 弱项话题关键词：{{weak_keywords}}

请生成3个搜索查询，用于在知乎搜索API中找到与玩家思维互补的优质回答者：
{
  "search_queries": [
    {"query": "搜索关键词", "reason": "为什么这个方向能找到互补用户", "complement_dim": "互补维度"}
  ],
  "detective_card_text": "如果和TA一起探案，你们将是完美搭档——因为……"
}`;
