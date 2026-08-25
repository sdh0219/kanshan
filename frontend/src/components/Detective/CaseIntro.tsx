import { useState, useEffect } from 'react';
import { KanshanPortrait, KanshanBubble } from '../LiuKanshan';

interface CaseIntroProps {
  caseData: any;
  companionIntro: string;
  onStart: () => void;
  mode?: 'solo' | 'team' | null;
}

export default function CaseIntro({ caseData, companionIntro, onStart, mode }: CaseIntroProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showButton, setShowButton] = useState(false);
  const fullText = caseData?.case_intro || '';

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 3));
        i += 3;
      } else {
        clearInterval(timer);
        setShowButton(true);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [fullText]);

  const isSolo = mode === 'solo';

  return (
    <div className="max-w-3xl mx-auto py-8 anim-fade-up">
      <div className="case-card p-10 texture-paper file-lines">
        <div className="flex items-center justify-between mb-6">
          <p className="text-[10px] text-[#5a6478] tracking-[4px]">CASE FILE · CONFIDENTIAL</p>
          <span className={`stamp ${isSolo ? 'stamp-blue' : 'stamp-gold'} text-xs`}>
            {isSolo ? '独立探索' : '组队共探'}
          </span>
        </div>

        <h2 className="font-serif-detective text-3xl font-bold text-[#e8dcc4] mb-2 text-center">
          {caseData?.case_title}
        </h2>
        <div className="divider-gold w-40 mx-auto mb-8" />

        <div className="flex gap-6 mb-8">
          <div className="hidden sm:block shrink-0">
            <div className="sticky top-24">
              <KanshanPortrait pose={3} size={130} rounded={false} className="border-2 border-[#8a6d35]/40 shadow-xl shadow-black/50" />
              <p className="text-[10px] text-[#5a6478] text-center mt-2 tracking-[2px]">刘看山</p>
            </div>
          </div>
          <div className="flex-1 min-h-[160px] bg-[#0a0c10]/50 rounded border border-[#232a3b] p-5">
            <p className="text-[10px] text-[#5a6478] tracking-[3px] mb-3">案情摘要 · BRIEFING</p>
            <p className="text-[15px] text-[#c9d2e0] leading-8 cursor-blink">
              {displayedText}
            </p>
          </div>
        </div>

        {companionIntro && showButton && (
          <div className="mb-6">
            <KanshanBubble pose={2} size={56}>
              {isSolo
                ? `这案子就交给你了。${companionIntro}`
                : `你们俩一起查这案子。${companionIntro}`}
            </KanshanBubble>
          </div>
        )}

        {showButton && (
          <button
            onClick={onStart}
            className="btn-primary w-full py-4 font-serif-detective tracking-[8px] text-base anim-pulse-gold"
          >
            开 始 调 查
          </button>
        )}
      </div>
    </div>
  );
}
