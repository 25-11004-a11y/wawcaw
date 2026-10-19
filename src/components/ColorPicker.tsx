import React from 'react';
import { PALETTE_COLORS } from '../constants';
import { playClickSound } from '../sound';

interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  className?: string;
}

const COLOR_NAMES: Record<string, string> = {
  '#FF5C8A': '분홍색',
  '#FF9F43': '주황색',
  '#FFD23F': '노란색',
  '#4CD38A': '초록색',
  '#3FA7FF': '파란색',
  '#8C6CFF': '보라색',
  '#8B5E3C': '갈색',
  '#3A3350': '남색',
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onSelectColor,
  className = '',
}) => {
  return (
    <div
      role="radiogroup"
      aria-label="그리기 색상 선택"
      className={`grid grid-cols-2 gap-2.5 p-1 ${className}`}
    >
      {PALETTE_COLORS.map((color) => {
        const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
        const colorName = COLOR_NAMES[color] || color;

        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${colorName} 선택`}
            onClick={() => {
              playClickSound();
              onSelectColor(color);
            }}
            style={{ backgroundColor: color }}
            className={`
              w-14 h-14 min-w-[56px] min-h-[56px] rounded-full
              border-[3.5px] transition-all duration-150 cursor-pointer outline-none
              flex items-center justify-center relative
              ${isSelected
                ? 'border-[#3A3350] scale-105 shadow-[0_4px_0_#3A3350] ring-4 ring-[#3A3350]/20'
                : 'border-[#3A3350]/60 shadow-[0_3px_0_rgba(58,51,80,0.4)] hover:scale-102 hover:border-[#3A3350]'
              }
              active:translate-y-[2px] active:shadow-[0_1px_0_#3A3350]
            `}
          >
            {isSelected && (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke={color === '#FFD23F' || color === '#4CD38A' ? '#3A3350' : '#FFFFFF'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
};
