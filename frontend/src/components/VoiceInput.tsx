import { useState, useRef } from 'react';

interface VoiceInputProps {
  /** 识别完成后的文本回调 */
  onText: (text: string) => void;
  disabled?: boolean;
}

/**
 * 语音输入按钮：基于浏览器原生 Web Speech API（Chrome/Edge 内置，zh-CN）。
 * 不支持的浏览器自动隐藏；识别失败仅结束录音，打字输入始终可用。
 */
export default function VoiceInput({ onText, disabled }: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const supported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as ArrayLike<any>)
        .map((r: any) => r[0]?.transcript || '')
        .join('')
        .trim();
      if (text) onText(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? '正在听…说完再点一次结束' : '语音输入'}
      className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-sm transition disabled:opacity-40 ${
        listening
          ? 'border-[#c05252] bg-[#c05252]/20 text-[#e07c7c] animate-pulse'
          : 'border-[#2a3245] text-[#8a94a8] hover:border-[#8a6d35] hover:text-[#d4a24c]'
      }`}
    >
      {listening ? '■' : '🎙'}
    </button>
  );
}
