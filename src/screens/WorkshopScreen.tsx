import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mode,
  MirrorAxis,
  ArtworkMode,
  ArtworkAxis,
  ViewMode,
  ToolType,
  StampShape,
  SizeLevel,
  Point,
  Stroke,
  BRUSH_SIZES,
  ERASER_SIZES,
  STAMP_SIZES,
} from '../constants';
import {
  getTransforms,
  isPointInAllowedZone,
  clampPointToAllowedZone,
} from '../symmetry';
import { getStampPoints } from '../stamps';
import { renderCanvas, ActiveFadingStroke } from '../renderer';
import { saveSession } from '../storage';
import { TraditionalPattern } from '../patterns';
import { isStrokeHit, HistoryAction, FadingStroke } from '../strokeEraser';
import {
  playDrawStartSound,
  playStampSound,
  playJjanSound,
  playWobbleSound,
  playClickSound,
} from '../sound';
import { ColorPicker } from '../components/ColorPicker';
import { ConfirmModal } from '../components/ConfirmModal';
import { Confetti } from '../components/Confetti';
import {
  Undo2,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  Gift,
  Home,
  Star,
  Paintbrush,
  Stamp as StampIcon,
  Eraser,
  Hand,
  Layers,
} from 'lucide-react';

interface WorkshopScreenProps {
  initialMode: Mode;
  onHome: () => void;
  onFinish: (strokes: Stroke[], mode: ArtworkMode, axis: ArtworkAxis) => void;
  savedStrokes?: Stroke[];
  savedAxis?: MirrorAxis;
  tracePattern?: TraditionalPattern | null;
}

function renderStampPreviewIcon(shape: StampShape, color: string) {
  switch (shape) {
    case 'circle':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <circle cx="12" cy="12" r="9" fill={color} stroke="#3A3350" strokeWidth="2.5" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <polygon points="12,3 21,20 3,20" fill={color} stroke="#3A3350" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      );
    case 'square':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <rect x="4" y="4" width="16" height="16" rx="3" fill={color} stroke="#3A3350" strokeWidth="2.5" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path
            d="M12 21 C12 21 3 14.5 3 8.5 A 5 5 0 0 1 12 5.5 A 5 5 0 0 1 21 8.5 C 21 14.5 12 21 12 21 Z"
            fill={color}
            stroke="#3A3350"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <polygon
            points="12,2 14.9,8.5 22,9.3 16.7,14.1 18.2,21.1 12,17.5 5.8,21.1 7.3,14.1 2,9.3 9.1,8.5"
            fill={color}
            stroke="#3A3350"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'fish':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path
            d="M 21 12 Q 17 7 11 6 Q 5 7 2 4 L 4 12 L 2 20 Q 5 17 11 18 Q 17 17 21 12 Z"
            fill={color}
            stroke="#3A3350"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="10.5" r="1.3" fill="#3A3350" />
        </svg>
      );
  }
}

export const WorkshopScreen: React.FC<WorkshopScreenProps> = ({
  initialMode,
  onHome,
  onFinish,
  savedStrokes,
  savedAxis,
  tracePattern,
}) => {
  const mode = initialMode;
  const [axis, setAxis] = useState<MirrorAxis>(savedAxis || 'vertical');
  const [viewMode, setViewMode] = useState<ViewMode>('instant');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isAnimatingReveal, setIsAnimatingReveal] = useState<boolean>(false);
  const [revealProgress, setRevealProgress] = useState<number>(0);

  const [tool, setTool] = useState<ToolType>('brush');
  const [selectedColor, setSelectedColor] = useState<string>('#FF5C8A');
  const [sizeLevel, setSizeLevel] = useState<SizeLevel>('medium');
  const [stampShape, setStampShape] = useState<StampShape>('fish');

  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [showUnderlay, setShowUnderlay] = useState<boolean>(true);
  const [strokes, setStrokes] = useState<Stroke[]>(savedStrokes || []);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [coverWobble, setCoverWobble] = useState<boolean>(false);
  const [brushBounce, setBrushBounce] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Session tracking
  const startTimeRef = useRef<number>(Date.now());
  const axisChangesRef = useRef<number>(0);
  const revealUsedRef = useRef<boolean>(false);

  // Debug overlay (?debug=1)
  const [isDebug, setIsDebug] = useState<boolean>(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);

  // Check URL debug param
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      setIsDebug(searchParams.get('debug') === '1');
    } catch {
      // Ignore
    }
  }, []);

  // Action history for undo
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const currentGestureDeletedRef = useRef<{ stroke: Stroke; index: number }[]>([]);
  const isStrokeErasingRef = useRef<boolean>(false);

  // Fading strokes for stroke eraser animation (0.2s fade + sparkle)
  const fadingStrokesRef = useRef<FadingStroke[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Redraw canvas (can receive active fading strokes)
  const redraw = useCallback((activeFading?: ActiveFadingStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const transforms = getTransforms(mode, axis);
    const onlyOriginals = viewMode === 'peek' && !isRevealed && !isAnimatingReveal;

    renderCanvas(canvas, strokes, transforms, {
      showGuidelines,
      mode,
      axis,
      onlyOriginals,
      hasUnderlay: Boolean(tracePattern && showUnderlay),
      fadingStrokes: activeFading,
    });
  }, [mode, axis, viewMode, isRevealed, isAnimatingReveal, strokes, showGuidelines, tracePattern, showUnderlay]);

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
        transforms: f.transforms,
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

  // Resize canvas according to container - strictly only on window resize or initial mount
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
  }, [redraw]);

  // Pointer position converted to normalized [0, 1]
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

  // Axis change
  const handleAxisChange = (newAxis: MirrorAxis) => {
    playClickSound();
    if (newAxis !== axis) {
      axisChangesRef.current += 1;
      setAxis(newAxis);
    }
  };

  // Erase strokes intersecting point pt
  const eraseStrokesAtPoint = useCallback((pt: Point) => {
    const onlyOriginals = viewMode === 'peek' && !isRevealed;
    const currentTransforms = getTransforms(mode, axis);
    const testTransforms = onlyOriginals ? [currentTransforms[0]] : currentTransforms;

    setStrokes((prevStrokes) => {
      const remaining: Stroke[] = [];
      const newlyDeleted: { stroke: Stroke; index: number }[] = [];

      for (let i = 0; i < prevStrokes.length; i++) {
        const s = prevStrokes[i];
        if (s.kind === 'eraser') {
          remaining.push(s);
          continue;
        }

        if (isStrokeHit(pt, s, testTransforms, 0.03)) {
          newlyDeleted.push({ stroke: s, index: i });
          fadingStrokesRef.current.push({
            stroke: s,
            startTime: performance.now(),
            duration: 200,
            hitPoint: pt,
            transforms: testTransforms,
          });
        } else {
          remaining.push(s);
        }
      }

      if (newlyDeleted.length > 0) {
        playClickSound();
        currentGestureDeletedRef.current.push(...newlyDeleted);
        startFadingAnimation();
        return remaining;
      }
      return prevStrokes;
    });
  }, [viewMode, isRevealed, mode, axis, startFadingAnimation]);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== null) return;

    const pt = getNormalizedPoint(e);
    if (!pt) return;

    // Check allowed zone if in unrevealed '짠!' mode
    if (viewMode === 'peek' && !isRevealed) {
      if (!isPointInAllowedZone(pt, mode, axis)) {
        setCoverWobble(true);
        playWobbleSound();
        setTimeout(() => setCoverWobble(false), 400);
        return;
      }
    }

    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);

    setLastPoint(pt);

    if (tool === 'strokeEraser') {
      isStrokeErasingRef.current = true;
      currentGestureDeletedRef.current = [];
      eraseStrokesAtPoint(pt);
      return;
    }

    if (tool === 'brush') {
      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        kind: 'brush',
        color: selectedColor,
        size: BRUSH_SIZES[sizeLevel],
        points: [pt],
      };
      currentStrokeRef.current = newStroke;
      setStrokes((prev) => [...prev, newStroke]);
      setHistory((prev) => [...prev, { type: 'add', stroke: newStroke }]);
      playDrawStartSound();
    } else if (tool === 'eraser') {
      const newStroke: Stroke = {
        id: `eraser-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        kind: 'eraser',
        color: '#000000',
        size: ERASER_SIZES[sizeLevel],
        points: [pt],
      };
      currentStrokeRef.current = newStroke;
      setStrokes((prev) => [...prev, newStroke]);
      setHistory((prev) => [...prev, { type: 'add', stroke: newStroke }]);
      playDrawStartSound();
    } else if (tool === 'stamp') {
      const stampPoints = getStampPoints(stampShape, pt, STAMP_SIZES[sizeLevel]);
      const newStroke: Stroke = {
        id: `stamp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        kind: 'stamp',
        color: selectedColor,
        size: STAMP_SIZES[sizeLevel],
        points: stampPoints,
        stampShape,
      };
      setStrokes((prev) => [...prev, newStroke]);
      setHistory((prev) => [...prev, { type: 'add', stroke: newStroke }]);
      playStampSound();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;

    if (tool === 'strokeEraser') {
      let pt = getNormalizedPoint(e);
      if (!pt) return;
      if (viewMode === 'peek' && !isRevealed) {
        pt = clampPointToAllowedZone(pt, mode, axis);
      }
      setLastPoint(pt);
      eraseStrokesAtPoint(pt);
      return;
    }

    if (tool !== 'brush' && tool !== 'eraser') return;

    let pt = getNormalizedPoint(e);
    if (!pt) return;

    // Clamping if in unrevealed '짠!' mode
    if (viewMode === 'peek' && !isRevealed) {
      pt = clampPointToAllowedZone(pt, mode, axis);
    }

    setLastPoint(pt);

    const curr = currentStrokeRef.current;
    if (!curr) return;

    const last = curr.points[curr.points.length - 1];
    if (last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.004) {
        return;
      }
    }

    curr.points.push(pt);
    setStrokes((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...curr, points: [...curr.points] };
      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      if (isStrokeErasingRef.current) {
        isStrokeErasingRef.current = false;
        if (currentGestureDeletedRef.current.length > 0) {
          const items = [...currentGestureDeletedRef.current];
          setHistory((prev) => [...prev, { type: 'delete', items }]);
          currentGestureDeletedRef.current = [];
        }
      }

      activePointerIdRef.current = null;
      currentStrokeRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  // Undo (last action: addition or stroke deletion)
  const handleUndo = () => {
    if (history.length === 0) return;
    playClickSound();

    const lastAction = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

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

  // Clear all
  const handleClear = () => {
    setShowClearModal(false);
    setStrokes([]);
    setHistory([]);
    setIsRevealed(false);
  };

  // 짠! Reveal Animation (1 second)
  const handleTriggerReveal = () => {
    if (isAnimatingReveal) return;
    setIsAnimatingReveal(true);
    revealUsedRef.current = true;
    playJjanSound();

    const startTime = performance.now();
    const duration = 1000;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setRevealProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setIsAnimatingReveal(false);
        setIsRevealed(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    };

    requestAnimationFrame(step);
  };

  // Re-hide for peek mode
  const handleReHide = () => {
    playClickSound();
    setIsRevealed(false);
  };

  // Finish check & Session recording
  const handleFinishClick = async () => {
    if (strokes.length === 0) {
      setBrushBounce(true);
      playWobbleSound();
      setTimeout(() => setBrushBounce(false), 600);
      return;
    }
    playClickSound();

    const durationSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const strokeCount = strokes.filter((s) => s.kind === 'brush').length;
    const stampCount = strokes.filter((s) => s.kind === 'stamp').length;
    const finalAxis: ArtworkAxis = mode === 'spin' ? 'point' : axis;

    // Record session
    await saveSession({
      date: new Date().toISOString(),
      mode,
      axis: finalAxis,
      durationSec,
      strokeCount,
      stampCount,
      revealUsed: revealUsedRef.current,
      axisChanges: axisChangesRef.current,
      aiUsed: false,
    });

    onFinish(strokes, mode, finalAxis);
  };

  // Debug transform list
  const transforms = getTransforms(mode, axis);

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
            {mode === 'mirror' ? '거울 만들기' : '빙글 만들기'}
          </h1>
        </div>

        {/* Right: Guideline & Trace Underlay Toggles */}
        <div className="flex items-center gap-2 md:gap-3">
          {tracePattern && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowUnderlay(!showUnderlay);
              }}
              aria-label={showUnderlay ? '밑그림 끄기' : '밑그림 켜기'}
              className={`
                min-h-[56px] md:min-h-[64px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] jelly-btn
                flex items-center justify-center gap-1.5 font-jua text-xs md:text-sm cursor-pointer
                ${showUnderlay ? 'bg-[#FFD66B] text-[#3A3350]' : 'bg-white text-[#3A3350]/60'}
              `}
            >
              <Layers className="w-5 h-5" />
              <span>{showUnderlay ? '밑그림 끄기' : '밑그림 켜기'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowGuidelines(!showGuidelines);
            }}
            aria-label={
              mode === 'mirror'
                ? showGuidelines ? '대칭축 숨기기' : '대칭축 보이기'
                : showGuidelines ? '가운데 점 숨기기' : '가운데 점 보이기'
            }
            className={`
              min-w-[64px] h-14 md:h-16 px-3 rounded-2xl border-[3px] border-[#3A3350] jelly-btn
              flex items-center justify-center gap-1 font-jua text-sm md:text-base cursor-pointer
              ${showGuidelines ? 'bg-[#7FD8BE] text-[#3A3350]' : 'bg-white text-[#3A3350]/60'}
            `}
          >
            {showGuidelines ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            <span>{mode === 'mirror' ? '축' : '점'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-3 md:gap-5 max-w-6xl mx-auto w-full min-h-0">

        {/* LEFT TOOLBOX */}
        <div className="w-full lg:w-48 bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-3 shadow-[0_6px_0_#3A3350] flex flex-row lg:flex-col justify-between items-center gap-2.5 overflow-x-auto lg:overflow-y-auto lg:max-h-[86vh] shrink-0">
          {/* Tool switch: 4 tools in 2 columns (2열 배치) */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTool('brush');
              }}
              aria-label="붓 그리기 도구 선택"
              aria-pressed={tool === 'brush'}
              className={`
                min-h-[56px] lg:min-h-[60px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                ${tool === 'brush' ? 'bg-[#7FD8BE] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
                ${brushBounce ? 'animate-brush-bounce ring-4 ring-[#FF5C8A]' : ''}
              `}
            >
              <Paintbrush className="w-5 h-5" />
              <span className="text-xs mt-0.5">붓</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTool('stamp');
              }}
              aria-label="도장 찍기 도구 선택"
              aria-pressed={tool === 'stamp'}
              className={`
                min-h-[56px] lg:min-h-[60px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                ${tool === 'stamp' ? 'bg-[#FFD66B] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
              `}
            >
              <StampIcon className="w-5 h-5" />
              <span className="text-xs mt-0.5">도장</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTool('eraser');
              }}
              aria-label="지우개 도구 선택"
              aria-pressed={tool === 'eraser'}
              className={`
                min-h-[56px] lg:min-h-[60px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                ${tool === 'eraser' ? 'bg-[#FF9EB5] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
              `}
            >
              <Eraser className="w-5 h-5" />
              <span className="text-xs mt-0.5">지우개</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setTool('strokeEraser');
              }}
              aria-label="획 지우개 도구 선택"
              aria-pressed={tool === 'strokeEraser'}
              className={`
                min-h-[56px] lg:min-h-[60px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                ${tool === 'strokeEraser' ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
              `}
            >
              <div className="relative flex items-center justify-center">
                <Eraser className="w-5 h-5" />
                <Hand className="w-3.5 h-3.5 absolute -bottom-1 -right-2 text-[#FF5C8A]" />
              </div>
              <span className="text-xs mt-0.5">획 지우개</span>
            </button>
          </div>

          {/* Stamp Shapes (when stamp tool is selected) */}
          {tool === 'stamp' && (
            <div className="flex flex-col items-center w-full">
              <span className="font-jua text-xs text-[#3A3350]/70 mb-1 hidden lg:block">도장 모양</span>
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {(['circle', 'triangle', 'square', 'heart', 'star', 'fish'] as StampShape[]).map((shape) => {
                  const isSelected = stampShape === shape;
                  const shapeLabels: Record<StampShape, string> = {
                    circle: '동그라미',
                    triangle: '세모',
                    square: '네모',
                    heart: '하트',
                    star: '별',
                    fish: '물고기',
                  };

                  return (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setStampShape(shape);
                      }}
                      title={shapeLabels[shape]}
                      aria-label={`${shapeLabels[shape]} 도장 선택`}
                      aria-pressed={isSelected}
                      className={`
                        h-11 rounded-xl border-2 border-[#3A3350] font-jua
                        flex items-center justify-center cursor-pointer transition-all p-1
                        ${isSelected
                          ? 'bg-[#FFD66B] ring-3 ring-[#3A3350]/30 shadow-[0_2px_0_#3A3350] translate-y-[1px]'
                          : 'bg-white jelly-btn'
                        }
                      `}
                    >
                      {renderStampPreviewIcon(shape, selectedColor)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Palette (Active for brush & stamp, dimmed for erasers) */}
          <div className="flex flex-col items-center relative">
            <span className="font-jua text-xs text-[#3A3350]/70 mb-1 hidden lg:block">
              {tool === 'eraser' || tool === 'strokeEraser'
                ? '색 (사용 안함)'
                : tool === 'stamp'
                ? '도장 색'
                : '색'}
            </span>
            <div
              className={`transition-opacity ${
                tool === 'eraser' || tool === 'strokeEraser'
                  ? 'opacity-30 pointer-events-none select-none'
                  : 'opacity-100'
              }`}
              aria-hidden={tool === 'eraser' || tool === 'strokeEraser'}
            >
              <ColorPicker
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
              />
            </div>
          </div>

          {/* Thickness / Size (3 options) */}
          <div className="flex flex-col items-center w-full">
            <span className="font-jua text-xs text-[#3A3350]/70 mb-1 hidden lg:block">
              {tool === 'stamp' ? '크기' : (tool === 'eraser' ? '지우개 굵기' : '굵기')}
            </span>
            <div className="flex lg:grid lg:grid-cols-3 gap-1.5 w-full bg-[#FAF8FF] p-1.5 rounded-2xl border-2 border-[#3A3350]">
              {(['thin', 'medium', 'thick'] as SizeLevel[]).map((lvl) => {
                const isSelected = sizeLevel === lvl;
                const dotSizes = { thin: 'w-2 h-2', medium: 'w-3.5 h-3.5', thick: 'w-5 h-5' };
                const labels = { thin: '얇게', medium: '보통', thick: '굵게' };

                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSizeLevel(lvl);
                    }}
                    aria-label={`${labels[lvl]} 선택`}
                    aria-pressed={isSelected}
                    className={`
                      flex-1 min-h-[46px] rounded-xl border-2 border-[#3A3350] flex items-center justify-center cursor-pointer transition-all
                      ${isSelected ? 'bg-[#7FD8BE] shadow-xs' : 'bg-white'}
                    `}
                  >
                    <div className={`rounded-full bg-[#3A3350] ${dotSizes[lvl]}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER CANVAS STAGE */}
        <div
          ref={containerRef}
          className="flex-1 w-full flex items-center justify-center min-w-0 min-h-0 min-h-[300px] md:min-h-[480px] p-1 relative overflow-hidden"
        >
          <div className="relative border-4 border-[#3A3350] rounded-3xl overflow-hidden shadow-[0_8px_0_#3A3350] bg-white">
            
            {/* Trace Pattern Underlay (behind canvas) */}
            {tracePattern && showUnderlay && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 z-0 overflow-hidden">
                {tracePattern.renderSvg('w-full h-full max-w-full max-h-full object-contain')}
              </div>
            )}

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative z-10 block cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />

            {/* Hidden Zone Cover for '짠!' (Peek) Mode */}
            {viewMode === 'peek' && !isRevealed && (
              <div
                onClick={() => {
                  setCoverWobble(true);
                  playWobbleSound();
                  setTimeout(() => setCoverWobble(false), 400);
                }}
                className={`
                  absolute pointer-events-auto cursor-not-allowed z-20
                  stripe-paper-pattern border-l-2 border-dashed border-[#B9A3FF]
                  flex flex-col items-center justify-center
                  ${coverWobble ? 'animate-wobble' : ''}
                `}
                style={{
                  ...(mode === 'spin' || axis === 'vertical'
                    ? { top: 0, right: 0, bottom: 0, left: '50%' }
                    : axis === 'horizontal'
                    ? { bottom: 0, left: 0, right: 0, top: '50%' }
                    : {
                        clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0 100%, 0 50%, 50% 50%)',
                        inset: 0,
                      }),
                }}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-[3.5px] border-[#B9A3FF] shadow-lg flex items-center justify-center">
                  <span className="font-jua text-4xl md:text-5xl text-[#8C6CFF] drop-shadow-xs">
                    ?
                  </span>
                </div>
                <span className="font-jua text-sm md:text-base text-[#8C6CFF] mt-2 bg-white/90 px-3 py-1 rounded-full border border-[#B9A3FF]/40">
                  짠! 버튼을 눌러봐!
                </span>
              </div>
            )}

            {/* 짠! Reveal Animation Overlay */}
            {isAnimatingReveal && (
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden z-20"
                style={{
                  transformOrigin: '50% 50%',
                }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    transform:
                      mode === 'spin'
                        ? `rotate(${revealProgress * 180}deg)`
                        : axis === 'vertical'
                        ? `scaleX(${1 - revealProgress * 2})`
                        : axis === 'horizontal'
                        ? `scaleY(${1 - revealProgress * 2})`
                        : `scaleX(${1 - revealProgress * 2}) scaleY(${1 - revealProgress * 2})`,
                    transformOrigin: '50% 50%',
                    opacity: 0.9,
                  }}
                >
                  <div className="w-full h-full bg-[#7FD8BE]/10 border-2 border-[#7FD8BE] rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-[#FFD23F] animate-spin" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT TOOLBOX */}
        <div className="w-full lg:w-48 bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-3 shadow-[0_6px_0_#3A3350] flex flex-row lg:flex-col justify-between items-center gap-3 overflow-x-auto lg:overflow-visible shrink-0">
          
          {/* Axis Selector (Mirror mode) or Center indicator (Spin mode) */}
          <div className="flex flex-col items-center w-full">
            <span className="font-jua text-xs text-[#3A3350]/70 mb-1 hidden lg:block">
              {mode === 'mirror' ? '대칭축' : '대칭'}
            </span>

            {mode === 'mirror' ? (
              <div className="flex lg:grid lg:grid-cols-3 gap-1.5 w-full">
                {(['vertical', 'horizontal', 'both'] as MirrorAxis[]).map((ax) => {
                  const isSelected = axis === ax;
                  const labels: Record<MirrorAxis, string> = {
                    vertical: '세로',
                    horizontal: '가로',
                    both: '둘 다',
                  };
                  const icons: Record<MirrorAxis, React.ReactNode> = {
                    vertical: (
                      <div className="w-6 h-6 border-2 border-dashed border-[#3A3350] rounded flex items-center justify-center">
                        <div className="w-0 h-full border-r-2 border-dashed border-[#3A3350]" />
                      </div>
                    ),
                    horizontal: (
                      <div className="w-6 h-6 border-2 border-dashed border-[#3A3350] rounded flex items-center justify-center">
                        <div className="h-0 w-full border-b-2 border-dashed border-[#3A3350]" />
                      </div>
                    ),
                    both: (
                      <div className="w-6 h-6 border-2 border-dashed border-[#3A3350] rounded relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-0 h-full border-r-2 border-dashed border-[#3A3350]" />
                          <div className="h-0 w-full border-b-2 border-dashed border-[#3A3350] absolute" />
                        </div>
                      </div>
                    ),
                  };

                  return (
                    <button
                      key={ax}
                      type="button"
                      onClick={() => handleAxisChange(ax)}
                      aria-label={`${labels[ax]} 대칭축 선택`}
                      aria-pressed={isSelected}
                      className={`
                        flex-1 min-h-[56px] lg:min-h-[64px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                        flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                        ${isSelected ? 'bg-[#7FD8BE] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
                      `}
                    >
                      {icons[ax]}
                      <span className="text-xs mt-1">{labels[ax]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="w-full min-h-[56px] lg:min-h-[64px] rounded-2xl border-2 border-dashed border-[#FF9EB5] bg-[#FFF5F7] p-2 flex items-center justify-center gap-2 font-jua text-[#3A3350]">
                <div className="w-4 h-4 rounded-full bg-[#FF9EB5] border-2 border-[#3A3350]" />
                <span className="text-sm">가운데 점</span>
              </div>
            )}
          </div>

          {/* View Mode: 바로 (Instant) vs 짠! (Peek) */}
          <div className="flex flex-col items-center w-full">
            <span className="font-jua text-xs text-[#3A3350]/70 mb-1 hidden lg:block">보기</span>
            <div className="flex lg:grid lg:grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setViewMode('instant');
                  setIsRevealed(false);
                }}
                aria-label="바로 보기 모드"
                aria-pressed={viewMode === 'instant'}
                className={`
                  flex-1 min-h-[56px] lg:min-h-[64px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                  flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                  ${viewMode === 'instant' ? 'bg-[#7FD8BE] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
                `}
              >
                <Eye className="w-5 h-5" />
                <span className="text-xs mt-0.5">바로</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setViewMode('peek');
                  setIsRevealed(false);
                }}
                aria-label="짠! 숨겨서 보기 모드"
                aria-pressed={viewMode === 'peek'}
                className={`
                  flex-1 min-h-[56px] lg:min-h-[64px] rounded-2xl border-[3px] border-[#3A3350] font-jua
                  flex flex-col items-center justify-center p-1 cursor-pointer transition-all
                  ${viewMode === 'peek' ? 'bg-[#FF9EB5] shadow-[0_2px_0_#3A3350] translate-y-[2px]' : 'bg-white jelly-btn'}
                `}
              >
                <Gift className="w-5 h-5" />
                <span className="text-xs mt-0.5">짠!</span>
              </button>
            </div>
          </div>

          {/* 짠! Trigger Button (Shown when in peek mode) */}
          {viewMode === 'peek' && (
            <div className="w-full">
              {!isRevealed ? (
                <button
                  type="button"
                  onClick={handleTriggerReveal}
                  aria-label="대칭 그림 짠! 공개하기"
                  className="w-full min-h-[60px] lg:min-h-[68px] rounded-2xl bg-[#FFD66B] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-xl jelly-btn flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_0_#3A3350]"
                >
                  <Sparkles className="w-6 h-6 text-[#FF5C8A]" />
                  <span>짠!</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReHide}
                  aria-label="다시 숨기기"
                  className="w-full min-h-[56px] rounded-2xl bg-[#B9A3FF] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm jelly-btn flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>다시 숨기기</span>
                </button>
              )}
            </div>
          )}

          {/* Undo and Clear */}
          <div className="flex lg:grid lg:grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              aria-label="마지막 그림 되돌리기"
              className="flex-1 min-h-[56px] lg:min-h-[64px] rounded-2xl bg-white text-[#3A3350] border-[3px] border-[#3A3350] font-jua flex flex-col items-center justify-center p-1 jelly-btn cursor-pointer disabled:opacity-40"
            >
              <Undo2 className="w-5 h-5" />
              <span className="text-xs mt-0.5">되돌리기</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (strokes.length > 0) {
                  playClickSound();
                  setShowClearModal(true);
                }
              }}
              disabled={strokes.length === 0}
              aria-label="모두 지우기"
              className="flex-1 min-h-[56px] lg:min-h-[64px] rounded-2xl bg-white text-[#3A3350] border-[3px] border-[#3A3350] font-jua flex flex-col items-center justify-center p-1 jelly-btn cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-5 h-5 text-[#FF5C8A]" />
              <span className="text-xs mt-0.5">지우기</span>
            </button>
          </div>

          {/* Big Finish Button */}
          <button
            type="button"
            onClick={handleFinishClick}
            aria-label="작품 완성하기"
            className={`
              w-full min-h-[64px] lg:min-h-[72px] rounded-2xl border-[3.5px] border-[#3A3350] font-jua text-2xl
              flex items-center justify-center gap-2 cursor-pointer transition-all
              ${strokes.length > 0
                ? 'bg-[#FFD66B] text-[#3A3350] jelly-card'
                : 'bg-[#FFD66B]/60 text-[#3A3350]/60 jelly-btn'
              }
            `}
          >
            <Star className={`w-6 h-6 ${strokes.length > 0 ? 'text-[#FF5C8A] fill-[#FF5C8A]' : ''}`} />
            <span>완성!</span>
          </button>
        </div>
      </div>

      {/* Debug Info Overlay (?debug=1) */}
      {isDebug && (
        <div className="fixed bottom-2 left-2 z-40 bg-black/85 text-emerald-400 p-2.5 rounded-xl text-xs font-mono border border-emerald-500 shadow-xl max-w-xs pointer-events-none">
          <div className="font-bold text-amber-300 mb-1">[DEBUG MODE]</div>
          <div>선 개수(Strokes): {strokes.length}</div>
          <div>모드: {mode} / 축: {axis}</div>
          <div>축 변경 횟수: {axisChangesRef.current}</div>
          <div>짠! 사용: {revealUsedRef.current ? '예' : '아니오'}</div>
          <div>
            마지막 점: {lastPoint ? `(${lastPoint.x.toFixed(3)}, ${lastPoint.y.toFixed(3)})` : '없음'}
          </div>
          {lastPoint && (
            <div className="mt-1 border-t border-emerald-800 pt-1">
              변환 좌표:
              {transforms.map((t, idx) => {
                const tp = t(lastPoint);
                return (
                  <div key={idx} className="ml-1 text-[11px] text-emerald-300">
                    T{idx}: ({tp.x.toFixed(3)}, {tp.y.toFixed(3)})
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="그림을 모두 지울까요?"
        message="지금까지 그린 멋진 대칭 그림이 모두 지워져요."
        onConfirm={handleClear}
        onCancel={() => setShowClearModal(false)}
      />

      {/* Confetti Animation */}
      <Confetti active={showConfetti} />
    </div>
  );
};
