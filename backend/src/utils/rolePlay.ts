/**
 * 直答 Agent 是检索增强模型，天然倾向输出"知乎回答体"（长篇科普、
 * 分点论述、书面语）。游戏里的 NPC 与搭档需要的是短促的口语化台词。
 * 本函数把 Agent 输出修剪为角色扮演短句，作为 prompt 约束失效时的兜底。
 */
export function rolePlayTrim(text: string, maxChars = 150): string {
  if (!text) return '';
  let t = text.trim();

  // 去掉代码块、markdown 记号
  t = t.replace(/```[\s\S]*?```/g, '');
  t = t.replace(/[*#>`]+/g, '');

  // 若出现分点列表痕迹（"1."、"一、"、"- "），只保留列表之前的引导句
  const listIdx = t.search(/(\n\s*[0-9①②③④⑤][.、)]|\n\s*[-•]\s|\n\s*[一二三四五六七八九十]+[、.])/);
  if (listIdx > 20) t = t.substring(0, listIdx);

  // 按句末标点切句，累计不超过 maxChars、最多 4 句
  const sentences = t.split(/(?<=[。！？!?…])/).map(s => s.trim()).filter(Boolean);
  const kept: string[] = [];
  let len = 0;
  for (const s of sentences) {
    if (kept.length > 0 && len + s.length > maxChars) break;
    kept.push(s);
    len += s.length;
    if (kept.length >= 4) break;
  }

  let result = kept.join('');
  if (!result) result = t.substring(0, maxChars);
  if (result.length > maxChars + 40) result = result.substring(0, maxChars) + '……';
  return result.trim();
}
