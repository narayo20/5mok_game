import React from 'react';
import { BookOpen, ShieldCheck, ShieldAlert, Award, Info } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* 모달 닫기 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">공식 렌주룰 (Renju Rules)</h2>
            <p className="text-xs text-slate-400">오목의 선공(흑) 필승을 방지하는 국제 표준 공인 룰</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-300">
          {/* 개요 카드 */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              일반 오목은 먼저 두는 흑이 압도적으로 유리합니다. 따라서 렌주룰에서는 <strong className="text-amber-300">흑에게 엄격한 제약(금수)</strong>을 두고, <strong className="text-white">후공인 백에게는 자유</strong>를 주어 완벽한 5:5 밸런스를 맞춥니다.
            </p>
          </div>

          {/* 흑돌 제약 사항 */}
          <div className="p-4 bg-slate-950/80 border border-red-500/30 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>흑(Black - 선공)의 제약 (금수)</span>
            </div>
            <ul className="space-y-2 pl-2 text-xs leading-relaxed text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-red-300">삼삼(3-3) 금수:</strong> 한 수로 양쪽이 열린 3(활삼)을 2개 이상 동시에 만드는 수 금지
              </li>
              <li>
                <strong className="text-red-300">사사(4-4) 금수:</strong> 한 수로 4(열린 4 또는 닫힌 4)를 2개 이상 동시에 만드는 수 금지
              </li>
              <li>
                <strong className="text-red-300">장목(6목 이상) 금수:</strong> 일렬로 6개 이상의 돌을 늘어놓는 수 금지
              </li>
              <li>
                <strong className="text-amber-300">승리 조건:</strong> 오직 <span className="underline decoration-amber-400 underline-offset-2">정확히 5목</span>만 승리로 인정! (5목을 완성하는 수는 금수보다 우선하여 즉시 승리합니다)
              </li>
            </ul>
          </div>

          {/* 백돌 규칙 */}
          <div className="p-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>백(White - 후공)의 특권 (자유)</span>
            </div>
            <ul className="space-y-2 pl-2 text-xs leading-relaxed text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-blue-300">금수 완전 없음:</strong> 3-3, 4-4, 장목 모두 아무런 제약 없이 착수 가능
              </li>
              <li>
                <strong className="text-blue-300">장목 승리 인정:</strong> 6목, 7목 이상 연속으로 놓아도 즉시 승리 처리
              </li>
              <li>
                <strong className="text-blue-300">금수 유도 전술:</strong> 흑이 금수에 걸려 착수할 수 없도록 몰아붙이는 고도의 수읽기 전술 가능
              </li>
            </ul>
          </div>

          {/* 게임 보조 기능 */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
            <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-amber-300">금수 자동 감지 & 힌트</p>
              <p className="text-slate-400 leading-relaxed">
                본 게임 엔진은 렌주룰 국제 기준에 따라 흑의 착수 불가 위치를 실시간으로 판별하며, 화면 우측 상단 설정에서 <strong>[금수 힌트 표시]</strong>를 켜면 X 표시로 시각적으로 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl transition-colors"
        >
          확인하고 닫기
        </button>
      </div>
    </div>
  );
};

