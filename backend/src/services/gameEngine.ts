import { agentApi } from './agentApi.js';
import { zhihuApi } from './zhihuApi.js';
import { npcPromptTemplate } from '../prompts/npc.js';
import { caseStore } from './caseStore.js';
import type { Request } from 'express';

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
  const matchingDirection = directions.find(
    d => d.keyword.includes(keyword) || keyword.includes(d.keyword),
  );

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

export async function talkToNpc(
  npcId: string,
  playerQuestion: string,
  state: GameState & { caseId?: string },
  companionFollowup?: string,
): Promise<string> {
  const caseData = getCaseData(state?.caseId || 'preset');
  const npcConfig = (caseData?.npcs || []).find((n: any) => n.id === npcId);
  if (!npcConfig) throw new Error(`NPC ${npcId} 不存在`);

  const prompt = npcPromptTemplate
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
      { role: 'user', content: playerQuestion },
    ]);
    return reply;
  } catch (err) {
    console.error(`[GameEngine] NPC对话失败，使用触发规则回复: ${(err as Error).message}`);
    for (const rule of npcConfig.trigger_rules || []) {
      if (rule.includes(playerQuestion.substring(0, 2))) {
        const colonIdx = rule.indexOf('：');
        if (colonIdx > -1) return rule.substring(colonIdx + 1).replace(/"/g, '');
      }
    }
    return `${npcConfig.name}沉默了一会儿，说道："这件事...我不太方便多说。"`;
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

export const gameEngine = { getCase, startGame, searchForClues, talkToNpc, evaluateEnding };
export default gameEngine;
