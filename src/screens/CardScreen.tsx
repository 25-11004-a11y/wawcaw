import React, { useState, useEffect } from 'react';
import { Stroke, ArtworkMode, ArtworkAxis, ArtCard } from '../constants';
import { exportImage } from '../exportImage';
import { makeCard } from '../artCard';
import { saveArtwork } from '../storage';
import { RobotMascot } from '../components/RobotMascot';
import { Confetti } from '../components/Confetti';
import { playFinishSound, playClickSound } from '../sound';
import { Image as ImageIcon, Download, Pencil, Home, Sparkles } from 'lucide-react';

interface CardScreenProps {
  strokes: Stroke[];
  mode: ArtworkMode;
  axis: ArtworkAxis;
  onContinueDrawing: () => void;
  onHome: () => void;
}

export const CardScreen: React.FC<CardScreenProps> = ({
  strokes,
  mode,
  axis,
  onContinueDrawing,
  onHome,
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [card, setCard] = useState<ArtCard | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedArtworkId, setSavedArtworkId] = useState<string | null>(null);
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);

  // Generate image and card
  useEffect(() => {
    playFinishSound();

    // Export 512px JPEG (quality 0.8) for AI processing and display
    const dataUrl = exportImage(strokes, mode, axis, 512, 'image/jpeg', 0.8);
    setImageUrl(dataUrl);

    // Count unique colors
    const colors = new Set(strokes.map((s) => s.color));

    makeCard(dataUrl, mode, axis, colors.size)
      .then((generatedCard) => {
        setCard(generatedCard);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [strokes, mode, axis]);

  // Save to Gallery
  const handleSaveToGallery = async () => {
    if (isSaved || !card) return;
    playClickSound();

    try {
      const saved = await saveArtwork({
        mode,
        axis,
        strokes,
        card,
      });
      setSavedArtworkId(saved.id);
      setIsSaved(true);
      setMascotMessage('보관했어요!');
      setTimeout(() => setMascotMessage(null), 3000);
    } catch {
      // Ignore
    }
  };

  // Download 1024px PNG
  const handleDownloadImage = () => {
    playClickSound();
    try {
      const highResUrl = exportImage(strokes, mode, axis, 1024);
      const link = document.createElement('a');
      link.href = highResUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `대칭공장_${mode}_${dateStr}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center p-3 md:p-6 factory-bg select-none">
      <Confetti active={true} durationMs={3500} />

      {/* Main Container matching Wireframe ④ */}
      <div className="w-full max-w-5xl bg-[#FFF8EE] border-[3.5px] border-[#3A3350] rounded-3xl p-4 md:p-8 shadow-[0_8px_0_#3A3350] flex flex-col md:flex-row gap-6 md:gap-8 items-center animate-pop-in relative">

        {/* Left Side: Artwork Framed Preview */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
          <div className="w-full max-w-[380px] aspect-square rounded-3xl border-4 border-[#3A3350] bg-white p-3 shadow-[0_6px_0_#3A3350] flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="완성된 대칭 작품"
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : (
              <div className="w-full h-full bg-[#FFF8EE] animate-pulse rounded-2xl" />
            )}
          </div>
        </div>

        {/* Right Side: Artwork Card */}
        <div className="w-full md:w-1/2 flex flex-col justify-between">
          {isLoading ? (
            /* Loading State: Dduk-ddak-i hammering with "이름 짓는 중..." */
            <div className="bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-8 min-h-[360px] shadow-[0_6px_0_#3A3350] flex flex-col items-center justify-center text-center">
              <div className="animate-bounce mb-3 text-5xl">
                🔨
              </div>
              <RobotMascot size={72} />
              <p className="font-jua text-2xl text-[#3A3350] mt-3">
                이름 짓는 중...
              </p>
              <p className="font-body text-sm text-[#3A3350]/60 mt-1">
                뚝딱이가 작품을 살펴보고 있어요
              </p>
            </div>
          ) : (
            /* Card Content */
            <div className="bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-5 md:p-6 shadow-[0_6px_0_#3A3350] flex flex-col gap-4">
              
              {/* Card Header & Title */}
              <div>
                <div className="inline-block bg-[#FAF8FF] border-2 border-[#3A3350] rounded-full px-3 py-0.5 text-xs font-jua text-[#8C6CFF] mb-2">
                  {card?.source === 'ai' ? 'AI가 지은 이름' : '작품 카드'}
                </div>
                <h2 className="font-jua text-2xl md:text-3xl text-[#3A3350] flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#FFD23F] fill-[#FFD23F]" />
                  <span>{card?.title}</span>
                </h2>
                <p className="font-body text-sm md:text-base text-[#3A3350]/80 mt-1">
                  {card?.description}
                </p>
              </div>

              {/* Mint Box: Symmetry Story (Fixed by Code) */}
              <div className="bg-[#EAF9F5] border-2 border-[#7FD8BE] rounded-2xl p-3.5">
                <span className="inline-block bg-[#7FD8BE] text-[#3A3350] font-jua text-xs px-2.5 py-0.5 rounded-lg border border-[#3A3350] mb-1">
                  대칭 이야기
                </span>
                <p className="font-jua text-sm md:text-base text-[#3A3350] leading-snug">
                  {card?.symmetrySentence}
                </p>
              </div>

              {/* Yellow Box: Guardian Dialogue Question */}
              <div className="bg-[#FFFDF3] border-2 border-[#FFD66B] rounded-2xl p-3.5">
                <span className="inline-block bg-[#FFD66B] text-[#3A3350] font-jua text-xs px-2.5 py-0.5 rounded-lg border border-[#3A3350] mb-1">
                  같이 이야기해요
                </span>
                <p className="font-jua text-sm md:text-base text-[#3A3350] leading-snug">
                  {card?.question}
                </p>
              </div>

              {/* Footer notice */}
              {card?.isDefault && (
                <div className="text-right text-[11px] font-body text-[#3A3350]/50 -mt-1">
                  기본 카드
                </div>
              )}
            </div>
          )}

          {/* Action Buttons (2x2 grid) */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* 1. 내 작품에 저장 */}
            <button
              type="button"
              onClick={handleSaveToGallery}
              disabled={isSaved || isLoading}
              aria-label={isSaved ? '이미 보관된 작품' : '내 작품에 저장하기'}
              className={`
                min-h-[58px] rounded-2xl border-[3px] border-[#3A3350] font-jua text-base
                flex items-center justify-center gap-2 cursor-pointer transition-all
                ${isSaved
                  ? 'bg-[#7FD8BE] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                  : 'bg-[#8EC9FF] text-[#3A3350] jelly-btn'
                }
                disabled:opacity-80
              `}
            >
              <ImageIcon className="w-5 h-5" />
              <span>{isSaved ? '✓ 보관완료' : '내 작품에 저장'}</span>
            </button>

            {/* 2. 그림 내려받기 */}
            <button
              type="button"
              onClick={handleDownloadImage}
              aria-label="작품 이미지 내려받기"
              className="min-h-[58px] rounded-2xl bg-white text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-base jelly-btn flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-5 h-5 text-[#FF5C8A]" />
              <span>내려받기</span>
            </button>

            {/* 3. 다시 그리기 */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onContinueDrawing();
              }}
              aria-label="작업실로 돌아가서 계속 그리기"
              className="min-h-[54px] rounded-2xl bg-white text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm jelly-btn flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>다시 그리기</span>
            </button>

            {/* 4. 홈 */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onHome();
              }}
              aria-label="홈으로 돌아가기"
              className="min-h-[54px] rounded-2xl bg-white text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm jelly-btn flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>홈</span>
            </button>
          </div>
        </div>

        {/* Mascot Thumbs-up Bubble if saved */}
        {mascotMessage && (
          <div className="absolute top-2 right-4 z-40">
            <RobotMascot
              size={64}
              speechText={mascotMessage}
              onSpeechClose={() => setMascotMessage(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
