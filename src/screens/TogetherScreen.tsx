import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, Point, TOGETHER_LEFT_COLORS, TOGETHER_RIGHT_COLORS } from '../constants';
import { mirrorV } from '../symmetry';
import { saveSession } from '../storage';
import { playDrawStartSound, playClickSound, playWobbleSound } from '../sound';
import { Home, Undo2, Star, Sparkles } from 'lucide-react';

interface TogetherScreenProps {
  onHome: () => void;
  onFinish: (strokes: Stroke[]) => void;
}

interface ActivePointerTrack {
  owner: 'left' | 'right';
  stroke: Stroke;
}

export const TogetherScreen: React.FC<TogetherScreenProps> = ({ onHome, onFinish }) => {
  const [leftColor, setLeftColor] = useState<string>(TOGETHER_LEFT_COLORS[0]);
  const [rightColor, setRightColor] = useState<string>(TOGETHER_RIGHT_COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isMirrorActive, setIsMirrorActive] = useState<boolean>(false);
  const [finishBounce, setFinishBounce] = useState<boolean>(false);

  // Session stats tracking
  const startTimeRef = useRef<number>(Date.now());
  const strokesRef = useRef<Stroke[]>([]);
  strokesRef.current = strokes;

  // Multi-touch active tracking per pointerId
  const activePointersRef = useRef<Map<number, ActivePointerTrack>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Subtle background tint for sides
    ctx.fillStyle = '#F5FAFF';
    ctx.fillRect(0, 0, width * 0.5, height);

    // Center divider line
    ctx.save();
    ctx.strokeStyle = '#3A3350';
    ctx.lineWidth = Math.max(3, width * 0.006);
    ctx.beginPath();
    ctx.moveTo(width * 0.5, 0);
    ctx.lineTo(width * 0.5, height);
    ctx.stroke();
    ctx.restore();

    // Draw all completed and ongoing strokes
    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      const pixelSize = stroke.size * width;

      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = pixelSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x * width, stroke.points[0].y * height, pixelSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const pCurr = stroke.points[i];
          const pNext = stroke.points[i + 1];
          const midX = (pCurr.x + pNext.x) / 2;
          const midY = (pCurr.y + pNext.y) / 2;
          ctx.quadraticCurveTo(pCurr.x * width, pCurr.y * height, midX * width, midY * height);
        }
        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x * width, last.y * height);
        ctx.stroke();
      }
      ctx.restore();
    }

    // If '거울 비추기' is held active: overlay left strokes mirrored onto the right side!
    if (isMirrorActive) {
      const leftStrokes = strokesRef.current.filter((s) => s.owner === 'left');
      ctx.save();
      ctx.strokeStyle = '#8C6CFF'; // Purple dashed mirror outline
      ctx.lineWidth = Math.max(3.5, width * 0.009);
      ctx.setLineDash([8, 8]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of leftStrokes) {
        if (stroke.points.length === 0) continue;
        const mirroredPoints = stroke.points.map(mirrorV);

        ctx.beginPath();
        ctx.moveTo(mirroredPoints[0].x * width, mirroredPoints[0].y * height);
        for (let i = 1; i < mirroredPoints.length - 1; i++) {
          const pCurr = mirroredPoints[i];
          const pNext = mirroredPoints[i + 1];
          const midX = (pCurr.x + pNext.x) / 2;
          const midY = (pCurr.y + pNext.y) / 2;
          ctx.quadraticCurveTo(pCurr.x * width, pCurr.y * height, midX * width, midY * height);
        }
        const last = mirroredPoints[mirroredPoints.length - 1];
        ctx.lineTo(last.x * width, last.y * height);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [isMirrorActive]);

  // Handle Resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const size = Math.floor(Math.min(rect.width, rect.height));
    if (size <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    redraw();
  }, [redraw]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    redraw();
  }, [redraw, strokes]);

  // Convert pointer event to normalized point
  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    // Determine owner based on touch starting coordinate: Left half (<=0.5) vs Right half (>0.5)
    const owner: 'left' | 'right' = pt.x <= 0.5 ? 'left' : 'right';
    const color = owner === 'left' ? leftColor : rightColor;

    const newStroke: Stroke = {
      id: `together_${owner}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      kind: 'brush',
      color,
      size: 0.02,
      points: [pt],
      owner,
    };

    activePointersRef.current.set(e.pointerId, { owner, stroke: newStroke });
    e.currentTarget.setPointerCapture(e.pointerId);

    setStrokes((prev) => [...prev, newStroke]);
    playDrawStartSound();
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const track = activePointersRef.current.get(e.pointerId);
    if (!track) return;

    const pt = getNormalizedPoint(e);
    if (!pt) return;

    // Constrain point to each user's designated half
    let clampedX = pt.x;
    if (track.owner === 'left') {
      clampedX = Math.min(0.5, clampedX);
    } else {
      clampedX = Math.max(0.5, clampedX);
    }

    const constrainedPoint: Point = { x: clampedX, y: pt.y };
    const last = track.stroke.points[track.stroke.points.length - 1];
    if (last) {
      const dx = constrainedPoint.x - last.x;
      const dy = constrainedPoint.y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) < 0.004) return;
    }

    track.stroke.points.push(constrainedPoint);
    setStrokes((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.id === track.stroke.id);
      if (idx >= 0) {
        next[idx] = { ...track.stroke, points: [...track.stroke.points] };
      }
      return next;
    });
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.delete(e.pointerId);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  // Undo Person 1 (left)
  const handleUndoLeft = () => {
    playClickSound();
    setStrokes((prev) => {
      const reversedIdx = [...prev].reverse().findIndex((s) => s.owner === 'left');
      if (reversedIdx === -1) return prev;
      const actualIdx = prev.length - 1 - reversedIdx;
      return prev.filter((_, idx) => idx !== actualIdx);
    });
  };

  // Undo Person 2 (right)
  const handleUndoRight = () => {
    playClickSound();
    setStrokes((prev) => {
      const reversedIdx = [...prev].reverse().findIndex((s) => s.owner === 'right');
      if (reversedIdx === -1) return prev;
      const actualIdx = prev.length - 1 - reversedIdx;
      return prev.filter((_, idx) => idx !== actualIdx);
    });
  };

  // Finish Together Mode
  const handleFinish = async () => {
    if (strokes.length === 0) {
      setFinishBounce(true);
      playWobbleSound();
      setTimeout(() => setFinishBounce(false), 500);
      return;
    }
    playClickSound();

    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    await saveSession({
      date: new Date().toISOString(),
      mode: 'together',
      axis: 'none',
      durationSec,
      strokeCount: strokes.length,
      stampCount: 0,
      revealUsed: false,
      axisChanges: 0,
      aiUsed: false,
    });

    onFinish(strokes);
  };

  return (
    <div className="w-full h-full min-h-screen flex flex-col p-2 md:p-5 factory-bg select-none touch-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-2 md:mb-4 px-1 max-w-6xl mx-auto w-full">
        {/* Left: Home Button + Title */}
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
          <h1 className="font-jua text-2xl md:text-4xl text-[#3A3350]">
            같이 만들기
          </h1>
        </div>

        {/* Center & Right: Mirror Hold Button + Finish */}
        <div className="flex items-center gap-3">
          {/* Mirror Hold Button (꾹 누르기) */}
          <button
            type="button"
            onPointerDown={() => {
              playClickSound();
              setIsMirrorActive(true);
            }}
            onPointerUp={() => setIsMirrorActive(false)}
            onPointerCancel={() => setIsMirrorActive(false)}
            onPointerLeave={() => setIsMirrorActive(false)}
            aria-label="거울 비추기 (누르고 있기)"
            className={`
              min-h-[56px] md:min-h-[64px] px-4 md:px-5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center justify-center gap-2 cursor-pointer transition-all
              ${isMirrorActive
                ? 'bg-[#8C6CFF] text-white shadow-[0_1px_0_#3A3350] translate-y-[3px]'
                : 'bg-[#B9A3FF] text-[#3A3350] jelly-btn'
              }
            `}
          >
            <span className="text-xl">🪞</span>
            <span>거울 비추기 (꾹 누르기)</span>
          </button>

          {/* Finish Button */}
          <button
            type="button"
            onClick={handleFinish}
            aria-label="작품 완성하기"
            className={`
              min-h-[56px] md:min-h-[64px] px-5 md:px-6 rounded-2xl border-[3.5px] border-[#3A3350] font-jua text-lg md:text-xl
              flex items-center justify-center gap-1.5 cursor-pointer transition-all
              ${strokes.length > 0
                ? 'bg-[#FFD66B] text-[#3A3350] jelly-card'
                : 'bg-[#FFD66B]/60 text-[#3A3350]/60 jelly-btn'
              }
              ${finishBounce ? 'animate-brush-bounce ring-4 ring-[#FF5C8A]' : ''}
            `}
          >
            <Star className={`w-5 h-5 ${strokes.length > 0 ? 'text-[#FF5C8A] fill-[#FF5C8A]' : ''}`} />
            <span>완성!</span>
          </button>
        </div>
      </div>

      {/* Main Split Stage Frame matching Wireframe ⑥ */}
      <div className="flex-1 flex flex-row items-center justify-center gap-3 md:gap-5 max-w-6xl mx-auto w-full min-h-0">

        {/* LEFT COLUMN: 하나 (Person 1) */}
        <div className="w-20 md:w-28 bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-3 shadow-[0_6px_0_#3A3350] flex flex-col items-center justify-between gap-3 shrink-0">
          <div className="font-jua text-xl md:text-2xl text-[#3A3350] bg-[#8EC9FF]/30 w-full py-1 rounded-xl text-center border-2 border-[#3A3350]">
            하나
          </div>

          {/* 4 Colors */}
          <div className="flex flex-col gap-2.5 my-auto">
            {TOGETHER_LEFT_COLORS.map((color) => {
              const isSelected = leftColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setLeftColor(color);
                  }}
                  aria-label={`하나 색상 선택`}
                  style={{ backgroundColor: color }}
                  className={`
                    w-14 h-14 min-w-[56px] min-h-[56px] rounded-full border-[3.5px]
                    flex items-center justify-center cursor-pointer transition-all
                    ${isSelected
                      ? 'border-[#3A3350] scale-105 shadow-[0_3px_0_#3A3350] ring-4 ring-[#3A3350]/20'
                      : 'border-[#3A3350]/60 hover:scale-102'
                    }
                  `}
                >
                  {isSelected && (
                    <span className="text-white text-xl font-bold drop-shadow-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Person 1 Undo */}
          <button
            type="button"
            onClick={handleUndoLeft}
            aria-label="하나 되돌리기"
            className="w-full min-h-[56px] rounded-2xl bg-white border-[3px] border-[#3A3350] font-jua text-xs jelly-btn flex flex-col items-center justify-center p-1 cursor-pointer"
          >
            <Undo2 className="w-5 h-5 text-[#3A3350]" />
            <span className="mt-0.5">되돌리기</span>
          </button>
        </div>

        {/* CENTER CANVAS */}
        <div
          ref={containerRef}
          className="flex-1 w-full flex flex-col items-center justify-center min-h-[300px] md:min-h-[480px] p-1 relative"
        >
          <div className="relative border-4 border-[#3A3350] rounded-3xl overflow-hidden shadow-[0_8px_0_#3A3350] bg-white">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="block cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Hint bar at bottom */}
          <div className="mt-2 bg-white/90 border-2 border-[#3A3350] px-4 py-1 rounded-full text-xs md:text-sm font-jua text-[#8C6CFF] flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#8C6CFF]" />
            <span>보라 점선 = 왼쪽 그림의 거울 모양</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 둘 (Person 2) */}
        <div className="w-20 md:w-28 bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-3 shadow-[0_6px_0_#3A3350] flex flex-col items-center justify-between gap-3 shrink-0">
          <div className="font-jua text-xl md:text-2xl text-[#3A3350] bg-[#FF9EB5]/30 w-full py-1 rounded-xl text-center border-2 border-[#3A3350]">
            둘
          </div>

          {/* 4 Colors */}
          <div className="flex flex-col gap-2.5 my-auto">
            {TOGETHER_RIGHT_COLORS.map((color) => {
              const isSelected = rightColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setRightColor(color);
                  }}
                  aria-label={`둘 색상 선택`}
                  style={{ backgroundColor: color }}
                  className={`
                    w-14 h-14 min-w-[56px] min-h-[56px] rounded-full border-[3.5px]
                    flex items-center justify-center cursor-pointer transition-all
                    ${isSelected
                      ? 'border-[#3A3350] scale-105 shadow-[0_3px_0_#3A3350] ring-4 ring-[#3A3350]/20'
                      : 'border-[#3A3350]/60 hover:scale-102'
                    }
                  `}
                >
                  {isSelected && (
                    <span className="text-white text-xl font-bold drop-shadow-xs">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Person 2 Undo */}
          <button
            type="button"
            onClick={handleUndoRight}
            aria-label="둘 되돌리기"
            className="w-full min-h-[56px] rounded-2xl bg-white border-[3px] border-[#3A3350] font-jua text-xs jelly-btn flex flex-col items-center justify-center p-1 cursor-pointer"
          >
            <Undo2 className="w-5 h-5 text-[#3A3350]" />
            <span className="mt-0.5">되돌리기</span>
          </button>
        </div>

      </div>
    </div>
  );
};
