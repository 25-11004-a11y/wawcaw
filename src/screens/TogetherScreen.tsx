import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Stroke,
  Point,
  TOGETHER_LEFT_COLORS,
  TOGETHER_RIGHT_COLORS,
  ERASER_SIZES,
  ToolType,
} from '../constants';
import { mirrorV } from '../symmetry';
import { saveSession } from '../storage';
import { playDrawStartSound, playClickSound, playWobbleSound } from '../sound';
import { Home, Undo2, Star, Sparkles, Paintbrush, Eraser, Hand } from 'lucide-react';
import { isStrokeHit, HistoryAction, FadingStroke } from '../strokeEraser';
import { ActiveFadingStroke } from '../renderer';


interface TogetherScreenProps {
  onHome: () => void;
  onFinish: (strokes: Stroke[]) => void;
}

interface ActivePointerTrack {
  owner: 'left' | 'right';
  stroke: Stroke;
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = '#FFD23F';
  ctx.strokeStyle = '#3A3350';
  ctx.lineWidth = Math.max(1.5, size * 0.1);
  ctx.beginPath();
  const spikes = 4;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.35;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export const TogetherScreen: React.FC<TogetherScreenProps> = ({ onHome, onFinish }) => {
  const [leftTool, setLeftTool] = useState<ToolType>('brush');
  const [rightTool, setRightTool] = useState<ToolType>('brush');
  const [leftColor, setLeftColor] = useState<string>(TOGETHER_LEFT_COLORS[0]);
  const [rightColor, setRightColor] = useState<string>(TOGETHER_RIGHT_COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isMirrorActive, setIsMirrorActive] = useState<boolean>(false);
  const [finishBounce, setFinishBounce] = useState<boolean>(false);

  // Independent action histories for each player's undo
  const [leftHistory, setLeftHistory] = useState<HistoryAction[]>([]);
  const [rightHistory, setRightHistory] = useState<HistoryAction[]>([]);

  // Session stats tracking
  const startTimeRef = useRef<number>(Date.now());
  const strokesRef = useRef<Stroke[]>([]);
  strokesRef.current = strokes;

  // Multi-touch active tracking per pointerId for drawing
  const activePointersRef = useRef<Map<number, ActivePointerTrack>>(new Map());

  // Multi-touch active tracking for stroke eraser
  const activeStrokeErasersRef = useRef<
    Map<number, { owner: 'left' | 'right'; deleted: { stroke: Stroke; index: number }[] }>
  >(new Map());

  // Fading strokes for stroke eraser animation (0.2s duration)
  const fadingStrokesRef = useRef<FadingStroke[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Redraw canvas
  const redraw = useCallback(
    (activeFading?: ActiveFadingStroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Offscreen transparent layer for strokes
      const layerCanvas = document.createElement('canvas');
      layerCanvas.width = width;
      layerCanvas.height = height;
      const layerCtx = layerCanvas.getContext('2d');
      if (!layerCtx) return;

      // Draw all completed and ongoing strokes onto layerCanvas
      for (const stroke of strokesRef.current) {
        if (stroke.points.length === 0) continue;
        const pixelSize = stroke.size * width;

        layerCtx.save();
        if (stroke.kind === 'eraser') {
          layerCtx.globalCompositeOperation = 'destination-out';
          layerCtx.strokeStyle = 'rgba(0,0,0,1)';
          layerCtx.fillStyle = 'rgba(0,0,0,1)';
        } else {
          layerCtx.globalCompositeOperation = 'source-over';
          layerCtx.strokeStyle = stroke.color;
          layerCtx.fillStyle = stroke.color;
        }
        layerCtx.lineWidth = pixelSize;
        layerCtx.lineCap = 'round';
        layerCtx.lineJoin = 'round';

        if (stroke.points.length === 1) {
          layerCtx.beginPath();
          layerCtx.arc(stroke.points[0].x * width, stroke.points[0].y * height, pixelSize / 2, 0, Math.PI * 2);
          layerCtx.fill();
        } else {
          layerCtx.beginPath();
          layerCtx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
          for (let i = 1; i < stroke.points.length - 1; i++) {
            const pCurr = stroke.points[i];
            const pNext = stroke.points[i + 1];
            const midX = (pCurr.x + pNext.x) / 2;
            const midY = (pCurr.y + pNext.y) / 2;
            layerCtx.quadraticCurveTo(pCurr.x * width, pCurr.y * height, midX * width, midY * height);
          }
          const last = stroke.points[stroke.points.length - 1];
          layerCtx.lineTo(last.x * width, last.y * height);
          layerCtx.stroke();
        }
        layerCtx.restore();
      }

      // 2. Prepare canvas background
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Clear white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Subtle background tint for left side
      ctx.fillStyle = '#F5FAFF';
      ctx.fillRect(0, 0, width * 0.5, height);

      // 3. Composite strokes
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(layerCanvas, 0, 0);

      // 3-1. Draw fading strokes & sparkles (stroke eraser feedback)
      if (activeFading && activeFading.length > 0) {
        for (const item of activeFading) {
          if (item.alpha <= 0) continue;
          ctx.save();
          ctx.globalAlpha = item.alpha;
          const pixelSize = item.stroke.size * width;
          ctx.strokeStyle = item.stroke.color;
          ctx.fillStyle = item.stroke.color;
          ctx.lineWidth = pixelSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (item.stroke.points.length === 1) {
            ctx.beginPath();
            ctx.arc(item.stroke.points[0].x * width, item.stroke.points[0].y * height, pixelSize / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (item.stroke.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(item.stroke.points[0].x * width, item.stroke.points[0].y * height);
            for (let i = 1; i < item.stroke.points.length - 1; i++) {
              const pCurr = item.stroke.points[i];
              const pNext = item.stroke.points[i + 1];
              const midX = (pCurr.x + pNext.x) / 2;
              const midY = (pCurr.y + pNext.y) / 2;
              ctx.quadraticCurveTo(pCurr.x * width, pCurr.y * height, midX * width, midY * height);
            }
            const last = item.stroke.points[item.stroke.points.length - 1];
            ctx.lineTo(last.x * width, last.y * height);
            ctx.stroke();
          }
          drawSparkle(ctx, item.hitPoint.x * width, item.hitPoint.y * height, Math.max(10, width * 0.035), item.alpha);
          ctx.restore();
        }
      }

      // 4. Center divider line
      ctx.strokeStyle = '#3A3350';
      ctx.lineWidth = Math.max(3, width * 0.006);
      ctx.beginPath();
      ctx.moveTo(width * 0.5, 0);
      ctx.lineTo(width * 0.5, height);
      ctx.stroke();
      ctx.restore();

      // 5. If '거울 비추기' is held active: overlay left brush strokes mirrored onto the right side!
      if (isMirrorActive) {
        const leftStrokes = strokesRef.current.filter((s) => s.owner === 'left' && s.kind !== 'eraser');
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
    },
    [isMirrorActive]
  );

  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  // Start 0.2s fading animation loop
  const startFadingAnimation = useCallback(() => {
    if (animFrameRef.current !== null) return;

    const frame = () => {
      const now = performance.now();
      fadingStrokesRef.current = fadingStrokesRef.current.filter(
        (f) => now - f.startTime < f.duration
      );

      const activeFading: ActiveFadingStroke[] = fadingStrokesRef.current.map((f) => ({
        stroke: f.stroke,
        alpha: Math.max(0, 1 - (now - f.startTime) / f.duration),
        hitPoint: f.hitPoint,
      }));

      redrawRef.current(activeFading);

      if (fadingStrokesRef.current.length > 0) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        animFrameRef.current = null;
        redrawRef.current();
      }
    };

    animFrameRef.current = requestAnimationFrame(frame);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Handle Resize - strictly only on window resize or initial mount
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

    redrawRef.current();
  }, []);

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

  // Erase strokes intersecting pt belonging to the specific player
  const eraseTogetherStrokes = useCallback(
    (owner: 'left' | 'right', pt: Point, pointerId: number) => {
      setStrokes((prevStrokes) => {
        const remaining: Stroke[] = [];
        const newlyDeleted: { stroke: Stroke; index: number }[] = [];

        for (let i = 0; i < prevStrokes.length; i++) {
          const s = prevStrokes[i];
          // Only delete strokes drawn by this person, and never rub-erasers
          if (s.owner !== owner || s.kind === 'eraser') {
            remaining.push(s);
            continue;
          }

          if (isStrokeHit(pt, s, [(p) => p], 0.03)) {
            newlyDeleted.push({ stroke: s, index: i });
            fadingStrokesRef.current.push({
              stroke: s,
              startTime: performance.now(),
              duration: 200,
              hitPoint: pt,
              transforms: [(p) => p],
            });
          } else {
            remaining.push(s);
          }
        }

        if (newlyDeleted.length > 0) {
          playClickSound();
          const tracker = activeStrokeErasersRef.current.get(pointerId);
          if (tracker) {
            tracker.deleted.push(...newlyDeleted);
          }
          startFadingAnimation();
          return remaining;
        }
        return prevStrokes;
      });
    },
    [startFadingAnimation]
  );

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedPoint(e);
    if (!pt) return;

    // Determine owner based on touch starting coordinate: Left half (<=0.5) vs Right half (>0.5)
    const owner: 'left' | 'right' = pt.x <= 0.5 ? 'left' : 'right';
    const activeTool = owner === 'left' ? leftTool : rightTool;

    if (activeTool === 'strokeEraser') {
      activeStrokeErasersRef.current.set(e.pointerId, { owner, deleted: [] });
      e.currentTarget.setPointerCapture(e.pointerId);
      eraseTogetherStrokes(owner, pt, e.pointerId);
      return;
    }

    const color = activeTool === 'eraser' ? '#000000' : (owner === 'left' ? leftColor : rightColor);
    const size = activeTool === 'eraser' ? ERASER_SIZES.medium : 0.02;

    const newStroke: Stroke = {
      id: `together_${owner}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      kind: activeTool === 'eraser' ? 'eraser' : 'brush',
      color,
      size,
      points: [pt],
      owner,
    };

    activePointersRef.current.set(e.pointerId, { owner, stroke: newStroke });
    e.currentTarget.setPointerCapture(e.pointerId);

    setStrokes((prev) => [...prev, newStroke]);
    if (owner === 'left') {
      setLeftHistory((prev) => [...prev, { type: 'add', stroke: newStroke, owner: 'left' }]);
    } else {
      setRightHistory((prev) => [...prev, { type: 'add', stroke: newStroke, owner: 'right' }]);
    }
    playDrawStartSound();
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // 1. Handle stroke eraser
    if (activeStrokeErasersRef.current.has(e.pointerId)) {
      const track = activeStrokeErasersRef.current.get(e.pointerId)!;
      const pt = getNormalizedPoint(e);
      if (!pt) return;
      let clampedX = pt.x;
      if (track.owner === 'left') {
        clampedX = Math.min(0.5, clampedX);
      } else {
        clampedX = Math.max(0.5, clampedX);
      }
      eraseTogetherStrokes(track.owner, { x: clampedX, y: pt.y }, e.pointerId);
      return;
    }

    // 2. Handle brush or rub-eraser
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
    if (activeStrokeErasersRef.current.has(e.pointerId)) {
      const track = activeStrokeErasersRef.current.get(e.pointerId)!;
      if (track.deleted.length > 0) {
        const items = [...track.deleted];
        if (track.owner === 'left') {
          setLeftHistory((prev) => [...prev, { type: 'delete', items, owner: 'left' }]);
        } else {
          setRightHistory((prev) => [...prev, { type: 'delete', items, owner: 'right' }]);
        }
      }
      activeStrokeErasersRef.current.delete(e.pointerId);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      return;
    }

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
    if (leftHistory.length === 0) return;
    playClickSound();

    const lastAction = leftHistory[leftHistory.length - 1];
    setLeftHistory((prev) => prev.slice(0, -1));

    if (lastAction.type === 'add') {
      setStrokes((prev) => prev.filter((s) => s.id !== lastAction.stroke.id));
    } else if (lastAction.type === 'delete') {
      setStrokes((prev) => {
        const next = [...prev];
        const sorted = [...lastAction.items].sort((a, b) => a.index - b.index);
        for (const item of sorted) {
          const insertIdx = Math.max(0, Math.min(item.index, next.length));
          next.splice(insertIdx, 0, item.stroke);
        }
        return next;
      });
    }
  };

  // Undo Person 2 (right)
  const handleUndoRight = () => {
    if (rightHistory.length === 0) return;
    playClickSound();

    const lastAction = rightHistory[rightHistory.length - 1];
    setRightHistory((prev) => prev.slice(0, -1));

    if (lastAction.type === 'add') {
      setStrokes((prev) => prev.filter((s) => s.id !== lastAction.stroke.id));
    } else if (lastAction.type === 'delete') {
      setStrokes((prev) => {
        const next = [...prev];
        const sorted = [...lastAction.items].sort((a, b) => a.index - b.index);
        for (const item of sorted) {
          const insertIdx = Math.max(0, Math.min(item.index, next.length));
          next.splice(insertIdx, 0, item.stroke);
        }
        return next;
      });
    }
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

          {/* Tool switch: Brush / Eraser / StrokeEraser */}
          <div className="flex flex-col gap-1 w-full">
            <div className="flex gap-1 w-full">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setLeftTool('brush');
                }}
                aria-label="하나 붓 선택"
                aria-pressed={leftTool === 'brush'}
                className={`
                  flex-1 min-h-[42px] rounded-xl border-2 border-[#3A3350] font-jua text-xs
                  flex flex-col items-center justify-center p-0.5 cursor-pointer transition-all
                  ${leftTool === 'brush' ? 'bg-[#7FD8BE] shadow-xs' : 'bg-white'}
                `}
              >
                <Paintbrush className="w-3.5 h-3.5 text-[#3A3350]" />
                <span className="text-[10px] mt-0.5">붓</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setLeftTool('eraser');
                }}
                aria-label="하나 지우개 선택"
                aria-pressed={leftTool === 'eraser'}
                className={`
                  flex-1 min-h-[42px] rounded-xl border-2 border-[#3A3350] font-jua text-xs
                  flex flex-col items-center justify-center p-0.5 cursor-pointer transition-all
                  ${leftTool === 'eraser' ? 'bg-[#FF9EB5] shadow-xs' : 'bg-white'}
                `}
              >
                <Eraser className="w-3.5 h-3.5 text-[#3A3350]" />
                <span className="text-[10px] mt-0.5">지우개</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setLeftTool('strokeEraser');
              }}
              aria-label="하나 획 지우개 선택"
              aria-pressed={leftTool === 'strokeEraser'}
              className={`
                w-full min-h-[38px] rounded-xl border-2 border-[#3A3350] font-jua text-xs
                flex items-center justify-center gap-1 p-0.5 cursor-pointer transition-all
                ${leftTool === 'strokeEraser' ? 'bg-[#B9A3FF] text-[#3A3350] shadow-xs' : 'bg-white'}
              `}
            >
              <div className="relative flex items-center justify-center">
                <Eraser className="w-3.5 h-3.5" />
                <Hand className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1 text-[#FF5C8A]" />
              </div>
              <span className="text-[10px]">획 지우개</span>
            </button>
          </div>

          {/* 4 Colors */}
          <div
            className={`flex flex-col gap-2.5 my-auto transition-opacity ${
              leftTool === 'eraser' || leftTool === 'strokeEraser'
                ? 'opacity-30 pointer-events-none select-none'
                : 'opacity-100'
            }`}
            aria-hidden={leftTool === 'eraser' || leftTool === 'strokeEraser'}
          >
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
            disabled={leftHistory.length === 0}
            aria-label="하나 되돌리기"
            className="w-full min-h-[56px] rounded-2xl bg-white border-[3px] border-[#3A3350] font-jua text-xs jelly-btn flex flex-col items-center justify-center p-1 cursor-pointer disabled:opacity-40"
          >
            <Undo2 className="w-5 h-5 text-[#3A3350]" />
            <span className="mt-0.5">되돌리기</span>
          </button>
        </div>

        {/* CENTER CANVAS */}
        <div
          ref={containerRef}
          className="flex-1 w-full flex flex-col items-center justify-center min-w-0 min-h-0 min-h-[300px] md:min-h-[480px] p-1 relative overflow-hidden"
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

          {/* Tool switch: Brush / Eraser / StrokeEraser */}
          <div className="flex flex-col gap-1 w-full">
            <div className="flex gap-1 w-full">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setRightTool('brush');
                }}
                aria-label="둘 붓 선택"
                aria-pressed={rightTool === 'brush'}
                className={`
                  flex-1 min-h-[42px] rounded-xl border-2 border-[#3A3350] font-jua text-xs
                  flex flex-col items-center justify-center p-0.5 cursor-pointer transition-all
                  ${rightTool === 'brush' ? 'bg-[#7FD8BE] shadow-xs' : 'bg-white'}
                `}
              >
                <Paintbrush className="w-3.5 h-3.5 text-[#3A3350]" />
                <span className="text-[10px] mt-0.5">붓</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setRightTool('eraser');
                }}
                aria-label="둘 지우개 선택"
                aria-pressed={rightTool === 'eraser'}
                className={`
                  flex-1 min-h-[42px] rounded-xl border-2 border-[#3A3350] font-jua text-xs
                  flex flex-col items-center justify-center p-0.5 cursor-pointer transition-all
                  ${rightTool === 'eraser' ? 'bg-[#FF9EB5] shadow-xs' : 'bg-white'}
                `}
              >
                <Eraser className="w-3.5 h-3.5 text-[#3A3350]" />
                <span className="text-[10px] mt-0.5">지우개</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setRightTool('strokeEraser');
              }}
              aria-label="둘 획 지우개 선택"
              aria-pressed={rightTool === 'strokeEraser'}
              className={`
                w-full min-h-[38px] rounded-xl border-2 border-[#3A3350] font-jua text-xs
                flex items-center justify-center gap-1 p-0.5 cursor-pointer transition-all
                ${rightTool === 'strokeEraser' ? 'bg-[#B9A3FF] text-[#3A3350] shadow-xs' : 'bg-white'}
              `}
            >
              <div className="relative flex items-center justify-center">
                <Eraser className="w-3.5 h-3.5" />
                <Hand className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1 text-[#FF5C8A]" />
              </div>
              <span className="text-[10px]">획 지우개</span>
            </button>
          </div>

          {/* 4 Colors */}
          <div
            className={`flex flex-col gap-2.5 my-auto transition-opacity ${
              rightTool === 'eraser' || rightTool === 'strokeEraser'
                ? 'opacity-30 pointer-events-none select-none'
                : 'opacity-100'
            }`}
            aria-hidden={rightTool === 'eraser' || rightTool === 'strokeEraser'}
          >
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
            disabled={rightHistory.length === 0}
            aria-label="둘 되돌리기"
            className="w-full min-h-[56px] rounded-2xl bg-white border-[3px] border-[#3A3350] font-jua text-xs jelly-btn flex flex-col items-center justify-center p-1 cursor-pointer disabled:opacity-40"
          >
            <Undo2 className="w-5 h-5 text-[#3A3350]" />
            <span className="mt-0.5">되돌리기</span>
          </button>
        </div>

      </div>
    </div>
  );
};
