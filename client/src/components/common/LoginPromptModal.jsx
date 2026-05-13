import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LoginPromptModal = ({ isOpen, onClose, action = 'kufanya hivi' }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 mb-6 md:mb-0 bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Top decoration */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-6 pt-8 pb-10 text-center relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -left-4 bottom-0 w-16 h-16 bg-white/10 rounded-full" />
          <div className="text-5xl mb-3">🔑</div>
          <h2 className="text-xl font-bold text-white">Ingia Kwanza</h2>
          <p className="text-white/70 text-sm mt-1">
            Unahitaji kuingia ili {action}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 -mt-4 bg-white rounded-t-3xl relative z-10">
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-base active:scale-[.98] transition-all shadow-green hover:shadow-green-lg"
            >
              Ingia / Jisajili
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 border-2 border-surface-4 text-ink-4 rounded-2xl font-semibold text-sm active:scale-[.98] transition-all hover:border-ink-3"
            >
              Endelea kutazama
            </button>
          </div>
          <p className="text-center text-xs text-ink-5 mt-4">
            Bado huna akaunti? Jisajili bila malipo
          </p>
        </div>
      </div>
    </div>
  );
};
