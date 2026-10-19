import React, { useEffect, useRef } from 'react';
import { Stroke, Mode, MirrorAxis } from '../constants';
import { getTransforms } from '../symmetry';
import { renderCanvas } from '../renderer';
import { RobotMascot } from '../components/RobotMascot';
import { Confetti } from '../components/Confetti';
import { playFinishSound, playClickSound } from '../sound';
import { RotateCcw, PlusCircle, Home, Sparkles } from 'lucide-react';

interface FinishScreenProps {
  strokes: Stroke[];
  mode: Mode;
  axis: MirrorAxis;
  onContinueDrawing: () => void;
  onNewDrawing: () => void;
  onHome: () => void;
}

export const FinishScreen: React.FC<FinishScreenProps> = ({
  strokes,
  mode,
  axis,
  onContinueDrawing,
  onNewDrawing,
  onHome,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Play celebratory jingle on screen mount
    playFinishSound();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Render artwork in high resolution
    const size = 500;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const transforms = getTransforms(mode, axis);
    renderCanvas(canvas, strokes, transforms, {
      showGuidelines: false, // Pure artwork without dashed lines
      mode,
      axis,
      onlyOriginals: false,
    });
  }, [strokes, mode, axis]);

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center p-3 md:p-6 factory-bg select-none">
      {/* Outer Card Frame */}
      <div className="w-full max-w-2xl bg-[#FFF8EE] border-[3.5px] border-[#3A3350] rounded-3xl p-5 md:p-8 shadow-[0_8px_0_#3A3350] flex flex-col items-center text-center relative animate-pop-in">
        
        {/* Confetti celebration */}
        <Confetti active={true} durationMs={4500} />

        {/* Mascot + Title Header */}
        <div className="flex flex-col items-center mb-4">
          <RobotMascot
            size={74}
            speechText="우와! 정말 멋진 대칭 작품이야!"
          />
          <h1 className="font-jua text-3xl md:text-5xl text-[#3A3350] mt-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-[#FFD23F] fill-[#FFD23F]" />
            <span>대칭 작품 완성!</span>
            <Sparkles className="w-8 h-8 text-[#FFD23F] fill-[#FFD23F]" />
          </h1>
          <p className="font-body text-[#3A3350]/70 text-sm md:text-base mt-1">
            {mode === 'mirror'
              ? `선대칭 (${axis === 'vertical' ? '세로' : axis === 'horizontal' ? '가로' : '둘 다'}) 공장 완성작`
              : '점대칭 (빙글) 공장 완성작'}
          </p>
        </div>

        {/* High quality framed artwork preview */}
        <div className="w-full max-w-sm md:max-w-md aspect-square rounded-3xl border-4 border-[#3A3350] bg-white p-2 shadow-[0_6px_0_#3A3350] mb-6 flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain rounded-2xl block"
          />
        </div>

        {/* 3 Kid-friendly Action Buttons */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 w-full">
          {/* 1. 다시 그리기 (Continue Drawing) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onContinueDrawing();
            }}
            aria-label="작업실로 돌아가서 계속 그리기"
            className="min-h-[64px] md:min-h-[72px] p-2 rounded-2xl bg-[#7FD8BE] text-[#3A3350] border-[3px] border-[#3A3350] font-jua jelly-btn flex flex-col items-center justify-center cursor-pointer"
          >
            <RotateCcw className="w-6 h-6 mb-1" />
            <span className="text-sm md:text-base">다시 그리기</span>
          </button>

          {/* 2. 새로 그리기 (New Drawing) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onNewDrawing();
            }}
            aria-label="새로운 대칭 그림 그리기"
            className="min-h-[64px] md:min-h-[72px] p-2 rounded-2xl bg-[#FF9EB5] text-[#3A3350] border-[3px] border-[#3A3350] font-jua jelly-btn flex flex-col items-center justify-center cursor-pointer"
          >
            <PlusCircle className="w-6 h-6 mb-1" />
            <span className="text-sm md:text-base">새로 그리기</span>
          </button>

          {/* 3. 홈 (Home) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onHome();
            }}
            aria-label="홈 화면으로 돌아가기"
            className="min-h-[64px] md:min-h-[72px] p-2 rounded-2xl bg-[#8EC9FF] text-[#3A3350] border-[3px] border-[#3A3350] font-jua jelly-btn flex flex-col items-center justify-center cursor-pointer"
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-sm md:text-base">홈</span>
          </button>
        </div>

      </div>
    </div>
  );
};
