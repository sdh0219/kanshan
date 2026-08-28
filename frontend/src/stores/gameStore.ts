import { create } from 'zustand';

type Page = 'home' | 'fingerprint' | 'archive' | 'game' | 'result' | 'records';

interface Clue {
  id: string;
  keyword: string;
  content: string;
  foundBy: 'player' | 'companion';
  requiresDim?: string;
}

interface DialogueEntry {
  role: 'player' | 'npc' | 'companion' | 'kanshan';
  content: string;
  npcId?: string;
  isExclusive?: boolean;
}

interface GameState {
  page: Page;
  userId: string;
  fingerprint: any | null;
  companion: any | null;
  companionIntro: string;
  gameMode: 'solo' | 'team' | null;
  caseData: any | null;
  gamePhase: string;
  clues: Clue[];
  dialogues: DialogueEntry[];
  currentNpcId: string | null;
  endingType: string | null;
  endingText: string | null;
  truth: string | null;
  reasoningText: string | null;
  reasoningScore: number | null;
  reasoningComment: string | null;
  startTime: number;
  loading: boolean;
  error: string | null;

  setPage: (page: Page) => void;
  setUserId: (userId: string) => void;
  setFingerprint: (fp: any) => void;
  setCompanion: (c: any) => void;
  setCompanionIntro: (intro: string) => void;
  setGameMode: (mode: 'solo' | 'team') => void;
  setCaseData: (c: any) => void;
  setGamePhase: (phase: string) => void;
  addClue: (clue: Clue) => void;
  addDialogue: (entry: DialogueEntry) => void;
  setCurrentNpc: (id: string | null) => void;
  setEnding: (type: string, text: string, truth: string) => void;
  setReasoningResult: (text: string, score?: number, comment?: string) => void;
  startTimer: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  resetGame: () => void;
}

const initialGame = {
  caseData: null,
  gamePhase: 'intro',
  clues: [] as Clue[],
  dialogues: [] as DialogueEntry[],
  currentNpcId: null,
  endingType: null,
  endingText: null,
  truth: null,
  reasoningText: null,
  reasoningScore: null,
  reasoningComment: null,
  startTime: 0,
};

export const useGameStore = create<GameState>((set) => ({
  page: 'home',
  userId: '',
  fingerprint: null,
  companion: null,
  companionIntro: '',
  gameMode: null,
  ...initialGame,
  loading: false,
  error: null,

  setPage: (page) => set({ page }),
  setUserId: (userId) => set({ userId }),
  setFingerprint: (fingerprint) => set({ fingerprint }),
  setCompanion: (companion) => set({ companion }),
  setCompanionIntro: (companionIntro) => set({ companionIntro }),
  setGameMode: (gameMode) => set({ gameMode }),
  setCaseData: (caseData) => set({ caseData }),
  setGamePhase: (gamePhase) => set({ gamePhase }),
  addClue: (clue) => set((s) => {
    if (s.clues.find(c => c.keyword === clue.keyword)) return s;
    return { clues: [...s.clues, clue] };
  }),
  addDialogue: (entry) => set((s) => ({ dialogues: [...s.dialogues, entry] })),
  setCurrentNpc: (currentNpcId) => set({ currentNpcId }),
  setEnding: (endingType, endingText, truth) => set({ endingType, endingText, truth }),
  setReasoningResult: (text, score, comment) => set({ reasoningText: text, reasoningScore: score ?? null, reasoningComment: comment ?? null }),
  startTimer: () => set({ startTime: Date.now() }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    page: 'home',
    userId: '',
    fingerprint: null,
    companion: null,
    companionIntro: '',
    gameMode: null,
    ...initialGame,
    loading: false,
    error: null,
  }),
  resetGame: () => set({ ...initialGame }),
}));

export default useGameStore;
