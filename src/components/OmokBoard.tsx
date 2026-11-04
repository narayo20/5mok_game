import React, { useState, useRef } from 'react';
import { BOARD_SIZE, Player, type BoardState, type PlayerType, type ForbiddenType, type Move } from '../game/renju';
import { X, Check } from 'lucide-react';

interface OmokBoardProps {
  board: BoardState;
  moves: Move[];
  currentTurn: PlayerType;
  myPlayer: PlayerType | null;
  isMyTurn: boolean;
  gameEnded: boolean;
  winLine?: [number, number][];
  forbiddenMoves: { row: number; col: number; reason: ForbiddenType }[];
  showForbiddenHints: boolean;
  showMoveNumbers: boolean;
  touchConfirmMode: boolean;
  onMakeMove: (row: number, col: number) => void;
}

export const OmokBoard: React.FC<OmokBoardProps> = ({
  board,
  moves,
  currentTurn,
  isMyTurn,
  gameEnded,
  winLine,
  forbiddenMoves,
  showForbiddenHints,
  showMoveNumbers,
  touchConfirmMode,
  onMakeMove,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // 금수 위치 맵
  const forbiddenMap = new Map<string, ForbiddenType>();
  if (showForbiddenHints && currentTurn === Player.BLACK && !gameEnded) {
    forbiddenMoves.forEach((fm) => {
      forbiddenMap.set(`${fm.row},${fm.col}`, fm.reason);
    });
  }

  // 승리 라인 맵
  const winMap = new Set(winLine?.map(([r, c]) => `${r},${c}`) || []);

  // 착수 번호 맵
  const moveNumberMap = new Map<string, number>();
  moves.forEach((m, idx) => {
    moveNumberMap.set(`${m.row},${m.col}`, idx + 1);
  });

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  const handleCellClick = (row: number, col: number) => {
    if (gameEnded) return;
    if (!isMyTurn) return;
    if (board[row][col] !== Player.NONE) return;

    if (touchConfirmMode) {
      if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
        // 같은 위치 두 번째 탭 -> 착수
        onMakeMove(row, col);
        setSelectedCell(null);
      } else {
        // 첫 번째 탭 -> 미리보기 선택
        setSelectedCell({ row, col });
      }
    } else {
      // 즉시 착수
      onMakeMove(row, col);
      setSelectedCell(null);
    }
  };

  const handleConfirmSelected = () => {
    if (selectedCell && board[selectedCell.row][selectedCell.col] === Player.NONE) {
      onMakeMove(selectedCell.row, selectedCell.col);
      setSelectedCell(null);
    }
  };

  const handleCancelSelected = () => {
    setSelectedCell(null);
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[480px] mx-auto px-1 sm:px-3">
      {/* 바둑판 프레임 */}
      <div
        ref={boardRef}
        className="relative w-full aspect-square rounded-2xl p-2.5 sm:p-4 shadow-2xl transition-all duration-300"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #f4caa1 0%, #d89c62 60%, #b27339 100%)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -3px 6px rgba(0,0,0,0.4)',
          border: '4px solid #854f24',
        }}
      >
        {/* 바둑판 내부 격자망 영역 */}
        <div className="relative w-full h-full">
          {/* 가로/세로 격자선 (SVG로 초정밀 렌더링) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1400 1400">
            {/* 가로선 및 세로선 15개 */}
            {Array.from({ length: 15 }).map((_, i) => {
              const pos = (i / 14) * 1400;
              return (
                <React.Fragment key={i}>
                  {/* 가로선 */}
                  <line
                    x1="0"
                    y1={pos}
                    x2="1400"
                    y2={pos}
                    stroke="#5a3311"
                    strokeWidth={i === 0 || i === 14 ? '4.5' : '2.5'}
                    strokeOpacity="0.85"
                  />
                  {/* 세로선 */}
                  <line
                    x1={pos}
                    y1="0"
                    x2={pos}
                    y2="1400"
                    stroke="#5a3311"
                    strokeWidth={i === 0 || i === 14 ? '4.5' : '2.5'}
                    strokeOpacity="0.85"
                  />
                </React.Fragment>
              );
            })}

            {/* 화점 (9개 점) */}
            {[
              [3, 3], [3, 7], [3, 11],
              [7, 3], [7, 7], [7, 11],
              [11, 3], [11, 7], [11, 11],
            ].map(([r, c], idx) => (
              <circle
                key={idx}
                cx={(c / 14) * 1400}
                cy={(r / 14) * 1400}
                r={r === 7 && c === 7 ? 10 : 8}
                fill="#4a2709"
              />
            ))}
          </svg>

          {/* 돌 및 클릭 상호작용 격자 */}
          <div className="absolute inset-0 grid grid-cols-15 grid-rows-15">
            {Array.from({ length: BOARD_SIZE }).map((_, row) =>
              Array.from({ length: BOARD_SIZE }).map((_, col) => {
                const cellKey = `${row},${col}`;
                const stone = board[row][col];
                const isWin = winMap.has(cellKey);
                const forbidden = forbiddenMap.get(cellKey);
                const isLast = lastMove && lastMove.row === row && lastMove.col === col;
                const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
                const moveNum = moveNumberMap.get(cellKey);

                return (
                  <div
                    key={cellKey}
                    onClick={() => handleCellClick(row, col)}
                    className="relative flex items-center justify-center cursor-pointer group active:scale-95 transition-transform"
                    style={{ transform: 'translate(0, 0)' }}
                  >
                    {/* 착수된 돌 */}
                    {stone !== Player.NONE && (
                      <div
                        className={`relative w-[88%] h-[88%] rounded-full flex items-center justify-center transition-all ${
                          isWin ? 'ring-4 ring-yellow-400 scale-105 animate-pulse' : ''
                        } ${isLast ? 'ring-2 ring-red-500' : ''}`}
                        style={{
                          background:
                            stone === Player.BLACK
                              ? 'radial-gradient(circle at 35% 30%, #444 0%, #151515 55%, #050505 100%)'
                              : 'radial-gradient(circle at 35% 30%, #ffffff 0%, #e8e8e8 65%, #c8c8c8 100%)',
                          boxShadow:
                            stone === Player.BLACK
                              ? '0 3px 5px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.25)'
                              : '0 3px 5px rgba(0,0,0,0.35), inset 0 1px 1px #fff',
                        }}
                      >
                        {/* 착수 순서 번호 표시 */}
                        {showMoveNumbers && moveNum && (
                          <span
                            className={`text-[9px] sm:text-[11px] font-bold tracking-tight select-none ${
                              stone === Player.BLACK ? 'text-white/80' : 'text-black/80'
                            }`}
                          >
                            {moveNum}
                          </span>
                        )}

                        {/* 마지막 착수점 표시 (착수 번호 미표시 시) */}
                        {!showMoveNumbers && isLast && (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              stone === Player.BLACK ? 'bg-red-500' : 'bg-red-600'
                            } shadow-sm animate-ping`}
                          />
                        )}
                      </div>
                    )}

                    {/* 모바일 확인 모드 선택 미리보기 고스트 스톤 */}
                    {stone === Player.NONE && isSelected && (
                      <div
                        className="w-[85%] h-[85%] rounded-full opacity-70 animate-pulse flex items-center justify-center border-2 border-amber-400"
                        style={{
                          background:
                            currentTurn === Player.BLACK
                              ? 'radial-gradient(circle at 35% 30%, #444 0%, #111 100%)'
                              : 'radial-gradient(circle at 35% 30%, #fff 0%, #ddd 100%)',
                        }}
                      >
                        <span className="text-[10px] text-amber-300 font-bold">확인</span>
                      </div>
                    )}

                    {/* 흑 금수 표시 (X 아이콘 및 이유 툴팁) */}
                    {stone === Player.NONE && !isSelected && forbidden && (
                      <div className="relative flex items-center justify-center w-full h-full pointer-events-none">
                        <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-600/80 rounded-full flex items-center justify-center text-white shadow-sm">
                          <X className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      </div>
                    )}

                    {/* 빈칸 호버 효과 */}
                    {stone === Player.NONE && !isSelected && !forbidden && isMyTurn && !gameEnded && (
                      <div className="w-2 h-2 rounded-full bg-slate-800/20 group-hover:bg-slate-800/50 transition-colors pointer-events-none" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 모바일 2단계 착수 확인 버튼 패널 */}
      {touchConfirmMode && selectedCell && isMyTurn && !gameEnded && (
        <div className="mt-3 flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 backdrop-blur px-4 py-2 rounded-full shadow-lg animate-bounce">
          <span className="text-xs text-amber-300 font-medium">
            [{selectedCell.row + 1}, {selectedCell.col + 1}] 위치에 착수할까요?
          </span>
          <button
            onClick={handleConfirmSelected}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded-full text-xs font-bold transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> 착수
          </button>
          <button
            onClick={handleCancelSelected}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1 rounded-full text-xs transition-colors"
          >
            <X className="w-3.5 h-3.5" /> 취소
          </button>
        </div>
      )}
    </div>
  );
};
