import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Wifi, Smartphone, Copy, Check, ShieldAlert, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHost: (code: string) => Promise<string>;
  onJoin: (code: string) => Promise<void>;
  currentRoom: string;
  isHosting: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({
  isOpen,
  onClose,
  onHost,
  onJoin,
  currentRoom,
  isHosting,
  isConnecting,
  connectionError,
}) => {
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [joinCode, setJoinCode] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // QR 코드 생성
  useEffect(() => {
    if (isHosting && currentRoom) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
      QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isHosting, currentRoom]);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    await onHost(code);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      await onJoin(joinCode.trim());
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${currentRoom}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* 모달 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>

        {/* 타이틀 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
            <Wifi className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">1:1 Wi-Fi P2P 대전</h2>
            <p className="text-xs text-slate-400">스마트폰 2대를 Wi-Fi 또는 핫스팟으로 연결</p>
          </div>
        </div>

        {/* 탭 전환 (방 만들기 vs 방 참가하기) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 rounded-2xl mb-6 border border-slate-800">
          <button
            onClick={() => setTab('host')}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'host'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            방 만들기 (1P 흑)
          </button>
          <button
            onClick={() => setTab('join')}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === 'join'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            방 참가하기 (2P 백)
          </button>
        </div>

        {/* 에러 메시지 알림 */}
        {connectionError && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-2xl flex items-center gap-2 text-xs text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{connectionError}</span>
          </div>
        )}

        {/* 방 만들기 탭 내용 */}
        {tab === 'host' && (
          <div className="flex flex-col items-center">
            {isHosting ? (
              <div className="w-full flex flex-col items-center">
                <div className="text-center mb-4">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    상대방 접속 대기 중...
                  </span>
                  <div className="mt-2 text-3xl font-black text-amber-300 tracking-widest font-mono">
                    {currentRoom}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">상대방 스마트폰 카메라로 QR 코드를 비추세요</p>
                </div>

                {/* QR 코드 캔버스 */}
                {qrDataUrl && (
                  <div className="p-3 bg-white rounded-2xl shadow-xl mb-4 border-4 border-amber-500/30">
                    <img src={qrDataUrl} alt="Room QR Code" className="w-48 h-48 rounded-lg" />
                  </div>
                )}

                <div className="w-full flex gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? '초대 링크 복사됨!' : '초대 링크 복사'}
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>상대방이 접속하면 자동으로 게임이 시작됩니다.</span>
                </div>
              </div>
            ) : (
              <div className="w-full text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold mb-1">새 게임 방 열기</h3>
                <p className="text-xs text-slate-400 mb-6">
                  내가 방장이 되어 흑(Black)으로 선공을 시작합니다.
                </p>

                <button
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>방 생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>방 만들기 & QR 코드 표시</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 방 참가하기 탭 내용 */}
        {tab === 'join' && (
          <form onSubmit={handleJoinSubmit} className="flex flex-col">
            <div className="text-center mb-4">
              <h3 className="text-base font-bold mb-1">상대방 방에 참가</h3>
              <p className="text-xs text-slate-400">
                호스트 화면의 4자리 방 번호를 입력하거나 카메라로 QR을 스캔하세요.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                4자리 방 코드 입력
              </label>
              <input
                type="text"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 7824"
                className="w-full py-3 px-4 bg-slate-950/80 border border-slate-700 rounded-2xl text-center text-2xl font-mono tracking-widest text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isConnecting || joinCode.trim().length < 4}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>연결 중...</span>
                </>
              ) : (
                <>
                  <span>입장하기 (백돌 후공)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* 연결 안내 가이드 아코디언 */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-amber-400" />
            <span>스마트폰 1:1 연결 꿀팁</span>
          </div>
          <p className="leading-relaxed">
            • <strong className="text-slate-200">같은 Wi-Fi:</strong> 두 스마트폰이 동일한 와이파이(공유기)에 연결되어 있으면 최고 속도로 대전됩니다.
          </p>
          <p className="leading-relaxed">
            • <strong className="text-slate-200">야외 / Wi-Fi 없을 때:</strong> 한 스마트폰의 <span className="text-amber-300">개인용 핫스팟</span>을 켜고 다른 폰이 연결하면 데이터 소모 없이 1:1 대전이 가능합니다!
          </p>
          <p className="leading-relaxed">
            • <strong className="text-slate-200">iPhone / Android 호환:</strong> 기종 상관없이 카메라 기본 앱으로 QR 코드를 비추면 Safari/Chrome에서 바로 열립니다.
          </p>
        </div>
      </div>
    </div>
  );
};
