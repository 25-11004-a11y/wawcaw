import React from 'react';
import { playClickSound } from '../sound';

interface PatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMirror: () => void;
}

export const PatternModal: React.FC<PatternModalProps> = ({
  isOpen,
  onClose,
  onStartMirror,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-pop-in"
    >
      <div className="bg-[#FFF8EE] border-4 border-[#3A3350] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-[0_8px_0_#3A3350] text-center flex flex-col items-center relative">
        {/* Close button in top-right */}
        <button
          type="button"
          aria-label="닫기"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#FF9EB5] border-2 border-[#3A3350] font-jua text-lg jelly-btn flex items-center justify-center cursor-pointer"
        >
          ✖
        </button>

        <span className="text-3xl mb-1">🔍</span>
        <h2 id="pattern-modal-title" className="font-jua text-2xl md:text-3xl text-[#3A3350] mb-1">
          오늘의 무늬 탐정
        </h2>
        <p className="font-jua text-[#8C6CFF] text-lg mb-4">전통 연꽃무늬</p>

        {/* SVG illustration of traditional lotus pattern */}
        <div className="w-48 h-48 bg-white rounded-2xl border-[3px] border-[#3A3350] p-3 flex items-center justify-center mb-4 shadow-inner relative overflow-hidden">
          {/* Dashed symmetry line in center */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-r-2 border-dashed border-[#7FD8BE] z-10" />

          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            {/* Center lotus petal */}
            <path
              d="M50 20 C42 40 40 65 50 78 C60 65 58 40 50 20Z"
              fill="#FF9EB5"
              stroke="#3A3350"
              strokeWidth="2.5"
            />
            {/* Left side petals */}
            <path
              d="M48 35 C30 45 22 65 42 76 C40 60 44 45 48 35Z"
              fill="#FFD23F"
              stroke="#3A3350"
              strokeWidth="2"
            />
            <path
              d="M44 48 C20 55 18 78 36 82 C34 70 38 58 44 48Z"
              fill="#7FD8BE"
              stroke="#3A3350"
              strokeWidth="2"
            />
            {/* Right side mirrored petals */}
            <path
              d="M52 35 C70 45 78 65 58 76 C60 60 56 45 52 35Z"
              fill="#FFD23F"
              stroke="#3A3350"
              strokeWidth="2"
            />
            <path
              d="M56 48 C80 55 82 78 64 82 C66 70 62 58 56 48Z"
              fill="#7FD8BE"
              stroke="#3A3350"
              strokeWidth="2"
            />
            {/* Stem / Base */}
            <path
              d="M42 82 Q50 86 58 82 Q50 92 42 82Z"
              fill="#3FA7FF"
              stroke="#3A3350"
              strokeWidth="2"
            />
          </svg>
        </div>

        <p className="font-body text-[#3A3350] text-sm md:text-base leading-relaxed mb-5 bg-[#EAF9F5] p-3 rounded-xl border border-[#7FD8BE]">
          연꽃무늬는 가운데 <strong>민트색 선</strong>을 기준으로<br />
          왼쪽과 오른쪽이 똑같은 <strong>선대칭</strong> 무늬예요!
        </p>

        <button
          type="button"
          aria-label="거울 작업실에서 그려보기"
          onClick={() => {
            playClickSound();
            onClose();
            onStartMirror();
          }}
          className="w-full min-h-[64px] rounded-2xl bg-[#FFD66B] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-xl jelly-btn flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>🦋</span>
          <span>거울에서 그려보기!</span>
        </button>
      </div>
    </div>
  );
};
