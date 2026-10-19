import React, { useState, useEffect } from 'react';
import { RobotMascot } from '../components/RobotMascot';
import { getTodayPattern, loadPatternsData, TraditionalPattern } from '../patterns';
import { isSoundEnabled, setSoundEnabled, playClickSound } from '../sound';
import { Mode } from '../constants';
import { Volume2, VolumeX } from 'lucide-react';

interface HomeScreenProps {
  onStartMode: (mode: Mode) => void;
  onStartTogether: () => void;
  onOpenGallery: () => void;
  onOpenPattern: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartMode,
  onStartTogether,
  onOpenGallery,
  onOpenPattern,
}) => {
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);

  const [todayPattern, setTodayPattern] = useState<TraditionalPattern>(() => getTodayPattern());

  useEffect(() => {
    loadPatternsData()
      .then((data) => {
        setTodayPattern(data.today);
      })
      .catch(() => {
        // Ignore
      });
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playClickSound();
    }
  };

  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center p-3 md:p-6 factory-bg">
      {/* Outer container matching wireframe card border style */}
      <div className="w-full max-w-5xl bg-[#FFF8EE] border-[3.5px] border-[#3A3350] rounded-3xl p-4 md:p-8 shadow-[0_8px_0_#3A3350] flex flex-col justify-between gap-6 relative">

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Mascot */}
          <div className="flex items-center gap-3 md:gap-5">
            <RobotMascot
              size={76}
              speechText={mascotMessage}
              onSpeechClose={() => setMascotMessage(null)}
            />
            <div>
              <h1 className="font-jua text-3xl md:text-5xl text-[#3A3350] tracking-wide leading-tight">
                뚝딱 대칭 공장
              </h1>
              <p className="font-jua text-sm md:text-lg text-[#3A3350]/70 mt-0.5">
                반쪽만 그리면 완성!
              </p>
            </div>
          </div>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? '효과음 끄기' : '효과음 켜기'}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white border-[3px] border-[#3A3350] jelly-btn flex items-center justify-center text-[#3A3350] cursor-pointer"
          >
            {soundOn ? (
              <Volume2 className="w-7 h-7" />
            ) : (
              <VolumeX className="w-7 h-7 text-[#FF5C8A]" />
            )}
          </button>
        </div>

        {/* Main Content: 2x2 Mode Grid on Left + Today's Pattern on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-stretch">
          
          {/* 2x2 Primary Mode Grid (Spans 2 columns) */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 md:gap-5">
            {/* 1. 거울 만들기 (Mirror Mode, Mint) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onStartMode('mirror');
              }}
              aria-label="거울 만들기 시작하기 (선대칭)"
              className="group relative flex flex-col items-center justify-center p-5 md:p-8 rounded-3xl border-[3.5px] border-[#3A3350] bg-[#7FD8BE] text-[#3A3350] jelly-card min-h-[170px] md:min-h-[220px] cursor-pointer"
            >
              <div className="text-4xl md:text-6xl mb-2 transition-transform group-hover:scale-110">
                🦋
              </div>
              <span className="font-jua text-2xl md:text-3xl text-[#3A3350]">
                거울 만들기
              </span>
              <span className="font-body text-xs md:text-sm text-[#3A3350]/80 mt-1 font-bold">
                선대칭
              </span>
            </button>

            {/* 2. 빙글 만들기 (Spin Mode, Pink) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onStartMode('spin');
              }}
              aria-label="빙글 만들기 시작하기 (점대칭)"
              className="group relative flex flex-col items-center justify-center p-5 md:p-8 rounded-3xl border-[3.5px] border-[#3A3350] bg-[#FF9EB5] text-[#3A3350] jelly-card min-h-[170px] md:min-h-[220px] cursor-pointer"
            >
              <div className="text-4xl md:text-6xl mb-2 transition-transform group-hover:rotate-45">
                🎐
              </div>
              <span className="font-jua text-2xl md:text-3xl text-[#3A3350]">
                빙글 만들기
              </span>
              <span className="font-body text-xs md:text-sm text-[#3A3350]/80 mt-1 font-bold">
                점대칭
              </span>
            </button>

            {/* 3. 같이 만들기 (Yellow - Now Activated!) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onStartTogether();
              }}
              aria-label="같이 만들기 시작하기 (부모와 아이)"
              className="group relative flex flex-col items-center justify-center p-5 md:p-8 rounded-3xl border-[3.5px] border-[#3A3350] bg-[#FFD66B] text-[#3A3350] jelly-card min-h-[170px] md:min-h-[220px] cursor-pointer"
            >
              <div className="text-4xl md:text-6xl mb-2 transition-transform group-hover:scale-110">
                👥
              </div>
              <span className="font-jua text-2xl md:text-3xl text-[#3A3350]">
                같이 만들기
              </span>
              <span className="font-body text-xs md:text-sm text-[#3A3350]/80 mt-1 font-bold">
                둘이서 뚝딱
              </span>
            </button>

            {/* 4. 내 작품 (Sky Blue - Now Activated!) */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenGallery();
              }}
              aria-label="내 작품 보관함 열기"
              className="group relative flex flex-col items-center justify-center p-5 md:p-8 rounded-3xl border-[3.5px] border-[#3A3350] bg-[#8EC9FF] text-[#3A3350] jelly-card min-h-[170px] md:min-h-[220px] cursor-pointer"
            >
              <div className="text-4xl md:text-6xl mb-2 transition-transform group-hover:scale-110">
                🖼️
              </div>
              <span className="font-jua text-2xl md:text-3xl text-[#3A3350]">
                내 작품
              </span>
              <span className="font-body text-xs md:text-sm text-[#3A3350]/80 mt-1 font-bold">
                작품 보관함
              </span>
            </button>
          </div>

          {/* Right Card: '오늘의 무늬' */}
          <div className="bg-white border-[3.5px] border-[#3A3350] rounded-3xl p-5 md:p-6 shadow-[0_6px_0_#3A3350] flex flex-col justify-between min-h-[260px]">
            <div>
              <h2 className="font-jua text-xl md:text-2xl text-[#3A3350] mb-3">
                오늘의 무늬
              </h2>

              {/* Dashed Inner Frame with Actual Today Pattern SVG */}
              <div
                onClick={() => {
                  playClickSound();
                  onOpenPattern();
                }}
                className="w-full h-36 md:h-44 border-2 border-dashed border-[#B9A3FF] bg-[#FAF8FF] rounded-2xl flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-[#F3EEFF] transition-colors overflow-hidden"
                title="무늬 탐정 열기"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
                  {todayPattern.renderSvg()}
                </div>
                <span className="font-body text-xs text-[#3A3350]/60 mt-1">
                  눌러서 탐정 놀이!
                </span>
              </div>

              <div className="mt-3">
                <p className="font-jua text-base md:text-lg text-[#3A3350]">
                  {todayPattern.name}
                </p>
                <p className="font-body text-xs text-[#3A3350]/60 mt-0.5">
                  시대: {todayPattern.period} · 출처: {todayPattern.source}
                </p>
              </div>
            </div>

            {/* Pattern Detective Button */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenPattern();
              }}
              aria-label="오늘의 무늬 탐정 열기"
              className="w-full min-h-[56px] mt-4 rounded-2xl bg-[#B9A3FF] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-lg jelly-btn flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔍</span>
              <span>무늬 탐정</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
