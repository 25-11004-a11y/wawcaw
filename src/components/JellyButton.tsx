import React from 'react';
import { playClickSound } from '../sound';

interface JellyButtonProps {
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  color?: string; // background color hex or tailwind class
  textColor?: string;
  isSelected?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabel: string;
  size?: 'normal' | 'large' | 'card' | 'compact';
  badgeCheck?: boolean;
}

export const JellyButton: React.FC<JellyButtonProps> = ({
  label,
  icon,
  onClick,
  color = '#FFFFFF',
  textColor = '#3A3350',
  isSelected = false,
  disabled = false,
  className = '',
  ariaLabel,
  size = 'normal',
  badgeCheck = false,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onClick) {
      playClickSound();
      onClick();
    }
  };

  // Base sizing to meet minimum 64px target
  let sizeClasses = 'min-w-[64px] min-h-[64px] p-2 text-sm';
  if (size === 'compact') {
    sizeClasses = 'min-w-[56px] min-h-[56px] p-1.5 text-xs';
  } else if (size === 'large') {
    sizeClasses = 'min-w-[76px] min-h-[76px] p-3 text-base';
  } else if (size === 'card') {
    sizeClasses = 'w-full h-full p-4 text-lg min-h-[140px]';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      style={{ backgroundColor: color, color: textColor }}
      className={`
        relative flex flex-col items-center justify-center rounded-2xl border-[3px] border-[#3A3350]
        font-jua select-none transition-all duration-100 outline-none
        ${size === 'card' ? 'jelly-card' : 'jelly-btn'}
        ${isSelected ? 'ring-4 ring-[#3A3350]/30 shadow-[0_2px_0_#3A3350] translate-y-[2px]' : ''}
        ${disabled ? 'opacity-45 cursor-not-allowed filter grayscale-[30%]' : 'cursor-pointer'}
        ${sizeClasses}
        ${className}
      `}
    >
      {/* Optional checkmark badge for selected state */}
      {badgeCheck && isSelected && (
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#3A3350] text-white flex items-center justify-center text-xs font-bold shadow-md z-10"
          aria-hidden="true"
        >
          ✓
        </span>
      )}

      {icon && <div className="flex items-center justify-center mb-0.5">{icon}</div>}

      {label && (
        <span className="leading-tight tracking-tight text-center truncate max-w-full">
          {label}
        </span>
      )}
    </button>
  );
};
