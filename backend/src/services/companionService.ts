import { agentApi } from './agentApi.js';
import { companionPromptTemplate } from '../prompts/companion.js';
import { companionTemplates } from '../data/companionTemplates.js';
import type { FingerprintResult } from './fingerprintService.js';

export interface Companion {
  name: string;
  personality: string;
  strength: string;
  speech_style: string;
  complement_dim: string;
  intro: string;
}

export function generateCompanion(fingerprint: FingerprintResult): Companion {
  const dims = fingerprint.dimensions;
  const sorted = [...dims].sort((a, b) => a.score - b.score);
  const weakestTwo = sorted.slice(0, 2);
  const template = matchTemplate(weakestTwo);
  return {
    ...template,
    complement_dim: weakestTwo.map(d => d.toward).join(' + '),
    intro: template.intro,
  };
}

export async function generateCompanionIntro(
  fingerprint: FingerprintResult,
  companion: Companion,
): Promise<string> {
  const dims = fingerprint.dimensions;
  const prompt = companionPromptTemplate
    .replace('{{dim1_score}}', String(dims[0].score))
    .replace('{{dim1_weak}}', dims[0].toward)
    .replace('{{dim2_score}}', String(dims[1].score))
    .replace('{{dim2_weak}}', dims[1].toward)
    .replace('{{dim3_score}}', String(dims[2].score))
    .replace('{{dim3_weak}}', dims[2].toward)
    .replace('{{dim4_score}}', String(dims[3].score))
    .replace('{{dim4_weak}}', dims[3].toward)
    .replace('{{dim5_score}}', String(dims[4].score))
    .replace('{{dim5_weak}}', dims[4].toward)
    .replace('{{companion_name}}', companion.name)
    .replace('{{companion_personality}}', companion.personality)
    .replace('{{companion_strength}}', companion.strength)
    .replace('{{companion_speech_style}}', companion.speech_style);

  try {
    const intro = await agentApi.chat([
      { role: 'system', content: prompt },
      { role: 'user', content: '案件即将开始，请用2-3句话做自我介绍。' },
    ]);
    return intro;
  } catch (err) {
    console.error(`[CompanionService] 搭档介绍生成失败，使用模板: ${(err as Error).message}`);
    return companion.intro;
  }
}

export async function companionAction(
  companion: Companion,
  fingerprint: FingerprintResult,
  gamePhase: string,
  playerInput: string,
  context?: { npcReply?: string; searchResults?: string },
): Promise<string> {
  const dims = fingerprint.dimensions;
  const prompt = companionPromptTemplate
    .replace('{{dim1_score}}', String(dims[0].score))
    .replace('{{dim1_weak}}', dims[0].toward)
    .replace('{{dim2_score}}', String(dims[1].score))
    .replace('{{dim2_weak}}', dims[1].toward)
    .replace('{{dim3_score}}', String(dims[2].score))
    .replace('{{dim3_weak}}', dims[2].toward)
    .replace('{{dim4_score}}', String(dims[3].score))
    .replace('{{dim4_weak}}', dims[3].toward)
    .replace('{{dim5_score}}', String(dims[4].score))
    .replace('{{dim5_weak}}', dims[4].toward)
    .replace('{{companion_name}}', companion.name)
    .replace('{{companion_personality}}', companion.personality)
    .replace('{{companion_strength}}', companion.strength)
    .replace('{{companion_speech_style}}', companion.speech_style)
    .replace('{{game_phase}}', gamePhase)
    .replace('{{player_input}}', playerInput)
    .replace('{{npc_reply}}', context?.npcReply || '无')
    .replace('{{search_results}}', context?.searchResults || '无');

  try {
    const reply = await agentApi.chat([
      { role: 'system', content: prompt },
      { role: 'user', content: playerInput },
    ]);
    return reply;
  } catch (err) {
    console.error(`[CompanionService] 搭档回复失败，使用预设回复: ${(err as Error).message}`);
    const fallbacks: Record<string, string> = {
      search: `${companion.name}：我注意到了一些细节，搜索结果里可能有被忽略的线索。建议再深入看看。`,
      dialogue: `${companion.name}：对方的话里有值得深究的地方。${companion.strength.includes('情绪') ? '我感觉到一些微妙的情绪变化。' : '我注意到一些逻辑上的细节。'}`,
      reasoning: `${companion.name}：根据目前掌握的线索，我的判断是——事情不像表面那么简单。我们需要更多证据来支撑推理。`,
    };
    return fallbacks[gamePhase] || `${companion.name}：让我想想...这个问题值得深入思考。`;
  }
}

function matchTemplate(weakestTwo: any[]): Companion {
  const dimNames = weakestTwo.map(d => d.name);
  const has = (keyword: string) => dimNames.some(n => n.includes(keyword));

  if (has('感性')) return companionTemplates.emotional;
  if (has('微观')) return companionTemplates.detail;
  if (has('逻辑')) return companionTemplates.logical;
  if (has('批判')) return companionTemplates.critical;
  if (has('广度')) return companionTemplates.broad;
  return companionTemplates.detail;
}

export const companionService = { generateCompanion, generateCompanionIntro, companionAction };
export default companionService;
