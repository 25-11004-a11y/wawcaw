import React from 'react';
import { playClickSound, playWobbleSound } from '../sound';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-pop-in"
    >
      <div className="bg-[#FFF8EE] border-4 border-[#3A3350] rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_8px_0_#3A3350] text-center flex flex-col items-center">
        {/* Cute clean illustration */}
        <div className="w-16 h-16 rounded-full bg-[#FFD66B] border-[3px] border-[#3A3350] flex items-center justify-center mb-4 text-2xl shadow-[0_4px_0_#3A3350]">
          🧹
        </div>

        <h2
          id="confirm-modal-title"
          className="font-jua text-2xl md:text-3xl text-[#3A3350] mb-2"
        >
          {title}
        </h2>

        {message && (
          <p className="font-body text-[#3A3350]/80 text-base mb-6 leading-relaxed">
            {message}
          </p>
        )}

        <div className="flex items-center justify-center gap-5 w-full mt-2">
          {/* Cancel button (Big Pink ✖) */}
          <button
            type="button"
            aria-label="취소하고 돌아가기"
            onClick={() => {
              playClickSound();
              onCancel();
            }}
            className="flex-1 min-h-[64px] rounded-2xl bg-[#FF9EB5] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-2xl jelly-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-3xl leading-none">✖</span>
            <span>취소</span>
          </button>

          {/* Confirm button (Big Green/Mint ✔) */}
          <button
            type="button"
            aria-label="모두 지우기 확인"
            onClick={() => {
              playWobbleSound();
              onConfirm();
            }}
            className="flex-1 min-h-[64px] rounded-2xl bg-[#7FD8BE] text-[#3A3350] border-[3px] border-[#3A3350] font-jua text-2xl jelly-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-3xl leading-none">✔</span>
            <span>지우기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
