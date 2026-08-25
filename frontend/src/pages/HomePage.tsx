import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { api } from '../api/client';
import { KanshanGif, KanshanBubble } from '../components/LiuKanshan';

export default function HomePage() {
  const {
    setPage, setUserId, setFingerprint, setCompanion, setCompanionIntro,
    setLoading, setError, loading, error, userId: currentUserId,
    fingerprint: currentFp,
  } = useGameStore();

  const [inputId, setInputId] = useState('');
  const [seedUsers, setSeedUsers] = useState<any[]>([]);

  useEffect(() => {
    api.fingerprint.seedUsers().then((data: any) => setSeedUsers(data.users || [])).catch(() => {});
  }, []);

  const handleAnalyze = async (uid?: string) => {
    const id = uid || inputId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { fingerprint } = await api.fingerprint.analyze(id);
      setUserId(id);
      setFingerprint(fingerprint);

      const { companion } = await api.companion.generate(fingerprint);
      setCompanion(companion);

      const { intro } = await api.companion.intro(fingerprint, companion);
      setCompanionIntro(intro);

      setPage('fingerprint');
    } catch (err: any) {
      setError(err.message || '分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* 主视觉 */}
      <section className="relative py-14 anim-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 text-center md:text-left">
            <p className="text-[10px] text-[#8a6d35] tracking-[6px] mb-4">KANSHAN DETECTIVE ARCHIVES · 2026</p>
            <h2 className="font-serif-detective text-4xl md:text-5xl font-bold text-[#e8dcc4] tracking-wider mb-4">
              看山探案录
              <span className="block text-xl md:text-2xl mt-3 text-[#d4a24c] font-normal tracking-[8px]">
                灵 魂 共 探
              </span>
            </h2>
            <div className="divider-gold w-48 md:mx-0 mx-auto mb-6" />
            <p className="text-sm text-[#8a94a8] max-w-xl leading-relaxed">
              每个人都有独特的思维指纹。系统将分析你的知乎内容，绘制五维思维画像——
              你可以选择<span className="text-[#6b9bd1]">独立探索</span>，凭一己之力直面真相；
              也可以与<span className="text-[#d4a24c]">互补型AI搭档</span>组队共探，让TA补上你的思维盲区。
            </p>
          </div>
          <div className="md:col-span-2 flex justify-center relative">
            <div className="absolute w-64 h-64 rounded-full border border-[#8a6d35]/20 pointer-events-none" />
            <div className="absolute w-52 h-52 rounded-full border border-[#8a6d35]/10 pointer-events-none" />
            <KanshanGif variant="idle" size={230} className="relative drop-shadow-[0_10px_30px_rgba(212,162,76,0.15)]" />
          </div>
        </div>
      </section>

      {/* 已建档快捷入口 */}
      {currentUserId && currentFp && (
        <section className="case-card p-5 flex items-center justify-between anim-fade-up">
          <div>
            <p className="text-xs text-[#5a6478] mb-1">当前侦探</p>
            <p className="font-serif-detective text-lg text-[#e8dcc4]">{currentUserId}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPage('fingerprint')} className="btn-ghost px-4 py-2 text-sm">
              查看指纹档案
            </button>
            <button onClick={() => setPage('archive')} className="btn-primary px-5 py-2 text-sm">
              进入案件档案室 →
            </button>
          </div>
        </section>
      )}

      {/* 建档表单 */}
      <section className="case-card p-8 anim-fade-up texture-paper">
        <div className="flex items-center gap-3 mb-6">
          <span className="stamp stamp-gold text-xs">建档</span>
          <div>
            <h3 className="font-serif-detective text-lg font-bold text-[#e8dcc4]">侦探身份登记</h3>
            <p className="text-xs text-[#5a6478]">输入知乎ID，AI将分析你的回答内容，构建思维指纹</p>
          </div>
        </div>

        <div className="mb-6">
          <KanshanBubble pose={2} size={56}>
            你好，我是看山。每起案件都不简单——在开始之前，我想先了解你的思维方式。
            告诉我你的知乎ID，我为你绘制侦探能力档案。
          </KanshanBubble>
        </div>

        <div className="flex gap-3 mb-2">
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="输入你的知乎主页ID或用户名..."
            className="input-detective flex-1 px-4 py-3 text-sm"
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={loading || !inputId.trim()}
            className="btn-primary px-8 text-sm whitespace-nowrap"
          >
            {loading ? '分析中...' : '开始建档'}
          </button>
        </div>

        {seedUsers.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#232a3b]">
            <p className="text-xs text-[#5a6478] mb-3">或选择预设侦探快速体验：</p>
            <div className="flex flex-wrap gap-2">
              {seedUsers.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => handleAnalyze(u.userId)}
                  disabled={loading}
                  className="btn-ghost px-4 py-2 text-xs"
                >
                  {u.displayName}
                  <span className="text-[#5a6478] ml-2">{u.keywords?.join(' · ')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <p className="mt-4 text-xs text-[#d4a24c] anim-pulse-gold inline-block rounded-full px-3 py-1">
            正在调取知乎内容并分析思维特征，约需10-30秒...
          </p>
        )}
        {error && <p className="mt-4 text-sm text-[#c05252]">{error}</p>}
      </section>

      {/* 流程说明 */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { num: '壹', title: '侦探建档', desc: 'AI分析知乎回答，绘制五维思维指纹与侦探能力雷达', color: '#6b9bd1' },
          { num: '贰', title: '选择案件', desc: '在档案室挑选卷宗，或从知乎热榜生成全新案件', color: '#d4a24c' },
          { num: '叁', title: '两种探索', desc: '独立探索凭实力，组队共探有互补搭档补充视角', color: '#c05252' },
          { num: '肆', title: '记录在案', desc: '每次探索自动记入我的卷宗，见证侦探成长', color: '#6dbb8a' },
        ].map((step, i) => (
          <div key={i} className="case-card p-5 anim-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="font-serif-detective text-2xl font-bold block mb-3" style={{ color: step.color }}>
              {step.num}
            </span>
            <h4 className="font-serif-detective text-base font-bold text-[#e8dcc4] mb-2">{step.title}</h4>
            <p className="text-xs text-[#8a94a8] leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
