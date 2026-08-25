import fs from 'fs';
import path from 'path';
import { presetCase } from '../data/presetCase.js';

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

interface ExploreRecord {
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

const DATA_DIR = path.join(process.cwd(), 'data');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(file: string, data: any) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function loadCases(): CaseRecord[] {
  const stored = readJSON<CaseRecord[]>(CASES_FILE, []);
  const hasPreset = stored.some(c => c.case_id === 'preset');
  if (!hasPreset) {
    stored.unshift({
      ...presetCase,
      source: 'preset',
      created_at: new Date().toISOString(),
    });
    writeJSON(CASES_FILE, stored);
  }
  return stored;
}

export function listCases(): CaseRecord[] {
  return loadCases();
}

export function getCaseById(caseId: string): CaseRecord | null {
  return loadCases().find(c => c.case_id === caseId) || null;
}

export function saveGeneratedCase(caseData: any, sourceTopic?: string): CaseRecord {
  const cases = loadCases();
  const caseId = `case_${Date.now()}`;
  const record: CaseRecord = {
    ...caseData,
    case_id: caseId,
    source: 'hotlist',
    source_topic: sourceTopic,
    created_at: new Date().toISOString(),
  };
  cases.push(record);
  writeJSON(CASES_FILE, cases);
  return record;
}

export function saveCustomCase(caseData: any, createdBy: string, sourceTopic?: string): CaseRecord {
  const cases = loadCases();
  const caseId = `custom_${Date.now()}`;
  const record: CaseRecord = {
    ...caseData,
    case_id: caseId,
    source: 'custom',
    source_topic: sourceTopic,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  cases.push(record);
  writeJSON(CASES_FILE, cases);
  return record;
}

export function saveExploreRecord(input: {
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
}): ExploreRecord {
  const records = readJSON<ExploreRecord[]>(RECORDS_FILE, []);
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
  writeJSON(RECORDS_FILE, records);
  return record;
}

export function getUserRecords(userId: string): ExploreRecord[] {
  return readJSON<ExploreRecord[]>(RECORDS_FILE, [])
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

export function removeUserRecords(userId: string): number {
  const records = readJSON<ExploreRecord[]>(RECORDS_FILE, []);
  const remaining = records.filter(r => r.user_id !== userId);
  writeJSON(RECORDS_FILE, remaining);
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
