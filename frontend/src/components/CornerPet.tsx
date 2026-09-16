import { useState } from 'react';
import { KanshanGif } from './LiuKanshan';
import { PET_KEY } from '../utils/mascots';

const BUBBLES = ['有我在呢，侦探。', '今天查点什么？', '线索不会自己冒出来～', '相信你的直觉。', '案子见。'];

/** 右下角桌宠：图鉴中解锁并选择后常驻显示，点击有随机台词，可收起 */
export default function CornerPet({ variant }: { variant: string }) {
  const [bubble, setBubble] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('kanshan_pet_hidden') === '1';
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[50] flex flex-col items-end gap-2 select-none">
      {bubble && (
        <div
          className="case-card px-4 py-2 text-xs text-[#e8dcc4] max-w-[200px] anim-fade-up cursor-pointer"
          onClick={() => setBubble(null)}
          title="点一下收起气泡"
        >
          {bubble}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setHidden(true)}
          title='收起桌宠（在"我的卷宗·看山图鉴"里可重新召唤）'
          className="w-5 h-5 rounded-full bg-[#0a0c10]/80 border border-[#2a3245] text-[#5a6478] text-[10px] hover:text-[#8a94a8]"
        >
          ✕
        </button>
        <button
          onClick={() => setBubble(BUBBLES[Math.floor(Math.random() * BUBBLES.length)])}
          title="点我说话"
          className="rounded-full overflow-hidden border-2 border-[#8a6d35]/50 shadow-lg shadow-black/50 hover:border-[#d4a24c] transition bg-[#0a0c10]/60"
          style={{ width: 72, height: 72 }}
        >
          <KanshanGif variant={variant as any} size={68} />
        </button>
      </div>
    </div>
  );
}

export function getPetVariant(): string | null {
  try {
    return localStorage.getItem(PET_KEY);
  } catch {
    return null;
  }
}
