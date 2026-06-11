import React from 'react';
import { Cross, Activity } from 'lucide-react';

export const Logo: React.FC<{ className?: string, variant?: 'light' | 'dark' }> = ({ className = "", variant = 'dark' }) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900';
  const iconColor = variant === 'light' ? 'text-white' : 'text-nursing-600';
  const subTextColor = variant === 'light' ? 'text-nursing-100' : 'text-nursing-700';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl shadow-sm ${variant === 'light' ? 'bg-white/20' : 'bg-white border border-nursing-100'}`}>
        <Cross className={`w-7 h-7 ${iconColor}`} />
        <Activity className={`absolute w-3.5 h-3.5 bottom-2.5 right-2.5 ${iconColor}`} />
      </div>
      <div>
        <h1 className={`font-bold text-lg leading-tight tracking-tight ${textColor}`}>
          Gamji <span className={variant === 'light' ? 'text-nursing-200' : 'text-nursing-600'}>College</span>
        </h1>
        <p className={`text-[10px] uppercase tracking-widest font-semibold ${subTextColor}`}>
          Nursing Sciences
        </p>
      </div>
    </div>
  );
};