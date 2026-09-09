interface ThinkingDotsProps {
  text: string;
  className?: string;
}

/** 拟人化等待指示：文案 + 三点跳动动画，用于 AI 生成等待期 */
export default function ThinkingDots({ text, className = '' }: ThinkingDotsProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span>{text}</span>
      <span className="inline-flex items-end gap-0.5 pb-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-current animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </span>
    </span>
  );
}
