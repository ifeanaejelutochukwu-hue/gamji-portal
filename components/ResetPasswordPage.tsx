import React, { useState } from 'react';
import { api } from '../services/apiClient';
import { Logo } from './Logo';
import { Input } from './Input';
import { Button } from './Button';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordPageProps {
  token: string;
  onBack: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token, onBack }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError(null);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nursing-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <Logo className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Set New Password</h2>
          <p className="text-slate-500 text-sm mt-1">Enter your new password below</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h3 className="font-bold text-green-900 text-lg">Password Updated!</h3>
            <p className="text-slate-600 text-sm">Your password has been changed. You can now sign in.</p>
            <Button onClick={onBack} className="w-full bg-nursing-600 hover:bg-nursing-700">
              Go to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="relative">
              <Input id="password" label="New Password" type={showPwd ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" icon={<Lock className="w-5 h-5" />} required />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <Input id="confirm" label="Confirm New Password" type="password"
              value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password" icon={<Lock className="w-5 h-5" />} required />
            <Button type="submit" className="w-full bg-nursing-600 hover:bg-nursing-700" isLoading={loading}>
              Set New Password
            </Button>
            <button type="button" onClick={onBack}
              className="w-full text-center text-sm text-slate-500 hover:text-nursing-600">
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
