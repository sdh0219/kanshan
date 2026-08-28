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
    setPage, setEnding, setReasoningResult,
    loading, setLoading, error, setError,
    userId, startTime,
  } = useGameStore();

  const [showIntro, setShowIntro] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [npcQuestion, setNpcQuestion] = useState('');
  const [showReasoningModal, setShowReasoningModal] = useState(false);
  const [reasoningText, setReasoningText] = useState('');

  const isTeamMode = gameMode === 'team';
  const caseId = caseData?.case_id || 'preset';
  const companionDims: string[] = companion?.complement_dims || [];
  const exclusiveRevealed = dialogues.filter((d: any) => d.isExclusive).length;

  const companionComment = async (phase: 'search' | 'dialogue' | 'reasoning', playerInput: string, context?: any) => {
    if (!isTeamMode || !fingerprint || !companion) return;
    try {
      const resp = await api.companion.action({
        companion, fingerprint, gamePhase: phase, playerInput, context,
      });
      addDialogue({ role: 'companion', content: resp.reply });
    } catch {
      // 搭档暂时沉默，不打断游戏
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.game.search(searchKeyword, { clues }, caseId);
      setSearchResults(result.results || []);
      if (result.clue) {
        // 组队模式：命中搭档互补维度的关键线索记为搭档发现（搭档贡献的数值来源）
        const isCompanionFind = isTeamMode
          && !!result.clue.requiresDim
          && companionDims.includes(result.clue.requiresDim);
        const finalClue = { ...result.clue, foundBy: isCompanionFind ? 'companion' as const : result.clue.foundBy };
        addClue(finalClue);
        addDialogue({
          role: 'kanshan',
          content: isCompanionFind
            ? `搭档从TA擅长的视角注意到一条关键线索：${result.clue.content}`
            : `发现新线索：${result.clue.content}`,
        });
      }
      await companionComment(
        'search',
        `我搜索了"${searchKeyword}"${result.clue ? '，似乎有所发现' : ''}`,
        {
          // 只传标题，不给内容：避免搭档把知乎社区内容当成案件事实编造结论
          searchResults: (result.results || []).slice(0, 3)
            .map((r: any) => `知乎问题《${r.title || r.Title || r.target?.title || '未知'}》（社区内容，与案件无关，仅作背景）`).join('；'),
        },
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTalkToNpc = async (npcId: string) => {
    // 先选中证人（即使还没输入问题），解除输入框禁用——修复讯问死锁
    setCurrentNpc(npcId);
    if (!npcQuestion.trim()) return;
    setLoading(true);
    setError(null);
    try {
      addDialogue({ role: 'player', content: npcQuestion, npcId });
      const result = await api.game.talk(npcId, npcQuestion, { clues }, caseId);
      addDialogue({ role: 'npc', content: result.reply, npcId });

      if (isTeamMode && companion) {
        // 搭档独占线索：每轮证人对话后有几率触发下一条（每条只触发一次）
        const exclusivePool = caseData?.companion_exclusive_clues || [];
        const nextExclusive = exclusivePool[exclusiveRevealed];
        if (nextExclusive && Math.random() > 0.3) {
          addDialogue({ role: 'companion', content: `等等——${nextExclusive.clue}`, isExclusive: true } as any);
          addClue({
            id: `clue_ex_${exclusiveRevealed + 1}`,
            keyword: `${companion.name}的观察`,
            content: nextExclusive.clue,
            foundBy: 'companion',
            requiresDim: nextExclusive.requires_dim,
          });
        } else {
          await companionComment('dialogue', npcQuestion, { npcReply: result.reply });
        }
      }
      setNpcQuestion('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReasoning = async () => {
    if (reasoningText.trim().length < 10) return;
    setLoading(true);
    setError(null);
    try {
      await companionComment('reasoning', `我的推理：${reasoningText.trim().substring(0, 200)}`);
      const result = await api.game.evaluate({ clues }, caseId, reasoningText.trim());
      setEnding(result.endingType, result.ending, result.truth);
      setReasoningResult(reasoningText.trim(), result.reasoningScore, result.reasoningComment);
      setShowReasoningModal(false);
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
              onClick={() => setShowReasoningModal(true)}
              disabled={loading || clues.length === 0}
              className="btn-primary w-full py-3 font-serif-detective tracking-widest text-sm"
            >
              {clues.length === 0
                ? '收集线索后方可指认'
                : `推理指认 · ${clues.length}条线索`}
            </button>
            <p className="text-[10px] text-[#5a6478] text-center mt-2">
              结局由关键证据与你的推理质量共同决定
            </p>
          </div>
        </div>
      </div>

      {/* 推理指认弹窗 */}
      {showReasoningModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && setShowReasoningModal(false)} />
          <div className="relative case-card p-8 max-w-xl w-full texture-paper anim-fade-up max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-[#5a6478] tracking-[4px]">FINAL DEDUCTION</p>
              <span className="stamp stamp-gold text-xs">结案陈词</span>
            </div>
            <h3 className="font-serif-detective text-2xl font-bold text-[#e8dcc4] mb-2">说出你的推理</h3>
            <p className="text-xs text-[#8a94a8] leading-relaxed mb-4">
              真相是什么？谁是幕后推手，动机又是什么？结合你收集到的线索写下推理——
              看山会亲自评估你的推理质量，它和关键证据一样影响结局。
            </p>
            <textarea
              value={reasoningText}
              onChange={(e) => setReasoningText(e.target.value)}
              disabled={loading}
              rows={6}
              placeholder="例如：我认为张明的消失和导师有关。他发现了导师侵占成果的证据，论文被撤稿是导师的报复……"
              className="w-full bg-[#0a0c10]/60 border border-[#2a3245] rounded-lg px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#5a6478] focus:border-[#d4a24c] focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
              <span className={`text-xs ${reasoningText.trim().length < 10 ? 'text-[#5a6478]' : 'text-[#6dbb8a]'}`}>
                {reasoningText.trim().length < 10
                  ? `至少写10个字，认真的推理才有说服力（当前 ${reasoningText.trim().length} 字）`
                  : `已输入 ${reasoningText.trim().length} 字`}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setShowReasoningModal(false)} disabled={loading} className="btn-ghost px-5 py-2 text-sm">
                  再查查
                </button>
                <button
                  onClick={handleSubmitReasoning}
                  disabled={loading || reasoningText.trim().length < 10}
                  className="btn-primary px-6 py-2 text-sm"
                >
                  {loading ? '看山评估中...' : '提交推理'}
                </button>
              </div>
            </div>
            {loading && (
              <p className="text-xs text-[#d4a24c] anim-pulse-gold mt-3 text-center">
                看山正在对照真相审阅你的推理，约需10-20秒...
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="border border-[#c05252]/40 bg-[#c05252]/10 rounded p-3 text-sm text-[#c05252] text-center">
          {error}
        </div>
      )}
    </div>
  );
}
