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
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [oauthHandle, setOauthHandle] = useState<string | null>(null);

  // 知乎账号登录后的建档流程：直接用授权的真实回答数据，不走搜索
  const handleSessionAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const { userId, fingerprint } = await api.fingerprint.analyzeSession();
      setUserId(userId);
      setFingerprint(fingerprint);
      setOauthHandle(userId);
      setPage('fingerprint');
      api.companion.generate(fingerprint)
        .then(({ companion }) => {
          setCompanion(companion);
          return api.companion.intro(fingerprint, companion);
        })
        .then(({ intro }) => setCompanionIntro(intro))
        .catch(() => {
          // 搭档生成失败不影响档案展示与独立探索
        });
    } catch (err: any) {
      setError(err.message || '登录用户分析失败，可改用下方方式建档');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.fingerprint.seedUsers().then((data: any) => setSeedUsers(data.users || [])).catch(() => {});
    api.auth.config().then((data: any) => setOauthEnabled(!!data.enabled)).catch(() => {});
    // OAuth 回调后带 /?login=ok|error 返回首页
    const loginState = new URLSearchParams(window.location.search).get('login');
    if (loginState) window.history.replaceState(null, '', window.location.pathname);
    if (loginState === 'ok') {
      handleSessionAnalyze();
    } else {
      api.auth.me().then((data: any) => {
        if (data.authenticated) setOauthHandle(data.handle);
      }).catch(() => {});
    }
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

      // 指纹一出立即翻页展示雷达图；搭档与开场白在指纹页后台补齐，不让用户干等
      setPage('fingerprint');

      api.companion.generate(fingerprint)
        .then(({ companion }) => {
          setCompanion(companion);
          return api.companion.intro(fingerprint, companion);
        })
        .then(({ intro }) => setCompanionIntro(intro))
        .catch(() => {
          // 搭档生成失败不影响档案展示与独立探索；组队入口有兜底文案
        });
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
            你好，我是看山。破案只需要三步——
            ① 点下方金色按钮，一键建立侦探档案；② 挑一份卷宗，组队开查；③ 搜证、审讯证人、写下你的推理。
          </KanshanBubble>
        </div>

        {/* 知乎账号登录（官方 OAuth；登录人数计入人气奖评定，启用凭证后自动出现） */}
        {oauthEnabled && (
          <a
            href="/api/auth/login"
            className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 anim-pulse-gold mb-4"
          >
            🔑 使用知乎账号登录 · 直接分析你的真实回答
          </a>
        )}
        {oauthHandle && (
          <p className="mb-4 text-xs text-[#6dbb8a]">✓ 已用知乎账号登录（{oauthHandle}）——指纹与卷宗将记录在该账号下</p>
        )}

        {/* 快速体验通道：评委与新玩家的首选路径，免输入一键建档 */}
        {seedUsers.length > 0 && (
          <div className="mb-6 rounded border border-[#8a6d35] bg-[#d4a24c]/[0.06] p-4">
            <p className="text-xs text-[#d4a24c] tracking-widest mb-3">⭐ 3 分钟快速体验 · 免输入知乎 ID，点这里直接开始</p>
            <div className="flex flex-wrap gap-3">
              {seedUsers.map((u, i) => (
                <button
                  key={u.userId}
                  onClick={() => handleAnalyze(u.userId)}
                  disabled={loading}
                  className={i === 0 ? 'btn-primary px-7 py-3 text-sm anim-pulse-gold' : 'btn-primary px-5 py-2.5 text-xs opacity-90'}
                >
                  以「{u.displayName}」身份建档
                  <span className="ml-2 text-[10px] opacity-75">{u.keywords?.slice(0, 2).join(' · ')}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 专属档案：完整体验路径 */}
        <div className="pt-5 border-t border-[#232a3b]">
          <p className="text-xs text-[#5a6478] mb-3">或输入知乎 ID，建立完全属于你的侦探档案（AI 将分析你的真实回答）：</p>
          <div className="flex gap-3">
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
              className="btn-ghost px-8 text-sm whitespace-nowrap"
            >
              {loading ? '分析中...' : '开始建档'}
            </button>
          </div>
        </div>

        {loading && (
          <p className="mt-4 text-xs text-[#d4a24c] anim-pulse-gold inline-block rounded-full px-3 py-1">
            正在调取知乎内容并分析思维特征，约需10-30秒...
          </p>
        )}
        {error && <p className="mt-4 text-sm text-[#c05252]">{error}</p>}
      </section>

      {/* 30秒看懂：演示视频 */}
      <section className="case-card p-6 md:p-8 anim-fade-up">
        <div className="flex items-center gap-3 mb-5">
          <span className="stamp stamp-seal text-xs">演示</span>
          <div>
            <h3 className="font-serif-detective text-lg font-bold text-[#e8dcc4]">30 秒看懂看山探案录</h3>
            <p className="text-xs text-[#5a6478]">带解说的完整探案实录：建档 → 搜证 → 审讯 → 结案</p>
          </div>
        </div>
        <video
          controls
          preload="none"
          poster="/demo-poster.jpg"
          src="/demo-video.mp4"
          className="w-full rounded border border-[#2a3245] bg-black"
        />
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
