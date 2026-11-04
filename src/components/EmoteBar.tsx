import React, { useState } from 'react';
import { Smile } from 'lucide-react';

interface EmoteBarProps {
  onSendEmote: (emote: string, label: string) => void;
  disabled?: boolean;
}

const PRESET_EMOTES = [
  { emote: '👋', label: '안녕하세요!' },
  { emote: '👏', label: '좋은 수네요!' },
  { emote: '😅', label: '아차! 실수했다' },
  { emote: '🤔', label: '장고 중...' },
  { emote: '🔥', label: '불꽃 승부!' },
  { emote: '🙏', label: '감사합니다' },
];

export const EmoteBar: React.FC<EmoteBarProps> = ({ onSendEmote, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (disabled) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-full text-xs font-medium text-slate-300 transition-colors shadow-sm"
      >
        <Smile className="w-3.5 h-3.5 text-amber-400" />
        <span>인사 / 반응</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 z-40 bg-slate-900 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex flex-wrap gap-1.5 w-60 animate-fade-in">
          {PRESET_EMOTES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSendEmote(item.emote, item.label);
                setIsOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950/80 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/40 rounded-xl text-xs text-slate-200 transition-all active:scale-95"
            >
              <span className="text-sm">{item.emote}</span>
              <span className="text-[11px]">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
