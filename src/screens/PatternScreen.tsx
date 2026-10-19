import React, { useState, useEffect } from 'react';
import { TRADITIONAL_PATTERNS, TraditionalPattern, getTodayPattern, loadPatternsData } from '../patterns';
import { RobotMascot } from '../components/RobotMascot';
import { playClickSound } from '../sound';
import { Home, RefreshCw, Pencil, ArrowLeftRight } from 'lucide-react';

interface PatternScreenProps {
  onHome: () => void;
  onTracePattern: (pattern: TraditionalPattern) => void;
}

type MirrorType = 'vertical' | 'horizontal' | 'spin';

export const PatternScreen: React.FC<PatternScreenProps> = ({ onHome, onTracePattern }) => {
  const [patterns, setPatterns] = useState<TraditionalPattern[]>(() => {
    const today = getTodayPattern();
    const otherPatterns = TRADITIONAL_PATTERNS.filter((p) => p.id !== today.id);
    return [today, ...otherPatterns];
  });
  const [currentPatternIndex, setCurrentPatternIndex] = useState<number>(0);
  const [mirrorType, setMirrorType] = useState<MirrorType>('vertical');
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
          setCurrentPatternIndex(todayIdx >= 0 ? todayIdx : 0);
        }
      })
      .catch(() => {
        // Fallback already in place
      });
  }, []);

  const pattern = patterns[currentPatternIndex] || TRADITIONAL_PATTERNS[0];

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
    setCurrentPatternIndex((prev) => (prev + 1) % patterns.length);
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

    return pattern.renderSvg();
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

    if (mirrorType === 'spin') {
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

    if (mirrorType === 'vertical') {
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
    if (mirrorType === 'vertical') return '왼쪽 절반 + 거울에 비친 왼쪽 절반';
    if (mirrorType === 'horizontal') return '위쪽 절반 + 거울에 비친 위쪽 절반';
    return '가운데 점을 중심으로 180° 돌린 모양';
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

      {/* Main Dual Card Frame matching Wireframe ⑦ */}
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
              {isAlternating && alternateStep ? (
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
              {mirrorType === 'vertical' ? '세로 거울' : mirrorType === 'horizontal' ? '가로 거울' : '빙글 거울'} 적용
            </div>
          </div>

        </div>

        {/* Action Controls Deck */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-4 mt-2">
          
          {/* Mirror Type Buttons */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMirrorType('vertical');
            }}
            aria-label="세로 거울 선택"
            className={`
              min-h-[58px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer
              ${mirrorType === 'vertical'
                ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-white text-[#3A3350] jelly-btn'
              }
            `}
          >
            <div className="w-4 h-4 border-2 border-dashed border-[#3A3350] flex items-center justify-center">
              <div className="w-0 h-full border-r-2 border-dashed border-[#3A3350]" />
            </div>
            <span>세로 거울</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMirrorType('horizontal');
            }}
            aria-label="가로 거울 선택"
            className={`
              min-h-[58px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer
              ${mirrorType === 'horizontal'
                ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-white text-[#3A3350] jelly-btn'
              }
            `}
          >
            <div className="w-4 h-4 border-2 border-dashed border-[#3A3350] flex items-center justify-center">
              <div className="h-0 w-full border-b-2 border-dashed border-[#3A3350]" />
            </div>
            <span>가로 거울</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMirrorType('spin');
            }}
            aria-label="빙글 거울 선택"
            className={`
              min-h-[58px] px-3.5 rounded-2xl border-[3px] border-[#3A3350] font-jua text-sm md:text-base
              flex items-center gap-1.5 cursor-pointer
              ${mirrorType === 'spin'
                ? 'bg-[#B9A3FF] text-[#3A3350] shadow-[0_2px_0_#3A3350] translate-y-[2px]'
                : 'bg-white text-[#3A3350] jelly-btn'
              }
            `}
          >
            <span className="text-base">🔄</span>
            <span>빙글 거울</span>
          </button>

          {/* 번갈아 보기 Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsAlternating(!isAlternating);
            }}
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

          {/* 이 무늬처럼 만들기 Button */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onTracePattern(pattern);
            }}
            aria-label="이 무늬처럼 거울 작업실에서 만들기"
            className="min-h-[58px] px-5 rounded-2xl bg-[#7FD8BE] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-sm md:text-base jelly-btn flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Pencil className="w-5 h-5 text-[#3A3350]" />
            <span>이 무늬처럼 만들기</span>
          </button>

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
