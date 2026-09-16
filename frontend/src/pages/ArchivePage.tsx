import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { api } from '../api/client';
import { caseCover } from '../utils/caseCovers';

interface CaseItem {
  case_id: string;
  case_title: string;
  case_intro: string;
  source: 'preset' | 'hotlist' | 'custom';
  source_topic?: string;
  created_by?: string;
  created_at: string;
  npc_count: number;
  search_direction_count: number;
  key_evidence_count: number;
}

interface HotTopic {
  index: number;
  title: string;
  excerpt: string;
  url?: string;
}

interface StoryItem {
  index: number;
  work_id: string;
  title: string;
  description: string;
  labels: string[];
}

export default function ArchivePage() {
  const {
    setPage, userId, fingerprint, setCaseData, setGameMode,
    startTimer, loading, setLoading, error, setError,
  } = useGameStore();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [hotTopics, setHotTopics] = useState<HotTopic[]>([]);
  const [hotFallback, setHotFallback] = useState(false);
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [genIndex, setGenIndex] = useState<number | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [genTab, setGenTab] = useState<'hot' | 'story'>('hot');
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storyLoading, setStoryLoading] = useState(false);
  const [slide, setSlide] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const goToSlide = (i: number) => {
    const n = cases.length;
    if (n === 0) return;
    const next = Math.max(0, Math.min(n - 1, i));
    setSlide(next);
    const el = trackRef.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
  };

  const onTrackScroll = () => {
    const el = trackRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  const refreshCases = async () => {
    try {
      const data = await api.archive.cases();
      setCases(data.cases || []);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    setPageLoading(true);
    Promise.all([
      refreshCases(),
      api.archive.hotTopics().then((d: any) => {
        setHotTopics(d.topics || []);
        setHotFallback(!!d.fallback);
      }).catch(() => {}),
    ])
      .finally(() => setPageLoading(false));
  }, []);

  const handleStart = async (caseId: string, mode: 'solo' | 'team') => {
    if (!fingerprint) {
      setPage('home');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.archive.case(caseId);
      setCaseData(data.case);
      setGameMode(mode);
      startTimer();
      setPage('game');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (genTab === 'hot' && genIndex === null) return;
    if (genTab === 'story' && !storyId) return;
    setLoading(true);
    setError(null);
    try {
      if (genTab === 'hot') {
        await api.archive.generate(genIndex!);
      } else {
        setStoryLoading(true);
        await api.archive.generateStory(storyId!);
        setStoryLoading(false);
      }
      await refreshCases();
      setShowGenPanel(false);
      setGenIndex(null);
      setStoryId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStoryLoading(false);
    }
  };

  const toggleGenPanel = () => {
    const next = !showGenPanel;
    setShowGenPanel(next);
    setShowCustomPanel(false);
    if (next && stories.length === 0 && genTab === 'story') {
      api.archive.stories().then((d: any) => setStories(d.stories || [])).catch(() => {});
    }
  };

  const switchGenTab = (tab: 'hot' | 'story') => {
    setGenTab(tab);
    setGenIndex(null);
    setStoryId(null);
    if (tab === 'story' && stories.length === 0) {
      api.archive.stories().then((d: any) => setStories(d.stories || [])).catch(() => {});
    }
  };

  const handleCustomGenerate = async () => {
    if (customInput.trim().length < 10) return;
    setCustomLoading(true);
    setError(null);
    try {
      await api.archive.custom(customInput.trim(), userId || 'anonymous');
      await refreshCases();
      setShowCustomPanel(false);
      setCustomInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCustomLoading(false);
    }
  };

  const sourceLabel = (c: CaseItem) =>
    c.source === 'preset' ? '官方卷宗' : c.source === 'custom' ? `用户投稿 · ${c.created_by || ''}` : `热榜生成 · ${c.source_topic || ''}`;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-end justify-between border-b border-[#232a3b] pb-4">
        <div>
          <p className="text-[10px] text-[#5a6478] tracking-[4px] mb-1">CASE ARCHIVE ROOM</p>
          <h2 className="font-serif-detective text-2xl font-bold text-[#e8dcc4]">案件档案室</h2>
          <p className="text-sm text-[#8a94a8] mt-1">
            翻一翻下面的卷宗，选中哪个，就查哪个案子——<span className="text-[#6b9bd1]">单枪匹马</span>，或带上<span className="text-[#d4a24c]">AI 搭档</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowCustomPanel(!showCustomPanel); setShowGenPanel(false); }}
            className="btn-ghost px-4 py-2 text-sm"
          >
            {showCustomPanel ? '收起投稿' : '＋ 投稿事件'}
          </button>
          <button
            onClick={toggleGenPanel}
            className="btn-ghost px-4 py-2 text-sm"
          >
            {showGenPanel ? '收起生成' : '＋ AI 新建案件'}
          </button>
        </div>
      </div>

      {/* 未建档提示 */}
      {!fingerprint && (
        <div className="case-card p-5 border-l-4 !border-l-[#d4a24c]">
          <p className="text-sm text-[#e2e8f0]">
            你还未完成侦探建档。前往<span className="text-[#d4a24c]">侦探事务所</span>输入知乎ID建立你的思维指纹档案，再回来选择案件。
          </p>
          <button onClick={() => setPage('home')} className="btn-primary px-5 py-2 text-sm mt-3">
            前往建档
          </button>
        </div>
      )}

      {/* AI 生成案件面板（热榜 / 盐言故事双素材源） */}
      {showGenPanel && (
        <div className="case-card p-6 anim-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <span className="stamp stamp-seal text-xs">NEW</span>
            <div>
              <h3 className="font-serif-detective text-lg font-bold text-[#e8dcc4]">AI 剧本作家 · 生成新案件</h3>
              <p className="text-xs text-[#8a94a8]">选一个素材源，AI 将基于它创作一份全新的探案卷宗</p>
            </div>
          </div>

          {/* 素材源 Tab */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => switchGenTab('hot')}
              className={`px-4 py-1.5 text-xs rounded border transition ${
                genTab === 'hot'
                  ? 'border-[#d4a24c] text-[#d4a24c] bg-[#d4a24c]/10'
                  : 'border-[#2a3245] text-[#8a94a8] hover:border-[#8a6d35]'
              }`}
            >
              📈 知乎热榜
            </button>
            <button
              onClick={() => switchGenTab('story')}
              className={`px-4 py-1.5 text-xs rounded border transition ${
                genTab === 'story'
                  ? 'border-[#d4a24c] text-[#d4a24c] bg-[#d4a24c]/10'
                  : 'border-[#2a3245] text-[#8a94a8] hover:border-[#8a6d35]'
              }`}
            >
              📖 盐言故事
            </button>
          </div>

          {genTab === 'hot' && (<>
          {hotFallback && hotTopics.length > 0 && (
            <p className="text-xs text-[#d4a24c] bg-[#d4a24c]/10 border border-[#8a6d35]/40 rounded px-3 py-2 mb-4">
              知乎热榜暂时限流，已切换为备用话题池（同样可生成完整案件，稍后自动恢复热榜）
            </p>
          )}

          {hotTopics.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#5a6478]">
              热榜暂时不可用，稍后再试。现有案件仍可正常探索。
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {hotTopics.map((t) => (
                  <button
                    key={t.index}
                    onClick={() => setGenIndex(t.index)}
                    disabled={loading}
                    className={`text-left p-3 rounded border transition ${
                      genIndex === t.index
                        ? 'border-[#d4a24c] bg-[#d4a24c]/10'
                        : 'border-[#2a3245] hover:border-[#8a6d35] bg-[#0a0c10]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${genIndex === t.index ? 'text-[#d4a24c]' : 'text-[#5a6478]'}`}>
                        #{t.index + 1}
                      </span>
                      <p className="text-sm text-[#e2e8f0] font-medium line-clamp-1">{t.title}</p>
                    </div>
                    <p className="text-xs text-[#5a6478] line-clamp-1">{t.excerpt || '（无摘要）'}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          </>)}

          {genTab === 'story' && (<>
          {stories.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#5a6478]">
              故事列表加载中或暂不可用，稍后再试。
            </div>
          ) : (
            <>
              <p className="text-xs text-[#5a6478] mb-3">
                选一部盐言故事，AI 将保留其人物与氛围，重构为「悬案→搜证→证词→真相」的探案剧本
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 max-h-72 overflow-y-auto scrollbar-thin">
                {stories.map((s) => (
                  <button
                    key={s.work_id}
                    onClick={() => setStoryId(s.work_id)}
                    disabled={loading || storyLoading}
                    className={`text-left p-3 rounded border transition ${
                      storyId === s.work_id
                        ? 'border-[#d4a24c] bg-[#d4a24c]/10'
                        : 'border-[#2a3245] hover:border-[#8a6d35] bg-[#0a0c10]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm text-[#e2e8f0] font-medium line-clamp-1">{s.title}</p>
                      {s.labels.slice(0, 3).map((l, li) => (
                        <span key={li} className="text-[10px] px-1.5 py-0.5 rounded bg-[#3d5a7a]/30 text-[#6b9bd1]">{l}</span>
                      ))}
                    </div>
                    <p className="text-xs text-[#5a6478] line-clamp-2">{s.description || '（无摘要）'}</p>
                  </button>
                ))}
              </div>
            </>
          )}
          </>)}

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleGenerate}
              disabled={loading || storyLoading || (genTab === 'hot' ? genIndex === null : !storyId)}
              className="btn-primary px-6 py-2.5 text-sm"
            >
              {loading || storyLoading
                ? 'AI创作中，约需30秒...'
                : genTab === 'hot'
                  ? `生成案件${genIndex !== null ? ` · 基于「${hotTopics[genIndex]?.title.substring(0, 15)}...」` : ''}`
                  : `改编故事${storyId ? ` · 基于「${stories.find(s => s.work_id === storyId)?.title.substring(0, 15)}...」` : ''}`}
            </button>
            {(loading || storyLoading) && <span className="text-xs text-[#d4a24c] anim-pulse-gold rounded-full px-3 py-1">创作进行中</span>}
          </div>
        </div>
      )}

      {/* 用户投稿事件面板 */}
      {showCustomPanel && (
        <div className="case-card p-6 anim-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <span className="stamp stamp-seal text-xs">投稿</span>
            <div>
              <h3 className="font-serif-detective text-lg font-bold text-[#e8dcc4]">投稿事件，生成专属案件</h3>
              <p className="text-xs text-[#8a94a8]">描述一个真实或虚构的事件，AI剧本作家将把它改编成完整的探案卷宗</p>
            </div>
          </div>

          <div className="mb-3">
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              disabled={customLoading}
              placeholder="例如：某科技公司创始人深夜在办公室离奇失踪，桌上的咖啡还冒着热气，监控显示他最后与一位神秘访客交谈..."
              rows={5}
              className="w-full bg-[#0a0c10]/60 border border-[#2a3245] rounded-lg px-4 py-3 text-sm text-[#e2e8f0] placeholder-[#5a6478] focus:border-[#d4a24c] focus:outline-none resize-none transition"
            />
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${customInput.trim().length < 10 ? 'text-[#5a6478]' : 'text-[#5a8a5a]'}`}>
                {customInput.trim().length < 10 ? `至少输入10字（当前 ${customInput.trim().length} 字）` : `已输入 ${customInput.trim().length} 字，可以生成案件`}
              </span>
              <button
                onClick={handleCustomGenerate}
                disabled={customInput.trim().length < 10 || customLoading}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                {customLoading ? 'AI创作中，约需30秒...' : '生成案件'}
              </button>
            </div>
          </div>

          {customLoading && (
            <div className="flex items-center gap-2 text-xs text-[#d4a24c] anim-pulse-gold rounded-full px-3 py-1 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#d4a24c] animate-ping" />
              正在将你的事件改编为探案卷宗...
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="border border-[#c05252]/40 bg-[#c05252]/10 rounded p-3 text-sm text-[#c05252]">
          {error}
        </div>
      )}

      {/* 案件卷宗：卡片轮播（滚动吸附 + 箭头翻页），减少平铺信息量 */}
      {pageLoading ? (
        <div className="text-center py-16 text-[#5a6478]">
          <span className="font-serif-detective tracking-[6px] text-lg">翻开卷宗...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="case-card p-10 text-center text-sm text-[#5a6478]">
          档案室暂时空空如也——用右上角「AI 新建案件」生成第一份卷宗吧。
        </div>
      ) : (
        <div className="relative">
          <div
            ref={trackRef}
            onScroll={onTrackScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-thin rounded-xl"
            style={{ scrollBehavior: 'smooth' }}
          >
            {cases.map((c, i) => (
              <div key={c.case_id} className="snap-center shrink-0 w-full pr-0 md:px-1">
                <div className="case-card md:mx-2 anim-fade-up texture-paper overflow-hidden" style={{ animationDelay: `${i * 60}ms` }}>
                  {/* 封面插画 */}
                  <div className="relative h-44 md:h-52 overflow-hidden">
                    <img
                      src={caseCover(c.case_id, c.source)}
                      alt=""
                      className="w-full h-full object-cover opacity-90"
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10141d] via-transparent to-transparent" />
                    <div className="absolute top-3 left-4 flex items-center gap-2">
                      <span className="text-[10px] text-[#c9d2e0] tracking-[2px] font-mono bg-[#0a0c10]/70 rounded px-2 py-0.5">
                        FILE NO.{String(i + 1).padStart(3, '0')}
                      </span>
                      <span className={`tag ${c.source === 'preset' ? 'tag-blue' : 'tag-gold'}`}
                        style={{ borderColor: c.source === 'preset' ? '#3d5a7a' : '#8a6d35', color: c.source === 'preset' ? '#6b9bd1' : '#d4a24c', background: 'rgba(10,12,16,0.7)' }}>
                        {c.source === 'preset' ? '官方' : c.source === 'custom' ? '投稿' : '热榜'}
                      </span>
                    </div>
                    <span className="absolute top-3 right-4 stamp stamp-seal text-[10px]">未侦破</span>
                  </div>

                  <div className="p-6">
                    <h3 className="font-serif-detective text-xl font-bold text-[#e8dcc4] mb-2">
                      {c.case_title}
                    </h3>
                    <p className="text-sm text-[#8a94a8] leading-relaxed line-clamp-2 mb-4">
                      {c.case_intro}
                    </p>

                    <div className="flex gap-4 text-xs text-[#5a6478] mb-5 pb-4 border-b border-[#232a3b]">
                      <span>嫌疑人 {c.npc_count || 3}</span>
                      <span>搜证 {c.search_direction_count || 4}</span>
                      <span>关键证据 {c.key_evidence_count || 3}</span>
                      {c.source_topic && !/\?{3,}/.test(c.source_topic) && (
                        <span className="text-[#8a6d35] truncate">
                          {c.source === 'custom' ? '投稿' : '源自'}：{c.source_topic}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleStart(c.case_id, 'solo')}
                        disabled={loading || !fingerprint}
                        className="btn-solo py-3 text-sm flex flex-col items-center gap-0.5"
                      >
                        <span className="font-serif-detective tracking-widest">独立探索</span>
                        <span className="text-[10px] opacity-80 font-normal tracking-wide">单人 · 高难度</span>
                      </button>
                      <button
                        onClick={() => handleStart(c.case_id, 'team')}
                        disabled={loading || !fingerprint}
                        className="btn-primary py-3 text-sm flex flex-col items-center gap-0.5"
                      >
                        <span className="font-serif-detective tracking-widest">组队共探</span>
                        <span className="text-[10px] opacity-80 font-normal tracking-wide">搭档互补 · 标准</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 翻页箭头与指示点 */}
          {cases.length > 1 && (
            <>
              <button
                onClick={() => goToSlide(slide - 1)}
                disabled={slide === 0}
                aria-label="上一份卷宗"
                className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0a0c10]/80 border border-[#2a3245] text-[#c9d2e0] text-lg hover:border-[#8a6d35] hover:text-[#d4a24c] transition disabled:opacity-25"
              >‹</button>
              <button
                onClick={() => goToSlide(slide + 1)}
                disabled={slide === cases.length - 1}
                aria-label="下一份卷宗"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0a0c10]/80 border border-[#2a3245] text-[#c9d2e0] text-lg hover:border-[#8a6d35] hover:text-[#d4a24c] transition disabled:opacity-25"
              >›</button>
              <div className="flex items-center justify-center gap-2 mt-4">
                {cases.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    aria-label={`第${i + 1}份卷宗`}
                    className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-[#d4a24c]' : 'w-1.5 bg-[#2a3245] hover:bg-[#3d5a7a]'}`}
                  />
                ))}
              </div>
              <p className="text-center text-[10px] text-[#5a6478] mt-2 tracking-[2px]">← 拖动或点箭头翻阅卷宗 →</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
