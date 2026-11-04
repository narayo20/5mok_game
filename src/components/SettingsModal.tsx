import React from 'react';
import { Settings, Volume2, VolumeX, Eye, Hash, Touchpad, HelpCircle, Smartphone } from 'lucide-react';
import { sound } from '../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  showForbiddenHints: boolean;
  setShowForbiddenHints: (val: boolean) => void;
  showMoveNumbers: boolean;
  setShowMoveNumbers: (val: boolean) => void;
  touchConfirmMode: boolean;
  setTouchConfirmMode: (val: boolean) => void;
  onOpenRules: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  setSoundEnabled,
  showForbiddenHints,
  setShowForbiddenHints,
  showMoveNumbers,
  setShowMoveNumbers,
  touchConfirmMode,
  setTouchConfirmMode,
  onOpenRules,
}) => {
  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
    if (next) sound.playStone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
            <Settings className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">게임 설정</h2>
        </div>

        <div className="space-y-4">
          {/* 소리 효과음 */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-amber-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <div className="text-sm font-semibold">바둑돌 효과음</div>
                <div className="text-[11px] text-slate-400">착수 타격음 및 승리음</div>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                soundEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* 흑 금수 위치 힌트 표시 */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold">금수 힌트 표시</div>
                <div className="text-[11px] text-slate-400">흑 차례 시 3-3, 4-4, 장목 위치 X 표시</div>
              </div>
            </div>
            <button
              onClick={() => setShowForbiddenHints(!showForbiddenHints)}
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                showForbiddenHints ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* 착수 순서 번호 표시 */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold">착수 수순 번호</div>
                <div className="text-[11px] text-slate-400">돌 위에 놓인 순서(1, 2, 3...) 표시</div>
              </div>
            </div>
            <button
              onClick={() => setShowMoveNumbers(!showMoveNumbers)}
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                showMoveNumbers ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* 터치 확인 모드 (모바일 화면 실수 방지) */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <Touchpad className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold">모바일 터치 확인 모드</div>
                <div className="text-[11px] text-slate-400">1차 터치로 위치 확인 후 착수</div>
              </div>
            </div>
            <button
              onClick={() => setTouchConfirmMode(!touchConfirmMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                touchConfirmMode ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>

          {/* 렌주룰 규칙 가이드 열기 버튼 */}
          <button
            onClick={() => {
              onClose();
              onOpenRules();
            }}
            className="w-full flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-xs font-semibold text-slate-200 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>렌주룰 공식 규칙 가이드 보기</span>
          </button>

          {/* 모바일 홈 화면 추가 안내 */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-[11px] text-amber-300/90">
            <Smartphone className="w-4 h-4 shrink-0 text-amber-400" />
            <span>브라우저 메뉴에서 [홈 화면에 추가]를 누르면 앱처럼 풀스크린으로 즐길 수 있습니다.</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl transition-colors"
        >
          완료
        </button>
      </div>
    </div>
  );
};

