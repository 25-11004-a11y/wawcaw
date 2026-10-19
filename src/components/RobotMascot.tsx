import React from 'react';

interface RobotMascotProps {
  size?: number;
  className?: string;
  speechText?: string | null;
  onSpeechClose?: () => void;
}

/**
 * 뚝딱이 (Dduk-ddak-i) Mascot Robot
 * Round friendly factory robot with antennas, bright shiny eyes, and warm smile.
 * Can be swapped with an image asset in the future if desired.
 */
export const RobotMascot: React.FC<RobotMascotProps> = ({
  size = 80,
  className = '',
  speechText,
  onSpeechClose,
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Speech Bubble */}
      {speechText && (
        <div
          role="status"
          className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 bg-[#FFD66B] text-[#3A3350] border-2 border-[#3A3350] px-4 py-1.5 rounded-2xl shadow-[0_3px_0_#3A3350] font-jua text-sm md:text-base whitespace-nowrap animate-pop-in cursor-pointer flex items-center gap-1.5"
          onClick={onSpeechClose}
        >
          <span>💬</span>
          <span>{speechText}</span>
          <span className="text-xs opacity-60 ml-0.5">✖</span>
          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#3A3350]" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[7px] border-x-transparent border-t-[7px] border-t-[#FFD66B]" />
        </div>
      )}

      {/* Robot SVG */}
      <div className="animate-robot-breath transition-transform">
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="뚝딱이 로봇 마스코트"
          role="img"
          className="drop-shadow-[0_4px_0_rgba(58,51,80,0.3)]"
        >
          {/* Antenna */}
          <line
            x1="60"
            y1="14"
            x2="60"
            y2="30"
            stroke="#3A3350"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Antenna Ball */}
          <circle cx="60" cy="12" r="7" fill="#FF5C8A" stroke="#3A3350" strokeWidth="3" />
          <circle cx="58" cy="10" r="2" fill="#FFFFFF" />

          {/* Ears / Bolts */}
          <rect
            x="14"
            y="44"
            width="8"
            height="18"
            rx="4"
            fill="#FFD66B"
            stroke="#3A3350"
            strokeWidth="3"
          />
          <rect
            x="98"
            y="44"
            width="8"
            height="18"
            rx="4"
            fill="#FFD66B"
            stroke="#3A3350"
            strokeWidth="3"
          />

          {/* Head / Body (Teal / Mint #7FD8BE) */}
          <rect
            x="20"
            y="26"
            width="80"
            height="62"
            rx="30"
            fill="#7FD8BE"
            stroke="#3A3350"
            strokeWidth="4"
          />

          {/* Inner Face Screen (Pale mint/cream) */}
          <rect
            x="28"
            y="34"
            width="64"
            height="46"
            rx="22"
            fill="#EAF9F5"
            stroke="#3A3350"
            strokeWidth="3"
          />

          {/* Left Eye */}
          <ellipse cx="45" cy="53" rx="6.5" ry="8" fill="#3A3350" />
          <circle cx="43" cy="50" r="2.5" fill="#FFFFFF" />
          <circle cx="47" cy="56" r="1.2" fill="#FFFFFF" />

          {/* Right Eye */}
          <ellipse cx="75" cy="53" rx="6.5" ry="8" fill="#3A3350" />
          <circle cx="73" cy="50" r="2.5" fill="#FFFFFF" />
          <circle cx="77" cy="56" r="1.2" fill="#FFFFFF" />

          {/* Cheeks (Blushing pink) */}
          <ellipse cx="36" cy="62" rx="4.5" ry="2.5" fill="#FF9EB5" />
          <ellipse cx="84" cy="62" rx="4.5" ry="2.5" fill="#FF9EB5" />

          {/* Happy Smile Mouth */}
          <path
            d="M52 62C52 67 68 67 68 62"
            stroke="#3A3350"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Bottom Neck / Base */}
          <path
            d="M44 88H76L82 99H38L44 88Z"
            fill="#FFD66B"
            stroke="#3A3350"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Bolts on base */}
          <circle cx="50" cy="94" r="2" fill="#3A3350" />
          <circle cx="70" cy="94" r="2" fill="#3A3350" />
        </svg>
      </div>
    </div>
  );
};
