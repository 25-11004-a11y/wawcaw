import React from 'react';
import { Mode, MirrorAxis } from './constants';

export type PatternTargetMode = Mode | 'none';

export interface TraditionalPattern {
  id: string;
  name: string;
  period: string;
  source: string;
  symmetryType: string;
  description: string;
  imageUrl?: string;
  isApi?: boolean;
  targetMode?: PatternTargetMode;
  targetAxis?: MirrorAxis;
  renderSvg: (className?: string) => React.ReactNode;
}

export const TRADITIONAL_PATTERNS: TraditionalPattern[] = [
  {
    id: 'lotus',
    name: '연꽃무늬',
    period: '조선',
    source: '한국문화정보원',
    symmetryType: '세로 선대칭',
    description: '세로선으로 접으면 꼭 겹치는 예쁜 연꽃무늬예요.',
    targetMode: 'mirror',
    targetAxis: 'vertical',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* Center lotus petal */}
        <path
          d="M50 18 C40 38 38 65 50 82 C62 65 60 38 50 18Z"
          fill="#FF9EB5"
          stroke="#3A3350"
          strokeWidth="3"
        />
        {/* Left petals */}
        <path
          d="M47 34 C28 44 20 66 42 78 C38 60 42 45 47 34Z"
          fill="#FFD23F"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        <path
          d="M43 48 C16 56 14 78 35 84 C32 72 36 60 43 48Z"
          fill="#7FD8BE"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        {/* Right petals */}
        <path
          d="M53 34 C72 44 80 66 58 78 C62 60 58 45 53 34Z"
          fill="#FFD23F"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        <path
          d="M57 48 C84 56 86 78 65 84 C68 72 64 60 57 48Z"
          fill="#7FD8BE"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        {/* Stem / Base */}
        <path
          d="M40 84 Q50 90 60 84 Q50 96 40 84Z"
          fill="#3FA7FF"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
      </svg>
    ),
  },
  {
    id: 'taegeuk',
    name: '태극무늬',
    period: '조선',
    source: '한국문화정보원',
    symmetryType: '점대칭 (선대칭 아님)',
    description: '180도 빙글 돌려도 똑같은 점대칭 무늬예요.',
    targetMode: 'spin',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" className={className}>
        {/* Outer border circle */}
        <circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#3A3350" strokeWidth="3.5" />
        {/* Blue lower semicircle */}
        <path
          d="M 50 6 A 44 44 0 0 0 50 94 A 22 22 0 0 1 50 50 A 22 22 0 0 0 50 6 Z"
          fill="#3FA7FF"
          stroke="#3A3350"
          strokeWidth="2"
        />
        {/* Red upper semicircle */}
        <path
          d="M 50 6 A 44 44 0 0 1 50 94 A 22 22 0 0 1 50 50 A 22 22 0 0 0 50 6 Z"
          fill="#FF5C8A"
          stroke="#3A3350"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    id: 'bat',
    name: '박쥐무늬',
    period: '조선',
    source: '한국문화정보원',
    symmetryType: '세로 선대칭',
    description: '복을 가져다주는 박쥐가 날개를 활짝 편 선대칭 무늬예요.',
    targetMode: 'mirror',
    targetAxis: 'vertical',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* Center head / body */}
        <ellipse cx="50" cy="45" rx="8" ry="12" fill="#8C6CFF" stroke="#3A3350" strokeWidth="3" />
        <circle cx="50" cy="30" r="7" fill="#8C6CFF" stroke="#3A3350" strokeWidth="3" />
        {/* Ears */}
        <polygon points="46,24 43,15 48,22" fill="#8C6CFF" stroke="#3A3350" strokeWidth="2" />
        <polygon points="54,24 57,15 52,22" fill="#8C6CFF" stroke="#3A3350" strokeWidth="2" />
        {/* Left Wing */}
        <path
          d="M44 40 Q25 20 8 36 Q18 52 24 56 Q20 68 32 70 Q38 65 44 55 Z"
          fill="#7FD8BE"
          stroke="#3A3350"
          strokeWidth="3"
        />
        {/* Right Wing */}
        <path
          d="M56 40 Q75 20 92 36 Q82 52 76 56 Q80 68 68 70 Q62 65 56 55 Z"
          fill="#7FD8BE"
          stroke="#3A3350"
          strokeWidth="3"
        />
        {/* Tail fan */}
        <path
          d="M45 57 Q50 78 55 57 Z"
          fill="#FFD23F"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
      </svg>
    ),
  },
  {
    id: 'pinwheel',
    name: '바람개비무늬',
    period: '조선',
    source: '한국문화정보원',
    symmetryType: '점대칭',
    description: '빙글빙글 돌아가는 점대칭 바람개비예요.',
    targetMode: 'spin',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <circle cx="50" cy="50" r="44" stroke="#3A3350" strokeWidth="3.5" fill="#FAF8FF" />
        {/* Blade 1 (Top-Right) */}
        <path
          d="M50 50 L50 12 Q75 14 78 38 Z"
          fill="#FF5C8A"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        {/* Blade 2 (Right-Bottom) */}
        <path
          d="M50 50 L88 50 Q86 75 62 78 Z"
          fill="#FFD23F"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        {/* Blade 3 (Bottom-Left) */}
        <path
          d="M50 50 L50 88 Q25 86 22 62 Z"
          fill="#4CD38A"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        {/* Blade 4 (Left-Top) */}
        <path
          d="M50 50 L12 50 Q14 25 38 22 Z"
          fill="#3FA7FF"
          stroke="#3A3350"
          strokeWidth="2.5"
        />
        {/* Center Pin */}
        <circle cx="50" cy="50" r="6" fill="#FFFFFF" stroke="#3A3350" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'flower_lattice',
    name: '꽃살무늬 격자',
    period: '조선',
    source: '한국문화정보원',
    symmetryType: '선대칭과 점대칭 모두',
    description: '가로, 세로로 접어도 겹치고 돌려도 똑같은 완벽한 대칭 무늬예요.',
    targetMode: 'mirror',
    targetAxis: 'both',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* Outer square frame */}
        <rect x="8" y="8" width="84" height="84" rx="10" stroke="#3A3350" strokeWidth="3.5" fill="#FFFDF8" />
        {/* Cross bars */}
        <line x1="50" y1="8" x2="50" y2="92" stroke="#3A3350" strokeWidth="2.5" />
        <line x1="8" y1="50" x2="92" y2="50" stroke="#3A3350" strokeWidth="2.5" />
        {/* 4 Petals at center */}
        <ellipse cx="50" cy="30" rx="9" ry="14" fill="#FF9EB5" stroke="#3A3350" strokeWidth="2" />
        <ellipse cx="50" cy="70" rx="9" ry="14" fill="#FF9EB5" stroke="#3A3350" strokeWidth="2" />
        <ellipse cx="30" cy="50" rx="14" ry="9" fill="#FF9EB5" stroke="#3A3350" strokeWidth="2" />
        <ellipse cx="70" cy="50" rx="14" ry="9" fill="#FF9EB5" stroke="#3A3350" strokeWidth="2" />
        {/* Corner diagonal petals */}
        <circle cx="28" cy="28" r="8" fill="#FFD66B" stroke="#3A3350" strokeWidth="2" />
        <circle cx="72" cy="28" r="8" fill="#FFD66B" stroke="#3A3350" strokeWidth="2" />
        <circle cx="28" cy="72" r="8" fill="#FFD66B" stroke="#3A3350" strokeWidth="2" />
        <circle cx="72" cy="72" r="8" fill="#FFD66B" stroke="#3A3350" strokeWidth="2" />
        {/* Center blossom */}
        <circle cx="50" cy="50" r="7" fill="#7FD8BE" stroke="#3A3350" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: 'cloud',
    name: '구름무늬',
    period: '조선',
    source: '한국문화정보원',
    symmetryType: '대칭 아님 (비대칭)',
    description: '자유롭게 흘러가는 뭉게구름처럼 대칭이 아닌 무늬예요.',
    targetMode: 'none',
    renderSvg: (className = 'w-full h-full') => (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        <path
          d="M 22 65 Q 12 55 20 42 Q 24 26 42 28 Q 54 16 68 24 Q 82 22 84 38 Q 92 48 82 62 Q 72 74 54 70 Q 34 76 22 65 Z"
          fill="#8EC9FF"
          stroke="#3A3350"
          strokeWidth="3.5"
        />
        {/* Spiral cloud tail (asymmetric) */}
        <path
          d="M 38 48 Q 50 38 60 48 Q 66 56 56 60 Q 46 62 46 54"
          stroke="#3A3350"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="72" cy="45" r="4" fill="#FFFFFF" />
        <circle cx="32" cy="38" r="3" fill="#FFFFFF" />
      </svg>
    ),
  },
];

/**
 * Gets the pattern of the day based on the Korean local date.
 */
export function getTodayPattern(): TraditionalPattern {
  try {
    const todayStr = new Date().toLocaleDateString('ko-KR');
    let hash = 0;
    for (let i = 0; i < todayStr.length; i++) {
      hash = (hash * 31 + todayStr.charCodeAt(i)) % TRADITIONAL_PATTERNS.length;
    }
    return TRADITIONAL_PATTERNS[Math.abs(hash) % TRADITIONAL_PATTERNS.length];
  } catch {
    return TRADITIONAL_PATTERNS[0];
  }
}

/**
 * Loads pattern data by first attempting /api/patterns.
 * Silently falls back to built-in traditional patterns if unavailable or failed.
 */
export async function loadPatternsData(): Promise<{
  today: TraditionalPattern;
  list: TraditionalPattern[];
}> {
  try {
    const res = await fetch('/api/patterns', {
      signal: AbortSignal.timeout(3500),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.today && Array.isArray(data.list) && data.list.length > 0) {
        const mapItem = (item: {
          id: string;
          name: string;
          era?: string;
          category?: string;
          imageUrl: string;
        }): TraditionalPattern => ({
          id: item.id,
          name: item.name,
          period: item.era || '조선',
          source: data.source || '한국문화정보원',
          symmetryType: item.category || '전통문양',
          description: `${item.name} (${item.era || '조선'})`,
          imageUrl: item.imageUrl,
          isApi: true,
          renderSvg: (className = 'w-full h-full') => (
            <img
              src={item.imageUrl}
              alt={item.name}
              className={`${className} object-contain`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ),
        });

        return {
          today: mapItem(data.today),
          list: data.list.map(mapItem),
        };
      }
    }
  } catch {
    // Silent fallback
  }

  const today = getTodayPattern();
  return {
    today,
    list: TRADITIONAL_PATTERNS,
  };
}
