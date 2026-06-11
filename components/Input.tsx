import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', id, ...props }) => {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`flex h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200
            ${error 
              ? 'border-red-500 focus-visible:ring-red-500' 
              : 'border-slate-200 focus-visible:ring-nursing-500 hover:border-nursing-300'
            } 
            ${icon ? 'pl-10' : ''}
            ${className}
          `}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-3 text-slate-400">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 animate-pulse">{error}</p>
      )}
    </div>
  );
};