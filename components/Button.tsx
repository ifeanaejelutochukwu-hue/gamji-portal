import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  isLoading, 
  variant = 'primary', 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nursing-500 disabled:pointer-events-none disabled:opacity-50";
  
  const variants = {
    primary: "bg-nursing-600 text-white hover:bg-nursing-700 shadow-sm",
    outline: "border border-slate-200 bg-transparent hover:bg-slate-100 text-slate-900",
    ghost: "hover:bg-slate-100 text-slate-700",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};