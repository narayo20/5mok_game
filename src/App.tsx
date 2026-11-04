import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Wifi,
  Smartphone,
  Bot,
  RotateCcw,
  Flag,
  Settings as SettingsIcon,
  BookOpen,
  AlertCircle,
  Trophy,
  RefreshCw,
} from 'lucide-react';

import {
  Player,
  type BoardState,
  type PlayerType,
  type Move,
  createEmptyBoard,
  checkWin,
  checkForbiddenMove,
  getAllForbiddenMoves,
  getBestMoveAI,
} from './game/renju';

import { sound } from './utils/sound';
import { P2PManager, type GameMessage, type NetworkRole } from './network/p2p';
import { OmokBoard } from './components/OmokBoard';
import { NetworkModal } from './components/NetworkModal';
import { SettingsModal } from './components/SettingsModal';
import { RulesModal } from './components/RulesModal';
import { EmoteBar } from './components/EmoteBar';

type GameMode = 'WIFI_P2P' | 'PASS_AND_PLAY' | 'VS_AI';

export function App() {
  // 게임 설정
  const [gameMode, setGameMode] = useState<GameMode>('WIFI_P2P');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showForbiddenHints, setShowForbiddenHints] = useState(true);
  const [showMoveNumbers, setShowMoveNumbers] = useState(false);
  const [touchConfirmMode, setTouchConfirmMode] = useState(false);

  // 모달 상태
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // 게임 진행 상태
  const [board, setBoard] = useState<BoardState>(createEmptyBoard);
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PlayerType>(Player.BLACK);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<PlayerType>(Player.NONE);
  const [winLine, setWinLine] = useState<[number, number][] | undefined>(undefined);
  const [winReason, setWinReason] = useState<string>('');

  // 1:1 P2P 네트워크 상태
  const [p2pRole, setP2pRole] = useState<NetworkRole>(null);
  const [currentRoom, setCurrentRoom] = useState<string>('');
  const [isHosting, setIsHosting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);

  // 요청 및 알림 상태
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'warn' | 'info' | 'error' } | null>(null);
  const [floatingEmote, setFloatingEmote] = useState<{ emote: string; label: string } | null>(null);
  const [pendingUndoRequest, setPendingUndoRequest] = useState(false);
  const [pendingRematchRequest, setPendingRematchRequest] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const emoteTimerRef = useRef<number | null>(null);

  const showToast = useCallback((text: string, type: 'warn' | 'info' | 'error' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ text, type });
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // P2P 매니저 인스턴스 (useRef로 유지)
  const p2pRef = useRef<P2PManager | null>(null);

  // 무르기 수행
  const performUndo = useCallback((count: number) => {
    setMoves((prevMoves) => {
      if (prevMoves.length < count) return prevMoves;
      const remainingMoves = prevMoves.slice(0, prevMoves.length - count);
      const newBoard = createEmptyBoard();
      remainingMoves.forEach((m) => {
        newBoard[m.row][m.col] = m.player;
      });

      setBoard(newBoard);
      setCurrentTurn(
        remainingMoves.length > 0
          ? remainingMoves[remainingMoves.length - 1].player === Player.BLACK
            ? Player.WHITE
            : Player.BLACK
          : Player.BLACK
      );
      setGameEnded(false);
      setWinner(Player.NONE);
      setWinLine(undefined);
      setWinReason('');
      return remainingMoves;
    });
  }, []);

  // 게임 초기화
  const resetGame = useCallback((notifyPeer: boolean = true) => {
    setBoard(createEmptyBoard());
    setMoves([]);
    setCurrentTurn(Player.BLACK);
    setGameEnded(false);
    setWinner(Player.NONE);
    setWinLine(undefined);
    setWinReason('');
    setPendingUndoRequest(false);
    setPendingRematchRequest(false);

    if (notifyPeer && p2pRef.current?.isConnected()) {
      p2pRef.current.send({ type: 'REMATCH_RESPONSE', accepted: true });
    }
  }, []);

  // P2P 메시지 수신 핸들러
  const handleP2PMessage = useCallback(
    (msg: GameMessage) => {
      switch (msg.type) {
        case 'MOVE': {
          setBoard((prev) => {
            const next = prev.map((row) => [...row]);
            next[msg.row][msg.col] = msg.player;

            const winRes = checkWin(next, msg.row, msg.col, msg.player);
            if (winRes.won) {
              setGameEnded(true);
              setWinner(msg.player);
              setWinLine(winRes.winLine);
              const reason = msg.player === Player.BLACK ? '흑 5목 완성!' : '백 5목 완성!';
              setWinReason(reason);
              sound.playWin();
              confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            } else {
              sound.playStone();
              sound.playTurn();
            }

            return next;
          });

          setMoves((prev) => [
            ...prev,
            { row: msg.row, col: msg.col, player: msg.player, moveNumber: msg.moveNumber },
          ]);
          setCurrentTurn(msg.player === Player.BLACK ? Player.WHITE : Player.BLACK);
          break;
        }

        case 'UNDO_REQUEST': {
          setPendingUndoRequest(true);
          sound.playTurn();
          break;
        }

        case 'UNDO_RESPONSE': {
          if (msg.accepted) {
            showToast('상대방이 무르기를 수락했습니다.', 'info');
            performUndo(2);
          } else {
            showToast('상대방이 무르기를 거절했습니다.', 'warn');
          }
          break;
        }

        case 'REMATCH_REQUEST': {
          setPendingRematchRequest(true);
          sound.playTurn();
          break;
        }

        case 'REMATCH_RESPONSE': {
          if (msg.accepted) {
            showToast('상대방이 재대결을 수락했습니다! 새 게임을 시작합니다.', 'info');
            resetGame(false);
          } else {
            showToast('상대방이 재대결을 거절했습니다.', 'warn');
          }
          break;
        }

        case 'RESIGN': {
          const resignPlayer = msg.player;
          const myWinPlayer = resignPlayer === Player.BLACK ? Player.WHITE : Player.BLACK;
          setGameEnded(true);
          setWinner(myWinPlayer);
          setWinReason('상대방이 기권하였습니다!');
          sound.playWin();
          confetti({ particleCount: 80, spread: 60 });
          break;
        }

        case 'EMOTE': {
          if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
          setFloatingEmote({ emote: msg.emote, label: msg.label || '' });
          sound.playTurn();
          emoteTimerRef.current = window.setTimeout(() => {
            setFloatingEmote(null);
          }, 3200);
          break;
        }
      }
    },
    [showToast, performUndo, resetGame]
  );

  // P2P 초기화
  useEffect(() => {
    const p2p = new P2PManager({
      onConnected: (role) => {
        setIsConnected(true);
        setIsConnecting(false);
        setP2pRole(role);
        setIsNetworkModalOpen(false);
        showToast(
          role === 'host'
            ? '상대방이 접속했습니다! (내가 흑 - 선공)'
            : '방에 성공적으로 접속했습니다! (내가 백 - 후공)',
          'info'
        );
        resetGame(false);
      },
      onDisconnected: () => {
        setIsConnected(false);
        setIsHosting(false);
        setP2pRole(null);
        showToast('상대방과 연결이 끊어졌습니다.', 'warn');
      },
      onMessage: handleP2PMessage,
      onError: (err) => {
        setConnectionError(err);
        setIsConnecting(false);
      },
      onPingUpdate: (ms) => {
        setPingMs(ms);
      },
    });

    p2pRef.current = p2p;

    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl && roomFromUrl.length >= 4) {
      setIsNetworkModalOpen(true);
      p2p.joinRoom(roomFromUrl).catch(() => {});
    }

    return () => {
      p2p.disconnect();
    };
  }, [handleP2PMessage, resetGame, showToast]);

  // 내 역할 (흑/백)
  const myPlayer: PlayerType | null = useMemo(() => {
    if (gameMode === 'WIFI_P2P') {
      if (p2pRole === 'host') return Player.BLACK;
      if (p2pRole === 'client') return Player.WHITE;
      return null;
    }
    if (gameMode === 'VS_AI') {
      return Player.BLACK;
    }
    return currentTurn;
  }, [gameMode, p2pRole, currentTurn]);

  // 내 차례인지 여부
  const isMyTurn = useMemo(() => {
    if (gameEnded) return false;
    if (gameMode === 'PASS_AND_PLAY') return true;
    if (gameMode === 'VS_AI') return currentTurn === Player.BLACK;
    if (gameMode === 'WIFI_P2P') {
      if (!isConnected) return false;
      return currentTurn === myPlayer;
    }
    return false;
  }, [gameEnded, gameMode, currentTurn, myPlayer, isConnected]);

  // 현재 판 위의 흑 금수 위치 목록 (힌트용)
  const forbiddenMoves = useMemo(() => {
    if (!showForbiddenHints || currentTurn !== Player.BLACK || gameEnded) {
      return [];
    }
    return getAllForbiddenMoves(board);
  }, [board, showForbiddenHints, currentTurn, gameEnded]);

  // 돌 놓기 실행 함수
  const handleMakeMove = (row: number, col: number) => {
    if (gameEnded || !isMyTurn) return;
    if (board[row][col] !== Player.NONE) return;

    if (currentTurn === Player.BLACK) {
      const forbidden = checkForbiddenMove(board, row, col, Player.BLACK);
      if (forbidden) {
        sound.playForbidden();
        let reasonKor = '금수 자리입니다!';
        if (forbidden === '3-3') reasonKor = '렌주룰 금수: 삼삼(3-3) 자리에는 착수할 수 없습니다!';
        if (forbidden === '4-4') reasonKor = '렌주룰 금수: 사사(4-4) 자리에는 착수할 수 없습니다!';
        if (forbidden === 'OVERLINE') reasonKor = '렌주룰 금수: 흑은 6목 이상의 장목을 둘 수 없습니다!';
        showToast(reasonKor, 'warn');
        return;
      }
    }

    const nextBoard = board.map((r) => [...r]);
    nextBoard[row][col] = currentTurn;
    const moveNum = moves.length + 1;
    const newMove: Move = { row, col, player: currentTurn, moveNumber: moveNum };

    setBoard(nextBoard);
    setMoves((prev) => [...prev, newMove]);
    sound.playStone();

    if (gameMode === 'WIFI_P2P' && isConnected && p2pRef.current) {
      p2pRef.current.send({
        type: 'MOVE',
        row,
        col,
        player: currentTurn,
        moveNumber: moveNum,
      });
    }

    const winCheck = checkWin(nextBoard, row, col, currentTurn);
    if (winCheck.won) {
      setGameEnded(true);
      setWinner(currentTurn);
      setWinLine(winCheck.winLine);
      const reason =
        currentTurn === Player.BLACK
          ? '흑 5목 완성! (승리)'
          : winCheck.winLine && winCheck.winLine.length > 5
          ? '백 장목(6목 이상) 승리!'
          : '백 5목 완성! (승리)';
      setWinReason(reason);
      sound.playWin();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      return;
    }

    const nextTurn = currentTurn === Player.BLACK ? Player.WHITE : Player.BLACK;
    setCurrentTurn(nextTurn);
  };

  // AI 턴 자동 실행
  useEffect(() => {
    if (gameMode === 'VS_AI' && currentTurn === Player.WHITE && !gameEnded) {
      const timer = setTimeout(() => {
        const aiMove = getBestMoveAI(board, Player.WHITE);
        if (aiMove) {
          const nextBoard = board.map((r) => [...r]);
          nextBoard[aiMove.row][aiMove.col] = Player.WHITE;
          const moveNum = moves.length + 1;

          setBoard(nextBoard);
          setMoves((prev) => [
            ...prev,
            { row: aiMove.row, col: aiMove.col, player: Player.WHITE, moveNumber: moveNum },
          ]);
          sound.playStone();

          const winCheck = checkWin(nextBoard, aiMove.row, aiMove.col, Player.WHITE);
          if (winCheck.won) {
            setGameEnded(true);
            setWinner(Player.WHITE);
            setWinLine(winCheck.winLine);
            setWinReason('인공지능 백 승리!');
            sound.playForbidden();
          } else {
            setCurrentTurn(Player.BLACK);
            sound.playTurn();
          }
        }
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [gameMode, currentTurn, board, moves.length, gameEnded]);

  // 무르기 버튼 클릭
  const handleUndoClick = () => {
    if (moves.length === 0 || gameEnded) return;

    if (gameMode === 'PASS_AND_PLAY') {
      performUndo(1);
      sound.playTurn();
    } else if (gameMode === 'VS_AI') {
      performUndo(2);
      sound.playTurn();
    } else if (gameMode === 'WIFI_P2P') {
      if (!isConnected || !p2pRef.current) return;
      showToast('상대방에게 무르기 요청을 보냈습니다...', 'info');
      p2pRef.current.send({ type: 'UNDO_REQUEST' });
    }
  };

  // 재대결 요청
  const handleRematchClick = () => {
    if (gameMode === 'WIFI_P2P') {
      if (!isConnected || !p2pRef.current) return;
      showToast('상대방에게 재대결 요청을 전송했습니다.', 'info');
      p2pRef.current.send({ type: 'REMATCH_REQUEST' });
    } else {
      resetGame(false);
    }
  };

  // 기권하기
  const handleResign = () => {
    if (gameEnded) return;
    if (confirm('정말로 기권하시겠습니까?')) {
      const resigner = myPlayer || currentTurn;
      const other = resigner === Player.BLACK ? Player.WHITE : Player.BLACK;
      setGameEnded(true);
      setWinner(other);
      setWinReason(resigner === Player.BLACK ? '흑 기권패 (백 승리)' : '백 기권패 (흑 승리)');

      if (gameMode === 'WIFI_P2P' && isConnected && p2pRef.current) {
        p2pRef.current.send({ type: 'RESIGN', player: resigner });
      }
    }
  };

  // 방 호스팅
  const handleHostRoom = async (code: string) => {
    if (!p2pRef.current) return code;
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const generatedCode = await p2pRef.current.hostRoom(code);
      setCurrentRoom(generatedCode);
      setIsHosting(true);
      setIsConnecting(false);
      return generatedCode;
    } catch (err: any) {
      setIsConnecting(false);
      throw err;
    }
  };

  // 방 참가
  const handleJoinRoom = async (code: string) => {
    if (!p2pRef.current) return;
    setIsConnecting(true);
    setConnectionError(null);
    try {
      await p2pRef.current.joinRoom(code);
      setCurrentRoom(code);
    } catch (err: any) {
      setIsConnecting(false);
      throw err;
    }
  };

  // 이모티콘 전송
  const handleSendEmote = (emote: string, label: string) => {
    if (p2pRef.current && isConnected) {
      p2pRef.current.send({ type: 'EMOTE', emote, label });
    }
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    setFloatingEmote({ emote, label });
    emoteTimerRef.current = window.setTimeout(() => setFloatingEmote(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-4 max-w-lg mx-auto font-sans">
      {/* 상단 내비게이션 & 게임 헤더 */}
      <header className="w-full flex items-center justify-between py-1.5 px-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shadow-sm">
            五
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>렌주룰 오목</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                15×15
              </span>
            </h1>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              {gameMode === 'WIFI_P2P' && (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  {isConnected ? (
                    <span className="text-emerald-400 font-medium">
                      1:1 P2P 연결됨 {pingMs !== null ? `(${pingMs}ms)` : ''}
                    </span>
                  ) : (
                    <span className="text-amber-400/90 font-medium">Wi-Fi 대기 중</span>
                  )}
                </span>
              )}
              {gameMode === 'PASS_AND_PLAY' && <span>📱 1기기 2인 대전</span>}
              {gameMode === 'VS_AI' && <span>🤖 AI 연습 모드</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors shadow-sm"
            title="렌주룰 규칙"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition-colors shadow-sm"
            title="설정"
          >
            <SettingsIcon className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* 게임 모드 선택 탭 (3가지) */}
      <nav className="w-full grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl mb-3 shadow-inner">
        <button
          onClick={() => {
            setGameMode('WIFI_P2P');
            setIsNetworkModalOpen(!isConnected);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
            gameMode === 'WIFI_P2P'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          <span>1:1 Wi-Fi</span>
        </button>
        <button
          onClick={() => {
            setGameMode('PASS_AND_PLAY');
            resetGame(false);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
            gameMode === 'PASS_AND_PLAY'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>1폰 2인</span>
        </button>
        <button
          onClick={() => {
            setGameMode('VS_AI');
            resetGame(false);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
            gameMode === 'VS_AI'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI 봇 대전</span>
        </button>
      </nav>

      {/* 대전 상태 바 (흑/백 플레이어 & 턴 안내) */}
      <section className="w-full flex items-center justify-between bg-slate-900/80 border border-slate-800/80 rounded-2xl px-3.5 py-2.5 mb-2.5 shadow-md">
        {/* 흑돌 플레이어 */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all ${
            currentTurn === Player.BLACK && !gameEnded
              ? 'bg-slate-800 ring-2 ring-amber-400 shadow-md'
              : 'opacity-70'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-zinc-700 to-black border border-zinc-600 shadow-sm flex items-center justify-center text-[10px] text-white font-bold">
            흑
          </div>
          <div className="text-left">
            <div className="text-xs font-bold leading-tight flex items-center gap-1">
              <span>흑돌 (선공)</span>
              {gameMode === 'WIFI_P2P' && p2pRole === 'host' && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">나</span>
              )}
            </div>
            <div className="text-[10px] text-amber-400/90 font-medium">3-3/4-4/장목 금수</div>
          </div>
        </div>

        {/* 턴 중앙 표시기 */}
        <div className="flex flex-col items-center">
          {gameEnded ? (
            <div className="flex items-center gap-1 text-xs font-bold text-yellow-400 animate-bounce">
              <Trophy className="w-4 h-4" />
              <span>게임 종료</span>
            </div>
          ) : (
            <div className="text-center">
              <div
                className={`text-xs font-black tracking-wide ${
                  isMyTurn ? 'text-amber-400 animate-pulse' : 'text-slate-400'
                }`}
              >
                {isMyTurn ? '내 차례입니다!' : '상대방 차례...'}
              </div>
              <div className="text-[10px] text-slate-500">총 {moves.length}수</div>
            </div>
          )}
        </div>

        {/* 백돌 플레이어 */}
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all ${
            currentTurn === Player.WHITE && !gameEnded
              ? 'bg-slate-800 ring-2 ring-amber-400 shadow-md'
              : 'opacity-70'
          }`}
        >
          <div className="text-right">
            <div className="text-xs font-bold leading-tight flex items-center justify-end gap-1">
              {gameMode === 'WIFI_P2P' && p2pRole === 'client' && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded">나</span>
              )}
              {gameMode === 'VS_AI' && (
                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 rounded">AI</span>
              )}
              <span>백돌 (후공)</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">금수 없음 (장목 승리)</div>
          </div>
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-white to-zinc-300 border border-zinc-200 shadow-sm flex items-center justify-center text-[10px] text-black font-bold">
            백
          </div>
        </div>
      </section>

      {/* 바둑판 상단 알림 (토스트 / 이모티콘 팝업) */}
      <div className="relative w-full h-8 flex items-center justify-center mb-1">
        {toastMessage && (
          <div
            className={`absolute z-30 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-bounce ${
              toastMessage.type === 'warn'
                ? 'bg-red-500/90 text-white border border-red-400'
                : 'bg-amber-500/90 text-slate-950 border border-amber-300'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {floatingEmote && (
          <div className="absolute z-30 px-4 py-2 bg-slate-900/95 border-2 border-amber-400 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
            <span className="text-xl">{floatingEmote.emote}</span>
            <span className="text-xs font-bold text-amber-300">{floatingEmote.label}</span>
          </div>
        )}
      </div>

      {/* 중앙 메인 바둑판 영역 */}
      <main className="flex-1 flex flex-col items-center justify-center relative w-full my-auto">
        <OmokBoard
          board={board}
          moves={moves}
          currentTurn={currentTurn}
          myPlayer={myPlayer}
          isMyTurn={isMyTurn}
          gameEnded={gameEnded}
          winLine={winLine}
          forbiddenMoves={forbiddenMoves}
          showForbiddenHints={showForbiddenHints}
          showMoveNumbers={showMoveNumbers}
          touchConfirmMode={touchConfirmMode}
          onMakeMove={handleMakeMove}
        />

        {/* 게임 종료 오버레이 안내판 */}
        {gameEnded && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-40 bg-slate-950/90 border-2 border-amber-400 rounded-3xl p-6 shadow-2xl backdrop-blur-md text-center animate-fade-in">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2 animate-bounce" />
            <h2 className="text-2xl font-black text-amber-300 mb-1">
              {winner === Player.BLACK ? '흑돌(Black) 승리!' : '백돌(White) 승리!'}
            </h2>
            <p className="text-sm text-slate-300 mb-5">{winReason}</p>

            <div className="flex gap-2.5 justify-center">
              <button
                onClick={handleRematchClick}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-3 rounded-2xl shadow-lg transition-transform active:scale-95 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>재대결 시작</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 무르기 / 재대결 요청 수락 팝업 */}
      {pendingUndoRequest && (
        <div className="fixed inset-x-4 bottom-24 z-50 bg-slate-900 border-2 border-amber-500 p-4 rounded-3xl shadow-2xl max-w-sm mx-auto flex items-center justify-between animate-fade-in">
          <div>
            <div className="text-xs font-bold text-amber-400">무르기 요청</div>
            <div className="text-xs text-slate-300">상대방이 한 수를 무르길 원합니다.</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPendingUndoRequest(false);
                p2pRef.current?.send({ type: 'UNDO_RESPONSE', accepted: true });
                performUndo(2);
                showToast('무르기를 수락했습니다.', 'info');
              }}
              className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold text-xs"
            >
              수락
            </button>
            <button
              onClick={() => {
                setPendingUndoRequest(false);
                p2pRef.current?.send({ type: 'UNDO_RESPONSE', accepted: false });
                showToast('무르기를 거절했습니다.', 'warn');
              }}
              className="p-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
            >
              거절
            </button>
          </div>
        </div>
      )}

      {pendingRematchRequest && (
        <div className="fixed inset-x-4 bottom-24 z-50 bg-slate-900 border-2 border-amber-500 p-4 rounded-3xl shadow-2xl max-w-sm mx-auto flex items-center justify-between animate-fade-in">
          <div>
            <div className="text-xs font-bold text-amber-400">재대결 요청</div>
            <div className="text-xs text-slate-300">상대방이 새 게임을 요청했습니다.</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPendingRematchRequest(false);
                resetGame(true);
                showToast('재대결을 수락했습니다!', 'info');
              }}
              className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold text-xs"
            >
              수락
            </button>
            <button
              onClick={() => {
                setPendingRematchRequest(false);
                p2pRef.current?.send({ type: 'REMATCH_RESPONSE', accepted: false });
                showToast('재대결을 거절했습니다.', 'warn');
              }}
              className="p-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
            >
              거절
            </button>
          </div>
        </div>
      )}

      {/* 하단 컨트롤 바 */}
      <footer className="w-full flex items-center justify-between pt-2 pb-1 gap-2">
        <EmoteBar onSendEmote={handleSendEmote} disabled={gameMode !== 'WIFI_P2P' || !isConnected} />

        <div className="flex items-center gap-1.5 ml-auto">
          {gameMode === 'WIFI_P2P' && !isConnected && (
            <button
              onClick={() => setIsNetworkModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-full text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>방 연결</span>
            </button>
          )}

          <button
            onClick={handleUndoClick}
            disabled={moves.length === 0 || gameEnded}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-full text-xs font-medium text-slate-300 transition-colors shadow-sm"
            title="한 수 무르기"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>무르기</span>
          </button>

          <button
            onClick={handleResign}
            disabled={gameEnded || moves.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900/80 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-40 border border-slate-800 rounded-full text-xs font-medium text-slate-300 transition-colors shadow-sm"
            title="기권하기"
          >
            <Flag className="w-3.5 h-3.5 text-red-400" />
            <span>기권</span>
          </button>
        </div>
      </footer>

      {/* 모달 컴포넌트들 */}
      <NetworkModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
        onHost={handleHostRoom}
        onJoin={handleJoinRoom}
        currentRoom={currentRoom}
        isHosting={isHosting}
        isConnecting={isConnecting}
        connectionError={connectionError}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        showForbiddenHints={showForbiddenHints}
        setShowForbiddenHints={setShowForbiddenHints}
        showMoveNumbers={showMoveNumbers}
        setShowMoveNumbers={setShowMoveNumbers}
        touchConfirmMode={touchConfirmMode}
        setTouchConfirmMode={setTouchConfirmMode}
        onOpenRules={() => setIsRulesModalOpen(true)}
      />

      <RulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />
    </div>
  );
}
export default App;
