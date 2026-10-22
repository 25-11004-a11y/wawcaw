import React, { useState, useEffect } from 'react';
import { Mode, MirrorAxis } from '../constants';
import { TRADITIONAL_PATTERNS, TraditionalPattern, getTodayPattern, loadPatternsData } from '../patterns';
import { RobotMascot } from '../components/RobotMascot';
import { playClickSound, playWobbleSound } from '../sound';
import { Home, RefreshCw, Pencil, ArrowLeftRight } from 'lucide-react';

interface PatternScreenProps {
  onHome: () => void;
  onTracePattern: (pattern: TraditionalPattern, mode: Mode, axis?: MirrorAxis) => void;
}

type MirrorType = 'vertical' | 'horizontal' | 'spin';

export const PatternScreen: React.FC<PatternScreenProps> = ({ onHome, onTracePattern }) => {
  const [patterns, setPatterns] = useState<TraditionalPattern[]>(() => {
    const today = getTodayPattern();
    const otherPatterns = TRADITIONAL_PATTERNS.filter((p) => p.id !== today.id);
    return [today, ...otherPatterns];
  });
  const [currentPatternIndex, setCurrentPatternIndex] = useState<number>(0);

  // For API patterns, selected mirror starts as null until the child chooses one
  const [selectedApiMirror, setSelectedApiMirror] = useState<MirrorType | null>(null);

  // For built-in patterns, default to matching symmetry
  const [mirrorType, setMirrorType] = useState<MirrorType>(() => {
    const today = getTodayPattern();
    return today.targetMode === 'spin' ? 'spin' : 'vertical';
  });

  const [bounceMirrors, setBounceMirrors] = useState<boolean>(false);
  const [isAlternating, setIsAlternating] = useState<boolean>(false);
  const [alternateStep, setAlternateStep] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Fetch API patterns on mount
  useEffect(() => {
    loadPatternsData()
      .then((data) => {
        if (data.list && data.list.length > 0) {
          setPatterns(data.list);
          const todayIdx = data.list.findIndex((p) => p.id === data.today.id);
          const initialIdx = todayIdx >= 0 ? todayIdx : 0;
          setCurrentPatternIndex(initialIdx);
          const initPat = data.list[initialIdx];
          if (initPat.isApi) {
            setSelectedApiMirror(null);
          } else {
            setMirrorType(initPat.targetMode === 'spin' ? 'spin' : 'vertical');
          }
        }
      })
      .catch(() => {
        // Fallback already in place
      });
  }, []);

  const pattern = patterns[currentPatternIndex] || TRADITIONAL_PATTERNS[0];
  const activeMirror: MirrorType | null = pattern.isApi ? selectedApiMirror : mirrorType;

  // Alternating view timer (1s interval)
  useEffect(() => {
    if (!isAlternating) {
      setAlternateStep(false);
      return;
    }

    const timer = setInterval(() => {
      setAlternateStep((prev) => !prev);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAlternating]);

  // Next pattern
  const handleNextPattern = () => {
    playClickSound();
    setImageError(false);
    setIsAlternating(false);
    const nextIndex = (currentPatternIndex + 1) % patterns.length;
    setCurrentPatternIndex(nextIndex);
    const nextPat = patterns[nextIndex];
    if (nextPat.isApi) {
      setSelectedApiMirror(null);
    } else {
      if (nextPat.targetMode === 'spin') {
        setMirrorType('spin');
      } else {
        setMirrorType('vertical');
      }
    }
  };

  // Mirror button click
  const handleSelectMirror = (type: MirrorType) => {
    playClickSound();
    if (pattern.isApi) {
      setSelectedApiMirror(type);
    } else {
      setMirrorType(type);
    }
  };

  // Alternating view button click
  const handleAlternatingClick = () => {
    if (pattern.isApi && !selectedApiMirror) {
      playWobbleSound();
      setBounceMirrors(true);
      setTimeout(() => setBounceMirrors(false), 800);
      return;
    }
    playClickSound();
    setIsAlternating(!isAlternating);
  };

  // API trace button click
  const handleApiTraceClick = () => {
    if (!selectedApiMirror) {
      playWobbleSound();
      setBounceMirrors(true);
      setTimeout(() => setBounceMirrors(false), 800);
      return;
    }
    playClickSound();
    if (selectedApiMirror === 'spin') {
      onTracePattern(pattern, 'spin');
    } else {
      onTracePattern(pattern, 'mirror', selectedApiMirror);
    }
  };

  // Render Pattern Element (Image with error handling or SVG)
  const renderPatternVisual = () => {
    if (imageError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <RobotMascot size={70} />
          <p className="font-jua text-sm text-[#3A3350] mt-2 mb-3">
            그림을 불러오지 못했어요!
          </p>
          <button
            type="button"
            onClick={handleNextPattern}
            className="px-4 py-2 rounded-xl bg-[#B9A3FF] border-2 border-[#3A3350] font-jua text-sm jelly-btn flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>다른 무늬</span>
          </button>
        </div>
      );
    }

    if (pattern.imageUrl) {
      return (
        <img
          src={pattern.imageUrl}
          alt={pattern.name}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      );
    }

    return pattern.renderSvg('w-full h-full max-w-full max-h-full object-contain');
  };

  // Render Mirrored Pattern via CSS (clip-path and transform)
  const renderMirroredPattern = () => {
    if (imageError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <RobotMascot size={60} />
        </div>
      );
    }

    // When API pattern has no mirror chosen yet
    if (pattern.isApi && !selectedApiMirror) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[#FAF8FF] border-2 border-dashed border-[#8C6CFF] flex items-center justify-center text-2xl mb-2">
            🪞
          </div>
          <p className="font-jua text-sm md:text-base text-[#3A3350]">
            거울을 먼저 골라 봐요!
          </p>
          <p className="font-body text-xs text-[#3A3350]/60 mt-1">
            아래 거울을 누르면 비친 모양이 나와요
          </p>
        </div>
      );
    }

    if (activeMirror === 'spin') {
      return (
        <div className="w-full h-full relative flex items-center justify-center">
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ transform: 'rotate(180deg)' }}
          >
            {renderPatternVisual()}
          </div>
          <div className="absolute w-3.5 h-3.5 rounded-full bg-[#FF9EB5] border-2 border-[#3A3350]" />
        </div>
      );
    }

    if (activeMirror === 'vertical') {
      return (
        <div className="w-full h-full relative overflow-hidden flex">
          {/* Left half */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
          >
            {renderPatternVisual()}
          </div>
          {/* Right half (flipped left half) */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
              transform: 'scaleX(-1)',
              transformOrigin: '50% 50%',
            }}
          >
            {renderPatternVisual()}
          </div>
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-r-[3px] border-dashed border-[#7FD8BE] z-10" />
        </div>
      );
    }

    // Horizontal
    return (
      <div className="w-full h-full relative overflow-hidden flex">
        {/* Top half */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }}
        >
          {renderPatternVisual()}
        </div>
        {/* Bottom half (flipped top half) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
            transform: 'scaleY(-1)',
            transformOrigin: '50% 50%',
          }}
        >
          {renderPatternVisual()}
        </div>
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0 border-b-[3px] border-dashed border-[#7FD8BE] z-10" />
      </div>
    );
  };

  const getMirrorCaption = () => {
    if (pattern.isApi && !selectedApiMirror) {
      return '아래에서 거울을 골라 보세요';
    }
    if (activeMirror === 'vertical') return '왼쪽 절반 + 거울에 비친 왼쪽 절반';
    if (activeMirror === 'horizontal') return '위쪽 절반 + 거울에 비친 위쪽 절반';
    return '가운데 점을 중심으로 180° 돌린 모양';
  };

  const getMirrorPill = () => {
    if (pattern.isApi && !selectedApiMirror) {
      return '거울 선택하기';
    }
    return activeMirror === 'vertical'
      ? '세로 거울 적용'
      : activeMirror === 'horizontal'
      ? '가로 거울 적용'
      : '빙글 거울 적용';
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
            무늬 탐정
          </h1>
        </div>

        {/* Change Pattern Button */}
        <button
          type="button"
          onClick={handleNextPattern}
          aria-label="다른 무늬 살펴보기"
          className="min-h-[56px] px-4 rounded-2xl bg-white border-[3px] border-[#3A3350] font-jua text-sm md:text-base jelly-btn flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-5 h-5 text-[#8C6CFF]" />
          <span>다른 무늬</span>
        </button>
      </div>

      {/* Main Dual Card Frame */}
      <div className="flex-1 max-w-5xl mx-auto w-full flex flex-col justify-between gap-4">
        
        {/* Comparison Stages: Original vs Mirror */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
          
          {/* LEFT: 원래 무늬 (Original) */}
          <div className="bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-5 shadow-[0_6px_0_#3A3350] flex flex-col items-center">
            <h2 className="font-jua text-xl md:text-2xl text-[#3A3350] mb-3">
              원래 무늬
            </h2>

            {/* Pattern Canvas Container */}
            <div className="w-full max-w-[280px] md:max-w-[320px] aspect-square rounded-2xl border-4 border-[#3A3350] bg-white p-4 shadow-inner flex items-center justify-center relative overflow-hidden">
              {isAlternating && alternateStep && activeMirror ? (
                <div className="w-full h-full animate-pop-in">
                  {renderMirroredPattern()}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {renderPatternVisual()}
                </div>
              )}
            </div>

            {/* Information */}
            <div className="text-center mt-3 font-body text-xs md:text-sm text-[#3A3350]/70">
              <strong>{pattern.name}</strong> · [{pattern.period}] · 출처: {pattern.source}
            </div>

            {/* Only show symmetry explanation for built-in patterns */}
            {!pattern.isApi && (
              <div className="text-center mt-1 font-jua text-xs text-[#8C6CFF]">
                특징: {pattern.symmetryType}
              </div>
            )}
          </div>

          {/* RIGHT: 거울로 만든 무늬 (Mirror Created) */}
          <div className="bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-5 shadow-[0_6px_0_#3A3350] flex flex-col items-center">
            <h2 className="font-jua text-xl md:text-2xl text-[#3A3350] mb-3">
              거울로 만든 무늬
            </h2>

            {/* Mirrored Container */}
            <div className="w-full max-w-[280px] md:max-w-[320px] aspect-square rounded-2xl border-4 border-[#3A3350] bg-white p-4 shadow-inner flex items-center justify-center relative overflow-hidden">
              {renderMirroredPattern()}
            </div>

            {/* Caption */}
            <div className="text-center mt-3 font-body text-xs md:text-sm text-[#3A3350]/70">
              {getMirrorCaption()}
            </div>
            <div className="text-center mt-1 font-jua text-xs text-[#4CD38A]">
              {getMirrorPill()}
            </div>
          </div>

        </div>

        {/* Action Controls Deck */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-4 mt-2">
          
          {/* Mirror Type Buttons */}
          <button
            type="button"
            onClick={() => handleSelectMirror('vertical')}
            aria-label="세로 거울 선택"
            className={`
              min-h-[58px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer transition-all
              ${activeMirror === 'vertical'
                ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-white text-[#3A3350] jelly-btn'
              }
              ${bounceMirrors ? 'animate-bounce ring-4 ring-[#FF5C8A]' : ''}
            `}
          >
            <div className="w-4 h-4 border-2 border-dashed border-[#3A3350] flex items-center justify-center">
              <div className="w-0 h-full border-r-2 border-dashed border-[#3A3350]" />
            </div>
            <span>세로 거울</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMirror('horizontal')}
            aria-label="가로 거울 선택"
            className={`
              min-h-[58px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer transition-all
              ${activeMirror === 'horizontal'
                ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-white text-[#3A3350] jelly-btn'
              }
              ${bounceMirrors ? 'animate-bounce ring-4 ring-[#FF5C8A]' : ''}
            `}
          >
            <div className="w-4 h-4 border-2 border-dashed border-[#3A3350] flex items-center justify-center">
              <div className="h-0 w-full border-b-2 border-dashed border-[#3A3350]" />
            </div>
            <span>가로 거울</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMirror('spin')}
            aria-label="빙글 거울 선택"
            className={`
              min-h-[58px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer transition-all
              ${activeMirror === 'spin'
                ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-white text-[#3A3350] jelly-btn'
              }
              ${bounceMirrors ? 'animate-bounce ring-4 ring-[#FF5C8A]' : ''}
            `}
          >
            <span className="text-base">🔄</span>
            <span>빙글 거울</span>
          </button>

          {/* 번갈아 보기 Button */}
          <button
            type="button"
            onClick={handleAlternatingClick}
            aria-label={isAlternating ? '번갈아 보기 끄기' : '번갈아 보기 켜기'}
            className={`
              min-h-[58px] px-4 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer
              ${isAlternating
                ? 'bg-[#FFD66B] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-[#FFD66B] text-[#3A3350] jelly-btn'
              }
            `}
          >
            <ArrowLeftRight className="w-5 h-5 text-[#3A3350]" />
            <span>{isAlternating ? '번갈아 보는 중' : '번갈아 보기'}</span>
          </button>

          {/* Action Buttons: Built-in vs API */}
          {pattern.isApi ? (
            /* API Pattern: Dynamic text based on chosen mirror */
            <button
              type="button"
              onClick={handleApiTraceClick}
              aria-label={
                selectedApiMirror === 'vertical'
                  ? '세로 거울로 만들기'
                  : selectedApiMirror === 'horizontal'
                  ? '가로 거울로 만들기'
                  : selectedApiMirror === 'spin'
                  ? '빙글로 만들기'
                  : '거울을 먼저 골라 만들기'
              }
              className={`
                min-h-[58px] px-5 rounded-2xl border-[3px] font-jua text-sm md:text-base
                flex items-center gap-2 cursor-pointer shadow-xs transition-all
                ${selectedApiMirror === null
                  ? 'bg-white/80 text-[#3A3350]/40 border-[#3A3350]/30 opacity-50'
                  : selectedApiMirror === 'spin'
                  ? 'bg-[#FFD66B] text-[#3A3350] border-[#3A3350] jelly-btn'
                  : 'bg-[#7FD8BE] text-[#3A3350] border-[#3A3350] jelly-btn'
                }
              `}
            >
              <Pencil className="w-5 h-5 text-[#3A3350]" />
              <span>
                {selectedApiMirror === 'vertical'
                  ? '세로 거울로 만들기'
                  : selectedApiMirror === 'horizontal'
                  ? '가로 거울로 만들기'
                  : selectedApiMirror === 'spin'
                  ? '빙글로 만들기'
                  : '이 무늬처럼 만들기'}
              </span>
            </button>
          ) : pattern.targetMode === 'none' ? (
            /* Asymmetric Pattern (구름무늬): 2 buttons with prompt header */
            <div className="flex flex-col items-center gap-1.5">
              <span className="font-jua text-xs md:text-sm text-[#8C6CFF]">
                이 무늬를 대칭으로 바꿔 볼까?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onTracePattern(pattern, 'mirror', 'vertical');
                  }}
                  aria-label="거울로 바꿔 보기"
                  className="min-h-[52px] px-4 rounded-2xl bg-[#7FD8BE] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm md:text-base jelly-btn flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Pencil className="w-4 h-4 text-[#3A3350]" />
                  <span>거울로 바꿔 보기</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onTracePattern(pattern, 'spin');
                  }}
                  aria-label="빙글로 바꿔 보기"
                  className="min-h-[52px] px-4 rounded-2xl bg-[#FFD66B] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm md:text-base jelly-btn flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-4 h-4 text-[#3A3350]" />
                  <span>빙글로 바꿔 보기</span>
                </button>
              </div>
            </div>
          ) : pattern.targetMode === 'spin' ? (
            /* Built-in Point Symmetry (태극무늬, 바람개비무늬): "빙글로 만들기" */
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onTracePattern(pattern, 'spin');
              }}
              aria-label="빙글로 만들기"
              className="min-h-[58px] px-5 rounded-2xl bg-[#FFD66B] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm md:text-base jelly-btn flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-5 h-5 text-[#3A3350]" />
              <span>빙글로 만들기</span>
            </button>
          ) : (
            /* Built-in Mirror Symmetry (연꽃무늬, 박쥐무늬, 꽃살무늬 격자): "거울로 만들기" */
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onTracePattern(pattern, 'mirror', pattern.targetAxis || 'vertical');
              }}
              aria-label="거울로 만들기"
              className="min-h-[58px] px-5 rounded-2xl bg-[#7FD8BE] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm md:text-base jelly-btn flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Pencil className="w-5 h-5 text-[#3A3350]" />
              <span>거울로 만들기</span>
            </button>
          )}

        </div>

        {/* Question Footer Bar (No judgment, pure curiosity) */}
        <div className="w-full bg-white border-[3px] border-[#3A3350] rounded-full p-2.5 shadow-[0_4px_0_#3A3350] flex items-center justify-center gap-2 text-center">
          <div className="w-7 h-7 rounded-full bg-[#7FD8BE] border-2 border-[#3A3350] flex items-center justify-center text-sm font-bold">
            🤖
          </div>
          <span className="font-jua text-base md:text-lg text-[#3A3350]">
            똑같아 보여? 어디가 달라?
          </span>
        </div>

      </div>
    </div>
  );
};
