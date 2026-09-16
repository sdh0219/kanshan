import { useState } from 'react';
import { KanshanGif } from './LiuKanshan';

const STEPS = [
  {
    gif: 'hello',
    title: '欢迎来到看山探案录',
    text: '一款长在知乎上的 AI 侦探游戏——你在知乎写过的回答里，藏着你的侦探天赋。',
  },
  {
    gif: 'computer',
    title: '第一步 · 建档',
    text: '输入知乎 ID（或一键预设），AI 分析你的真实回答生成五维思维指纹，再按互补原则为你匹配一位 AI 侦探搭档。',
  },
  {
    gif: 'idle',
    title: '第二步 · 探案',
    text: '挑一份卷宗开局：点方向词在真实知乎里搜证，审讯 AI 扮演的嫌疑人（支持语音提问），线索自动上墙。',
  },
  {
    gif: 'swing',
    title: '第三步 · 指认',
    text: '证据够了就写下推理——不会写有模板，懒得打字能语音口述。看山 AI 对照真相评分，三档结局等你解锁。',
  },
];

/** 首次访问引导：15 秒四步看懂玩法，替代强推视频（每台设备只出现一次，可随时跳过） */
export default function WelcomeGuide() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem('kanshan_welcome_seen');
    } catch {
      return false;
    }
  });

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem('kanshan_welcome_seen', '1');
    } catch {}
  };

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={close} />
      <div className="relative case-card p-8 max-w-md w-full texture-paper anim-fade-up text-center">
        <p className="text-[10px] text-[#5a6478] tracking-[4px] mb-4">FIRST CASE · GUIDE</p>
        <div className="flex justify-center mb-3">
          <KanshanGif variant={s.gif as any} size={110} />
        </div>
        <h3 className="font-serif-detective text-2xl font-bold text-[#e8dcc4] mb-2">{s.title}</h3>
        <p className="text-sm text-[#c9d2e0] leading-relaxed mb-5 min-h-[3.75rem]">{s.text}</p>
        <div className="flex items-center justify-center gap-2 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-[#d4a24c]' : 'w-1.5 bg-[#2a3245]'}`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={close} className="btn-ghost px-4 py-2.5 text-sm shrink-0">
            跳过
          </button>
          <button
            onClick={() => (last ? close() : setStep(step + 1))}
            className="btn-primary flex-1 py-2.5 text-sm font-serif-detective tracking-widest"
          >
            {last ? '开始探案 →' : '下一步'}
          </button>
        </div>
        <p className="text-[10px] text-[#5a6478] mt-3">全程约 15 秒 · 看完这个不用再看视频，直接开玩</p>
      </div>
    </div>
  );
}
