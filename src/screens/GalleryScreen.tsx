import React, { useState, useEffect } from 'react';
import { Artwork, Mode } from '../constants';
import { listArtworks, deleteArtwork, listSessions, clearAllData, getStorageType } from '../storage';
import { exportImage } from '../exportImage';
import { RobotMascot } from '../components/RobotMascot';
import { ConfirmModal } from '../components/ConfirmModal';
import { playClickSound, playWobbleSound } from '../sound';
import { Home, Trash2, Download, X, Sparkles, Database } from 'lucide-react';

interface GalleryScreenProps {
  onHome: () => void;
  onStartMode: (mode: Mode) => void;
}

export const GalleryScreen: React.FC<GalleryScreenProps> = ({ onHome, onStartMode }) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [artworkToDelete, setArtworkToDelete] = useState<Artwork | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [isDebug, setIsDebug] = useState<boolean>(false);

  // Check ?debug=1
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      setIsDebug(searchParams.get('debug') === '1');
    } catch {
      // Ignore
    }
  }, []);

  // Load artworks & sessions
  const loadData = async () => {
    const list = await listArtworks();
    setArtworks(list);

    // Generate thumbnails
    const thumbs: Record<string, string> = {};
    for (const art of list) {
      thumbs[art.id] = exportImage(art.strokes, art.mode, art.axis, 512);
    }
    setThumbnails(thumbs);

    const sessions = await listSessions();
    setSessionCount(sessions.length);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Delete single artwork
  const handleConfirmDelete = async () => {
    if (!artworkToDelete) return;
    playWobbleSound();
    await deleteArtwork(artworkToDelete.id);
    setArtworkToDelete(null);
    if (selectedArtwork?.id === artworkToDelete.id) {
      setSelectedArtwork(null);
    }
    await loadData();
  };

  // Download high-res PNG
  const handleDownload = (art: Artwork) => {
    playClickSound();
    try {
      const highResUrl = exportImage(art.strokes, art.mode, art.axis, 1024);
      const link = document.createElement('a');
      link.href = highResUrl;
      const dateStr = new Date(art.createdAt).toISOString().slice(0, 10);
      link.download = `대칭공장_${art.card.title}_${dateStr}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Ignore
    }
  };

  // Download Sessions CSV (?debug=1)
  const handleDownloadSessionsCsv = async () => {
    playClickSound();
    const sessions = await listSessions();
    const headers = 'date,mode,axis,durationSec,strokeCount,stampCount,revealUsed,axisChanges,aiUsed';
    const rows = sessions.map(
      (s) =>
        `"${s.date}","${s.mode}","${s.axis}",${s.durationSec},${s.strokeCount},${s.stampCount},${s.revealUsed},${s.axisChanges},${s.aiUsed}`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `대칭공장_놀이기록_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear all data (?debug=1)
  const handleClearAll = async () => {
    setShowClearAllModal(false);
    await clearAllData();
    await loadData();
  };

  const getModeIcon = (art: Artwork) => {
    if (art.mode === 'together') return '👥';
    if (art.mode === 'spin') return '🎐';
    return '🦋';
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col p-3 md:p-6 factory-bg select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onHome();
            }}
            aria-label="홈으로 돌아가기"
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white border-[3px] border-[#3A3350] jelly-btn flex items-center justify-center cursor-pointer"
          >
            <Home className="w-7 h-7 text-[#3A3350]" />
          </button>
          <h1 className="font-jua text-3xl md:text-5xl text-[#3A3350]">
            내 작품
          </h1>
        </div>

        <div className="font-jua text-sm md:text-lg text-[#3A3350] bg-white border-2 border-[#3A3350] px-4 py-1.5 rounded-full shadow-xs">
          작품 {artworks.length}개
        </div>
      </div>

      {/* Main Gallery Area */}
      <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col">
        {artworks.length === 0 ? (
          /* Empty state: Dduk-ddak-i + "첫 작품을 만들어 볼까?" */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border-[3.5px] border-[#3A3350] rounded-3xl shadow-[0_6px_0_#3A3350] min-h-[380px]">
            <RobotMascot size={90} />
            <h2 className="font-jua text-2xl md:text-3xl text-[#3A3350] mt-4 mb-2">
              첫 작품을 만들어 볼까?
            </h2>
            <p className="font-body text-[#3A3350]/70 text-base mb-6">
              거울 공장에서 나만의 멋진 대칭 그림을 그려봐요!
            </p>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onStartMode('mirror');
              }}
              aria-label="거울 만들기 시작하기"
              className="min-h-[64px] px-8 rounded-2xl bg-[#7FD8BE] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-xl jelly-btn flex items-center gap-2 cursor-pointer shadow-[0_4px_0_#3A3350]"
            >
              <span>🦋</span>
              <span>거울 만들기</span>
            </button>
          </div>
        ) : (
          /* Artwork Grid matching Wireframe ⑤ */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {artworks.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  playClickSound();
                  setSelectedArtwork(art);
                }}
                className="group bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-3 shadow-[0_6px_0_#3A3350] flex flex-col items-center cursor-pointer hover:scale-[1.02] transition-transform"
              >
                {/* Framed Thumbnail */}
                <div className="w-full aspect-square rounded-2xl border-2 border-[#3A3350] bg-[#FFF8EE] p-1.5 overflow-hidden flex items-center justify-center mb-2.5">
                  {thumbnails[art.id] ? (
                    <img
                      src={thumbnails[art.id]}
                      alt={art.card.title}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl" />
                  )}
                </div>

                {/* Info under thumbnail */}
                <div className="w-full flex items-center justify-center gap-1.5 text-center">
                  <span className="text-sm">{getModeIcon(art)}</span>
                  <span className="font-jua text-sm md:text-base text-[#3A3350] truncate">
                    {art.card.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal (Wireframe ⑤ - 3: 크게 보기 창) */}
      {selectedArtwork && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/50 backdrop-blur-xs animate-pop-in"
        >
          <div className="bg-[#FFF8EE] border-4 border-[#3A3350] rounded-3xl p-5 md:p-7 max-w-xl w-full shadow-[0_8px_0_#3A3350] flex flex-col gap-4 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedArtwork(null)}
              aria-label="닫기"
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[#FF9EB5] border-2 border-[#3A3350] font-jua text-lg jelly-btn flex items-center justify-center cursor-pointer z-10"
            >
              <X className="w-6 h-6 text-[#3A3350]" />
            </button>

            {/* Large Artwork Image */}
            <div className="w-full max-w-[280px] md:max-w-[320px] mx-auto aspect-square rounded-2xl border-4 border-[#3A3350] bg-white p-2 shadow-inner">
              <img
                src={thumbnails[selectedArtwork.id] || exportImage(selectedArtwork.strokes, selectedArtwork.mode, selectedArtwork.axis, 512)}
                alt={selectedArtwork.card.title}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Card Content Details */}
            <div className="bg-white border-2 border-[#3A3350] rounded-2xl p-4 flex flex-col gap-2.5">
              <h2 className="font-jua text-2xl text-[#3A3350] flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-[#FFD23F] fill-[#FFD23F]" />
                <span>{selectedArtwork.card.title}</span>
              </h2>
              <p className="font-body text-sm text-[#3A3350]/80">
                {selectedArtwork.card.description}
              </p>

              <div className="bg-[#EAF9F5] p-2.5 rounded-xl border border-[#7FD8BE] text-xs md:text-sm font-jua text-[#3A3350]">
                {selectedArtwork.card.symmetrySentence}
              </div>

              <div className="bg-[#FFFDF3] p-2.5 rounded-xl border border-[#FFD66B] text-xs md:text-sm font-jua text-[#3A3350]">
                대화 질문: {selectedArtwork.card.question}
              </div>
            </div>

            {/* Action Buttons: 내려받기, 지우기 */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleDownload(selectedArtwork)}
                aria-label="작품 내려받기"
                className="min-h-[58px] rounded-2xl bg-[#8EC9FF] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-lg jelly-btn flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>내려받기</span>
              </button>

              <button
                type="button"
                onClick={() => setArtworkToDelete(selectedArtwork)}
                aria-label="작품 지우기"
                className="min-h-[58px] rounded-2xl bg-white text-[#FF5C8A] border-[3px] border-[#3A3350] font-jua text-lg jelly-btn flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
                <span>지우기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={artworkToDelete !== null}
        title="작품을 지울까요?"
        message="지운 작품은 다시 되돌릴 수 없어요."
        onConfirm={handleConfirmDelete}
        onCancel={() => setArtworkToDelete(null)}
      />

      {/* Clear All Confirmation Modal (?debug=1) */}
      <ConfirmModal
        isOpen={showClearAllModal}
        title="모든 데이터를 지울까요?"
        message="작품과 놀이 기록이 모두 삭제됩니다."
        onConfirm={handleClearAll}
        onCancel={() => setShowClearAllModal(false)}
      />

      {/* Developer Tool Bar (?debug=1) */}
      {isDebug && (
        <div className="max-w-5xl mx-auto w-full mt-6 p-4 rounded-2xl bg-slate-900 text-slate-100 border-2 border-amber-400 text-xs font-mono shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-400">[개발 도구]</span>
            <span>저장소: <strong>{getStorageType()}</strong></span>
            <span>·</span>
            <span>작품 수: <strong>{artworks.length}</strong></span>
            <span>·</span>
            <span>놀이 기록: <strong>{sessionCount}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSessionsCsv}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
            >
              놀이 기록 CSV 내려받기
            </button>
            <button
              type="button"
              onClick={() => setShowClearAllModal(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer"
            >
              모두 지우기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
