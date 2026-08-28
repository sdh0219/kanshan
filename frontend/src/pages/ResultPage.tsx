import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { api } from '../api/client';
import EndingReveal from '../components/Detective/EndingReveal';
import DetectiveBoard from '../components/Social/DetectiveBoard';

export default function ResultPage() {
  const {
    endingType, endingText, truth, clues,
    reasoningText, reasoningScore, reasoningComment,
    fingerprint, companion, gameMode, caseData,
    userId, startTime, setPage, resetGame,
    loading, setLoading,
  } = useGameStore();

  const [board, setBoard] = useState<any>(null);
  const [saved, setSaved] = useState<'saving' | 'saved' | 'failed' | null>(null);
  const saveAttempted = useRef(false);

  useEffect(() => {
    if (saveAttempted.current) return;
    saveAttempted.current = true;

    if (userId && caseData && endingType) {
      setSaved('saving');
      api.archive.saveRecord({
        user_id: userId,
        user_display_name: userId,
        case_id: caseData.case_id,
        case_title: caseData.case_title,
        game_mode: gameMode || 'solo',
        companion_name: gameMode === 'team' ? companion?.name : undefined,
        ending_type: endingType,
        clue_count: clues.length,
        key_clue_count: clues.filter((c: any) => c.requiresDim).length,
        companion_clue_count: clues.filter((c: any) => c.foundBy === 'companion').length,
        duration_seconds: startTime ? Math.round((Date.now() - startTime) / 1000) : 0,
      })
        .then(() => setSaved('saved'))
        .catch(() => setSaved('failed'));
    }

    if (fingerprint) {
      setLoading(true);
      api.social.detectiveBoard(fingerprint)
        .then((data: any) => setBoard(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 记录保存状态 */}
      {saved === 'saving' && (
        <p className="text-xs text-[#8a94a8] text-center tracking-widest">正在将本次探索记入卷宗...</p>
      )}
      {saved === 'saved' && (
        <p className="text-xs text-[#6dbb8a] text-center tracking-widest">
          ✓ 本次探索已记入你的卷宗
        </p>
      )}
      {saved === 'failed' && (
        <p className="text-xs text-[#c05252] text-center">记录保存失败（不影响本次探索结果）</p>
      )}

      <EndingReveal
        endingType={endingType}
        endingText={endingText}
        truth={truth}
        clues={clues}
        companionName={gameMode === 'team' ? companion?.name : undefined}
        gameMode={gameMode}
        reasoningText={reasoningText}
        reasoningScore={reasoningScore}
        reasoningComment={reasoningComment}
      />

      {board && <DetectiveBoard board={board} />}

      {/* 后续操作 */}
      <div className="case-card p-8 text-center">
        <p className="text-sm text-[#8a94a8] mb-5">下一步，侦探？</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => { resetGame(); setPage('archive'); }}
            className="btn-primary px-8 py-3 font-serif-detective tracking-widest"
          >
            再探一案
          </button>
          <button
            onClick={() => setPage('records')}
            className="btn-ghost px-8 py-3 font-serif-detective tracking-widest"
          >
            查看我的卷宗
          </button>
        </div>
      </div>
    </div>
  );
}
