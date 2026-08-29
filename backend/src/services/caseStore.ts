import { presetCase } from '../data/presetCase.js';
import { getKV } from '../utils/runtime.js';

export interface CaseRecord {
  case_id: string;
  case_title: string;
  case_intro: string;
  source: 'preset' | 'hotlist' | 'custom';
  source_topic?: string;
  created_by?: string;
  created_at: string;
  [key: string]: any;
}

export interface ExploreRecord {
  record_id: string;
  user_id: string;
  user_display_name: string;
  case_id: string;
  case_title: string;
  game_mode: 'solo' | 'team';
  companion_name?: string;
  ending_type: 'good' | 'neutral' | 'bad';
  clue_count: number;
  key_clue_count: number;
  companion_clue_count: number;
  duration_seconds: number;
  finished_at: string;
}

/**
 * 存储层：Cloudflare KV（案件与探案记录量级极小，单键 JSON 数组即可）。
 * 预设案件始终由代码注入，不落库——KV 是临时存储（免费层无持久磁盘的等价物）。
 */
const CASES_KEY = 'kanshan:cases';
const RECORDS_KEY = 'kanshan:records';
const PRESET_CREATED_AT = '2026-08-20T00:00:00.000Z';

async function readGeneratedCases(): Promise<CaseRecord[]> {
  const raw = await getKV().get(CASES_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeGeneratedCases(cases: CaseRecord[]) {
  await getKV().put(CASES_KEY, JSON.stringify(cases));
}

async function readRecords(): Promise<ExploreRecord[]> {
  const raw = await getKV().get(RECORDS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: ExploreRecord[]) {
  await getKV().put(RECORDS_KEY, JSON.stringify(records));
}

export async function listCases(): Promise<CaseRecord[]> {
  const generated = await readGeneratedCases();
  const preset: CaseRecord = { ...presetCase, source: 'preset', created_at: PRESET_CREATED_AT };
  return [preset, ...generated];
}

export async function getCaseById(caseId: string): Promise<CaseRecord | null> {
  const cases = await listCases();
  return cases.find(c => c.case_id === caseId) || null;
}

export async function saveGeneratedCase(caseData: any, sourceTopic?: string): Promise<CaseRecord> {
  const cases = await readGeneratedCases();
  const record: CaseRecord = {
    ...caseData,
    case_id: `case_${Date.now()}`,
    source: 'hotlist',
    source_topic: sourceTopic,
    created_at: new Date().toISOString(),
  };
  cases.push(record);
  await writeGeneratedCases(cases);
  return record;
}

export async function saveCustomCase(caseData: any, createdBy: string, sourceTopic?: string): Promise<CaseRecord> {
  const cases = await readGeneratedCases();
  const record: CaseRecord = {
    ...caseData,
    case_id: `custom_${Date.now()}`,
    source: 'custom',
    source_topic: sourceTopic,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  cases.push(record);
  await writeGeneratedCases(cases);
  return record;
}

export async function saveExploreRecord(input: {
  user_id: string;
  user_display_name?: string;
  case_id: string;
  case_title: string;
  game_mode: 'solo' | 'team';
  companion_name?: string;
  ending_type: 'good' | 'neutral' | 'bad';
  clue_count: number;
  key_clue_count: number;
  companion_clue_count: number;
  duration_seconds?: number;
}): Promise<ExploreRecord> {
  const records = await readRecords();
  const record: ExploreRecord = {
    record_id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    user_id: input.user_id,
    user_display_name: input.user_display_name || input.user_id,
    case_id: input.case_id,
    case_title: input.case_title,
    game_mode: input.game_mode,
    companion_name: input.companion_name,
    ending_type: input.ending_type,
    clue_count: input.clue_count,
    key_clue_count: input.key_clue_count,
    companion_clue_count: input.companion_clue_count,
    duration_seconds: input.duration_seconds || 0,
    finished_at: new Date().toISOString(),
  };
  records.push(record);
  await writeRecords(records);
  return record;
}

export async function getUserRecords(userId: string): Promise<ExploreRecord[]> {
  const records = await readRecords();
  return records
    .filter(r => r.user_id === userId)
    .sort((a, b) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime());
}

export interface RecordsStats {
  total: number;
  good: number;
  neutral: number;
  bad: number;
  solo: number;
  team: number;
  total_clues: number;
}

export function computeStats(records: ExploreRecord[]): RecordsStats {
  return {
    total: records.length,
    good: records.filter(r => r.ending_type === 'good').length,
    neutral: records.filter(r => r.ending_type === 'neutral').length,
    bad: records.filter(r => r.ending_type === 'bad').length,
    solo: records.filter(r => r.game_mode === 'solo').length,
    team: records.filter(r => r.game_mode === 'team').length,
    total_clues: records.reduce((s, r) => s + (r.clue_count || 0), 0),
  };
}

export async function removeUserRecords(userId: string): Promise<number> {
  const records = await readRecords();
  const remaining = records.filter(r => r.user_id !== userId);
  await writeRecords(remaining);
  return records.length - remaining.length;
}

export const caseStore = {
  listCases,
  getCaseById,
  saveGeneratedCase,
  saveCustomCase,
  saveExploreRecord,
  getUserRecords,
  computeStats,
  removeUserRecords,
};
export default caseStore;
