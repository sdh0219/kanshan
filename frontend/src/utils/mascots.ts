/** 看山桌宠图鉴：随破案数解锁，6 款对应 6 个动态形态 */
export interface Mascot {
  variant: 'idle' | 'hello' | 'computer' | 'basketball' | 'swing' | 'sleep';
  name: string;
  desc: string;
  /** 解锁所需破案数 */
  unlockAt: number;
}

export const MASCOTS: Mascot[] = [
  { variant: 'idle', name: '值班看山', desc: '初来乍到，站在事务所门口等你', unlockAt: 0 },
  { variant: 'hello', name: '问好看山', desc: '第一次并肩作战，它记得很清楚', unlockAt: 2 },
  { variant: 'computer', name: '搜证看山', desc: '屏幕的光映在脸上，翻遍整个知乎', unlockAt: 4 },
  { variant: 'basketball', name: '投篮看山', desc: '张明留下的那只足球，它一直带着', unlockAt: 6 },
  { variant: 'swing', name: '庆祝看山', desc: '真相浮现的那一刻，它荡得很高', unlockAt: 8 },
  { variant: 'sleep', name: '打盹看山', desc: '案子结了，终于可以睡了，侦探', unlockAt: 10 },
];

export function solvedToUnlocks(solved: number): number {
  return MASCOTS.filter((m) => solved >= m.unlockAt).length;
}

export function nextUnlock(solved: number): Mascot | null {
  return MASCOTS.find((m) => solved < m.unlockAt) || null;
}

export const PET_KEY = 'kanshan_pet';
