import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { api } from '../api/client';
import SearchPanel from '../components/Detective/SearchPanel';
import DialogueBox from '../components/Detective/DialogueBox';
import ClueWall from '../components/Detective/ClueWall';
import CaseIntro from '../components/Detective/CaseIntro';

export default function GamePage() {
  const {
    caseData, clues, addClue, dialogues, addDialogue,
    fingerprint, companion, companionIntro, gameMode,
    currentNpcId, setCurrentNpc,
    setPage, setEnding, loading, setLoading, error, setError,
    userId, startTime,
  } = useGameStore();

  const [showIntro, setShowIntro] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [npcQuestion, setNpcQuestion] = useState('');

  const isTeamMode = gameMode === 'team';
  const caseId = caseData?.case_id || 'preset';

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.game.search(searchKeyword, { clues }, caseId);
      setSearchResults(result.results || []);
      if (result.clue) {
        addClue(result.clue);
        addDialogue({ role: 'kanshan', content: `发现新线索：${result.clue.content}` });
      }
      if (isTeamMode && fingerprint && companion) {
        try {
          const companionResp = await api.companion.action({
            companion, fingerprint,
            gamePhase: 'search',
            playerInput: `我搜索了"${searchKeyword}"`,
            context: { searchResults: JSON.stringify(result.results?.slice(0, 2)) },
          });
          addDialogue({ role: 'companion', content: companionResp.reply });
        } catch {
          addDialogue({ role: 'companion', content: '嗯……这次的搜索结果里有值得注意的地方，你先看看。' });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTalkToNpc = async (npcId: string) => {
    if (!npcQuestion.trim()) return;
    setCurrentNpc(npcId);
    setLoading(true);
    setError(null);
    try {
      addDialogue({ role: 'player', content: npcQuestion, npcId });
      const result = await api.game.talk(npcId, npcQuestion, { clues }, caseId);
      addDialogue({ role: 'npc', content: result.reply, npcId });
      if (isTeamMode && fingerprint && companion && Math.random() > 0.4) {
        try {
          const companionResp = await api.companion.action({
            companion, fingerprint,
            gamePhase: 'dialogue',
            playerInput: npcQuestion,
            context: { npcReply: result.reply },
          });
          addDialogue({ role: 'companion', content: companionResp.reply });
        } catch {
          const cclue = caseData?.companion_exclusive_clues?.[0];
          if (cclue) addDialogue({ role: 'companion', content: `等等——${cclue.clue}` });
        }
      }
      setNpcQuestion('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setLoading(true);
    try {
      if (isTeamMode && fingerprint && companion) {
        try {
          const resp = await api.companion.action({
            companion, fingerprint,
            gamePhase: 'reasoning',
            playerInput: `收集了${clues.length}条线索，请发表你的推理`,
          });
          addDialogue({ role: 'companion', content: resp.reply });
        } catch {
          addDialogue({ role: 'companion', content: '线索都指向同一个方向了。该你下结论了，搭档。' });
        }
      }
      const result = await api.game.evaluate({ clues }, caseId);
      setEnding(result.endingType, result.ending, result.truth);
      setPage('result');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const elapsedMin = startTime ? Math.round((Date.now() - startTime) / 60000) : 0;

  const introText = isTeamMode
    ? companionIntro
    : '看山：这次你选择独自调查。没有搭档补充视角，你需要更加仔细地审视每一条线索和每一个证人的话。谨慎搜索，深入提问。';

  if (showIntro && caseData) {
    return <CaseIntro caseData={caseData} companionIntro={introText} onStart={() => setShowIntro(false)} mode={gameMode} />;
  }

  return (
    <div className="space-y-5">
      {/* 案件条 */}
      {caseData && (
        <div className="case-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="stamp stamp-seal text-[10px] whitespace-nowrap">调查中</span>
            <div>
              <h2 className="font-serif-detective text-lg font-bold text-[#e8dcc4]">{caseData.case_title}</h2>
              <p className="text-xs text-[#5a6478] line-clamp-1 max-w-xl">{caseData.case_intro}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`tag ${isTeamMode ? 'tag-gold' : 'tag-blue'}`}
              style={{ borderColor: isTeamMode ? '#8a6d35' : '#3d5a7a', color: isTeamMode ? '#d4a24c' : '#6b9bd1' }}>
              {isTeamMode ? `组队 · ${companion?.name || ''}` : '独立探索'}
            </span>
            {elapsedMin > 0 && <span className="text-[#5a6478]">{elapsedMin}分钟</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左：搜证+对话 */}
        <div className="lg:col-span-2 space-y-4">
          <SearchPanel
            keyword={searchKeyword}
            setKeyword={setSearchKeyword}
            onSearch={handleSearch}
            results={searchResults}
            loading={loading}
            hints={caseData?.search_directions?.map((d: any) => ({ keyword: d.keyword, hint: d.hint }))}
          />
          <DialogueBox
            dialogues={dialogues}
            npcList={caseData?.npcs}
            currentNpcId={currentNpcId}
            question={npcQuestion}
            setQuestion={setNpcQuestion}
            onTalk={handleTalkToNpc}
            loading={loading}
          />
        </div>

        {/* 右：线索墙+侧栏 */}
        <div className="space-y-4">
          <ClueWall clues={clues} requiredCount={caseData?.key_evidence_count || 3} />

          <div className="case-card p-5">
            {isTeamMode ? (
              <>
                <p className="text-xs text-[#5a6478] tracking-widest mb-3">搭档档案</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border-2 border-[#d4a24c] bg-[#d4a24c]/10 flex items-center justify-center font-serif-detective text-lg font-bold text-[#d4a24c]">
                    {companion?.name?.[0]}
                  </div>
                  <div>
                    <p className="font-serif-detective text-base font-bold text-[#e8dcc4]">{companion?.name}</p>
                    <p className="text-xs text-[#8a94a8]">{companion?.personality}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#232a3b] text-xs text-[#5a6478]">
                  互补维度：{companion?.complement_dim}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[#5a6478] tracking-widest mb-3">侦探档案</p>
                <p className="font-serif-detective text-base font-bold text-[#6b9bd1]">{userId}</p>
                <p className="text-xs text-[#8a94a8] mt-1 leading-relaxed">{fingerprint?.detective_profile?.style}</p>
                <div className="mt-3 pt-3 border-t border-[#232a3b] space-y-1.5">
                  <p className="text-xs text-[#5a6478]">优势 <span className="text-[#6dbb8a]">{fingerprint?.detective_profile?.strength?.join('、')}</span></p>
                  <p className="text-xs text-[#5a6478]">弱项 <span className="text-[#c05252]">{fingerprint?.detective_profile?.weakness?.join('、')}</span></p>
                </div>
              </>
            )}
          </div>

          <div className="case-card p-5">
            <button
              onClick={handleEvaluate}
              disabled={loading || clues.length === 0}
              className="btn-primary w-full py-3 font-serif-detective tracking-widest text-sm"
            >
              {clues.length === 0
                ? '收集线索后方可指认'
                : `推理指认 · ${clues.length}条线索`}
            </button>
            <p className="text-[10px] text-[#5a6478] text-center mt-2">
              关键证据 ≥ {caseData?.key_evidence_count || 3} 条可达成最佳结局
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-[#c05252]/40 bg-[#c05252]/10 rounded p-3 text-sm text-[#c05252] text-center">
          {error}
        </div>
      )}
    </div>
  );
}
