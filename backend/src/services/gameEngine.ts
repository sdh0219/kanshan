import { agentApi } from './agentApi.js';
import { zhihuApi } from './zhihuApi.js';
import { npcPromptTemplate } from '../prompts/npc.js';
import { evaluatePromptTemplate } from '../prompts/evaluate.js';
import { rolePlayTrim } from '../utils/rolePlay.js';
import { caseStore } from './caseStore.js';
import type { Request } from 'express';

// 检索增强模型常见的书面语/讲解体特征，命中则视为不合格台词
const NPC_QA_MARKERS = /根据|如下|以下是|综上|参考资料|首先[，,]|其次[，,]|[一二三四五六]、|需要注意/;

export type GamePhase = 'intro' | 'search' | 'dialogue' | 'reasoning' | 'ending';

export interface GameState {
  phase: GamePhase;
  caseId: string;
  clues: Clue[];
  npcDialogues: Record<string, NpcDialogue[]>;
  currentNpc?: string;
  reasoningResult?: string;
  endingType?: 'good' | 'neutral' | 'bad';
}

export interface Clue {
  id: string;
  keyword: string;
  content: string;
  source: string;
  foundBy: 'player' | 'companion';
  requiresDim?: string;
}

export interface NpcDialogue {
  role: 'player' | 'npc' | 'companion';
  content: string;
}

export interface EvaluateResult {
  endingType: 'good' | 'neutral' | 'bad';
  reasoningScore?: number;
  reasoningComment?: string;
}

function getCaseData(caseId: string) {
  return caseStore.getCaseById(caseId);
}

export function getCase(caseId?: string) {
  return getCaseData(caseId || 'preset');
}

export function startGame(caseId = 'preset'): GameState {
  return {
    phase: 'intro',
    caseId,
    clues: [],
    npcDialogues: {},
  };
}

/**
 * 模糊判断玩家搜索词是否命中某个搜证方向。
 * 玩家输入常是自然语言问句（"张明的论文为什么被撤稿"），需要
 * 与方向关键词（"论文撤稿 学术不端"）做宽松匹配。
 */
function matchesDirection(keyword: string, directionKeyword: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s，。、,.！？!?？]/g, '');
  const a = norm(keyword);
  const b = norm(directionKeyword);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  // 方向关键词按空格拆词，逐个 token 判定
  const tokensB = directionKeyword.split(/[\s，。、,]+/).map(norm).filter((t: string) => t.length >= 2);
  for (const tb of tokensB) {
    if (a.includes(tb)) return true; // 完整词出现
    // token 的相邻2字组（2-gram）：玩家输入命中 ≥1/3 即视为相关
    const bigrams = new Set<string>();
    for (let i = 0; i < tb.length - 1; i++) bigrams.add(tb.substring(i, i + 2));
    let hit = 0;
    for (const g of bigrams) if (a.includes(g)) hit++;
    if (hit > 0 && hit / bigrams.size >= 1 / 3) return true;
  }
  return false;
}

export async function searchForClues(
  keyword: string,
  state: GameState & { caseId?: string },
  req?: Request,
): Promise<{ results: any[]; clue?: Clue }> {
  let results: any[] = [];
  try {
    const searchResults = await zhihuApi.searchContent(keyword, req);
    const items = searchResults?.Data?.Items || searchResults?.data?.items || searchResults?.data || [];
    results = Array.isArray(items) ? items.slice(0, 5) : [];
  } catch (err) {
    console.error(`[GameEngine] 搜索失败，使用预设数据: ${(err as Error).message}`);
  }

  const caseData = getCaseData(state?.caseId || 'preset');
  if (!caseData) return { results };

  const directions: any[] = caseData.search_directions || [];
  const matchingDirection = directions.find(d => matchesDirection(keyword, d.keyword || ''));

  let clue: Clue | undefined;
  if (matchingDirection) {
    const existing = state.clues.find(c => c.keyword === matchingDirection.keyword);
    if (!existing) {
      clue = {
        id: `clue_${state.clues.length + 1}`,
        keyword: matchingDirection.keyword,
        content: matchingDirection.key_evidence,
        source: '知乎搜索',
        foundBy: 'player',
        requiresDim: matchingDirection.requires_dim,
      };
    }
  }

  return { results, clue };
}

/**
 * 计算两个中文文本的相关性：问题与回复共享 2-gram 的比例。
 * 用于检测 Agent 是否跑题（检索增强模型容易串到无关内容）。
 */
function sharedBigramRatio(a: string, b: string): number {
  const grams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.substring(i, i + 2));
    return set;
  };
  const ga = grams(a);
  if (ga.size === 0) return 0;
  const gb = grams(b);
  let hit = 0;
  for (const g of ga) if (gb.has(g)) hit++;
  return hit / ga.size;
}

export async function talkToNpc(
  npcId: string,
  playerQuestion: string,
  state: GameState & { caseId?: string },
  companionFollowup?: string,
): Promise<string> {
  const caseData = getCaseData(state?.caseId || 'preset');
  const npcConfig = (caseData?.npcs || []).find((n: any) => n.id === npcId);
  if (!npcConfig) throw new Error(`NPC ${npcId} 不存在`);

  const triggerRules: string[] = npcConfig.trigger_rules || [];

  /** 从规则文本提取冒号后的台词 */
  const ruleLine = (rule: string) => {
    const colonIdx = rule.indexOf('：');
    return colonIdx > -1 ? rolePlayTrim(rule.substring(colonIdx + 1).replace(/"/g, ''), 90) : '';
  };
  /** 兜底台词：优先取与问题最相关的规则，都不相关则沉默 */
  const fallbackLine = () => {
    const bestRule = triggerRules
      .map(rule => ({ line: ruleLine(rule), score: sharedBigramRatio(playerQuestion, rule) }))
      .filter(x => x.line)
      .sort((x, y) => y.score - x.score)[0];
    return bestRule && bestRule.score > 0
      ? bestRule.line
      : `${npcConfig.name}沉默了一会儿，说道："这件事...我不太方便多说。"`;
  };

  // 1) 触发规则优先：设计好的台词质量最高。取与问题相关性最强的规则（冒号后为台词）
  const scored = triggerRules
    .map(rule => ({ line: ruleLine(rule), score: sharedBigramRatio(playerQuestion, rule) }))
    .filter(x => x.line)
    .sort((x, y) => y.score - x.score);
  const best = scored[0];
  if (best && best.score > 0) {
    return best.line;
  }

  const prompt = npcPromptTemplate
    .replace(/{{case_title}}/g, caseData?.case_title || '当前案件')
    .replace(/{{npc_name}}/g, npcConfig.name)
    .replace(/{{npc_role}}/g, npcConfig.role)
    .replace(/{{npc_identity}}/g, npcConfig.identity)
    .replace(/{{npc_knows}}/g, npcConfig.knows)
    .replace(/{{npc_unknowns}}/g, npcConfig.unknowns)
    .replace(/{{npc_personality}}/g, npcConfig.personality)
    .replace('{{npc_trigger_rule_1}}', npcConfig.trigger_rules?.[0] || '')
    .replace('{{npc_trigger_rule_2}}', npcConfig.trigger_rules?.[1] || '')
    .replace('{{player_question}}', playerQuestion)
    .replace('{{companion_followup}}', companionFollowup || '无');

  try {
    const reply = await agentApi.chat([
      { role: 'system', content: prompt },
      { role: 'user', content: `${playerQuestion}（请以${npcConfig.name}的口吻、1-3句话、60字以内回答，不要科普）` },
    ]);
    const trimmed = rolePlayTrim(reply, 90);
    // 跑题检测：与问题没有任何词汇交集、或命中书面语标记 → 回退
    if (trimmed.length < 5 || sharedBigramRatio(playerQuestion, trimmed) === 0 || NPC_QA_MARKERS.test(trimmed)) {
      return fallbackLine();
    }
    return trimmed;
  } catch (err) {
    console.error(`[GameEngine] NPC对话失败，使用触发规则回复: ${(err as Error).message}`);
    return fallbackLine();
  }
}

export function evaluateEnding(state: GameState & { caseId?: string }): 'good' | 'neutral' | 'bad' {
  const keyClues = state.clues.filter(c => c.requiresDim);
  const count = keyClues.length;
  const caseData = getCaseData(state?.caseId || 'preset');
  const threshold = caseData?.key_evidence_count || 3;
  if (count >= threshold) return 'good';
  if (count >= 1) return 'neutral';
  return 'bad';
}

/**
 * 从 Agent 返回的 JSON 中提取 0-10 的评分。
 * 直答模型经常无视输出 schema，需要容错解析：
 * 优先取 score 字段，再找中文评分字段，最后扫"8分"/"8/10"模式。
 * 提取不到返回 null（此时放弃 AI 评估，不升降档）。
 */
function extractScore(obj: any): number | null {
  if (!obj || typeof obj !== 'object') return null;
  const clamp = (n: number) => (Number.isFinite(n) && n >= 0 && n <= 10 ? Math.round(n * 10) / 10 : null);
  if (typeof obj.score === 'number') return clamp(obj.score);
  const direct = Number(obj.score);
  if (!isNaN(direct)) return clamp(direct);
  for (const key of ['评分', '分数', '推理评分', 'rating']) {
    const v = Number(obj[key]);
    if (!isNaN(v)) return clamp(v);
  }
  const text = JSON.stringify(obj);
  const m = text.match(/(\d{1,2})\s*(?:分|\/\s*10)/);
  if (m) return clamp(Number(m[1]));
  return null;
}

/** 评分提取失败时的通用点评（不升降档，也不暴露跑题的 AI 内容） */
function genericComment(endingType: 'good' | 'neutral' | 'bad'): string {
  if (endingType === 'good') return '看山仔细看过你的推理了。证据链完整，方向正确，这份结案陈词写得有模有样。';
  if (endingType === 'neutral') return '看山觉得你的推理有些道理，但还有几处关键的地方没串起来。再想想那些被忽略的线索吧。';
  return '看山看完了你的推理，叹了口气——方向偏了。证据不会说谎，试着把线索重新拼一次。';
}

/**
 * 完整结局评估：关键证据数决定基础档位，再由 Agent 评估玩家推理文本质量
 * 做升降档（好推理可补证据不足，胡乱推理即使证据齐也会被打回）。
 */
export async function evaluateWithReasoning(
  state: GameState & { caseId?: string },
  reasoning: string,
  req?: Request,
): Promise<EvaluateResult> {
  const caseData = getCaseData(state?.caseId || 'preset');
  let endingType = evaluateEnding(state);
  let reasoningScore: number | undefined;
  let reasoningComment: string | undefined;

  const trimmedReasoning = (reasoning || '').trim();
  if (trimmedReasoning.length >= 5 && caseData?.truth) {
    try {
      const cluesText = state.clues
        .map(c => `- [${c.keyword}]${c.requiresDim ? '（关键）' : ''} ${c.content}`)
        .join('\n') || '（无）';
      const prompt = evaluatePromptTemplate
        .replace(/{{case_title}}/g, caseData.case_title || '')
        .replace('{{truth}}', caseData.truth)
        .replace('{{clues_text}}', cluesText)
        .replace('{{reasoning}}', trimmedReasoning.substring(0, 1000));

      const result = await agentApi.chatJSON([
        { role: 'system', content: prompt },
        { role: 'user', content: '请评估这位侦探的推理。只输出JSON。' },
      ]);

      // 容错解析：评分提取不到说明模型跑题或没按要求输出，放弃 AI 评估
      const score = extractScore(result);
      const commentRaw = typeof (result?.comment ?? result?.点评 ?? result?.评语 ?? result?.评估) === 'string'
        ? String(result.comment ?? result.点评 ?? result.评语 ?? result.评估)
        : '';
      const comment = rolePlayTrim(commentRaw, 120);

      if (score !== null) {
        reasoningScore = score;
        reasoningComment = comment || genericComment(endingType);

        // 推理质量对基础档位做一档升降：≥8 升一档，≤2 降一档
        if (score >= 8 && endingType === 'neutral') endingType = 'good';
        else if (score >= 8 && endingType === 'bad') endingType = 'neutral';
        else if (score <= 2 && endingType === 'good') endingType = 'neutral';
        else if (score <= 2 && endingType === 'neutral') endingType = 'bad';
      } else {
        reasoningComment = genericComment(endingType);
      }
    } catch (err) {
      console.error(`[GameEngine] 推理评估失败，退回证据档位: ${(err as Error).message}`);
      reasoningComment = genericComment(endingType);
    }
  }

  return { endingType, reasoningScore, reasoningComment };
}

export const gameEngine = { getCase, startGame, searchForClues, talkToNpc, evaluateEnding, evaluateWithReasoning };
export default gameEngine;
