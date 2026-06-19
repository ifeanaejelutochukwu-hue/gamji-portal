import React, { useState, useEffect } from 'react';
import { api, getGoBackendConfig, saveGoBackendConfig, pingGoBackend } from '../services/apiClient';
import { Logo } from './Logo';
import { Button } from './Button';
import { Input } from './Input';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, Activity, Heart,
  ArrowRight, Settings, Check, User, BookOpen, CheckCircle
} from 'lucide-react';
import { UserRole } from '../App';

interface AuthPageProps {
  onLogin: (role: UserRole, userId: string) => void;
}

const PROGRAMS = ['General Nursing', 'Basic Midwifery'];

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Register state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regProgram, setRegProgram] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);

  // Dev config state
  const [showConfig, setShowConfig] = useState(false);
  const [goEnabled, setGoEnabled] = useState(false);
  const [goUrl, setGoUrl] = useState('http://localhost:8080');
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    const config = getGoBackendConfig();
    setGoEnabled(config.enabled);
    setGoUrl(config.url);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const session = await api.auth.login(email, password);
      if (session?.user) {
        onLogin(session.user.role as UserRole, session.user.id);
      } else {
        throw new Error('Unable to establish user profile.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    if (!regProgram) {
      setRegError('Please select a program.');
      return;
    }

    setRegLoading(true);
    try {
      await api.students.register({
        full_name: regFullName,
        email: regEmail,
        password: regPassword,
        program: regProgram,
      });
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setIsLoading(true);
    setError(null);
    setEmail(quickEmail);
    setPassword('secure-pass123');
    try {
      const session = await api.auth.login(quickEmail, 'secure-pass123');
      if (session?.user) {
        onLogin(session.user.role as UserRole, session.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = () => {
    saveGoBackendConfig(goEnabled, goUrl);
    setShowConfig(false);
  };

  const handleTestConnection = async () => {
    setPingStatus('testing');
    const isAlive = await pingGoBackend(goUrl);
    setPingStatus(isAlive ? 'success' : 'failed');
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* Left Side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-nursing-900 overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-nursing-900/50 to-nursing-900/90"></div>
        <div className="relative z-10"><Logo variant="light" /></div>
        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight mb-6">Excellence in Nursing Education & Practice</h2>
          <p className="text-nursing-100 text-lg leading-relaxed mb-8">
            Welcome to the Gamji College of Nursing Sciences Portal. Securely access your academic resources, results, and administrative tools.
          </p>
          <div className="flex gap-6 text-sm font-medium text-nursing-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm"><Activity className="w-5 h-5" /></div>
              <span>Academic<br/>Excellence</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm"><Heart className="w-5 h-5" /></div>
              <span>Compassionate<br/>Care</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-xs text-nursing-300">
          &copy; {new Date().getFullYear()} Gamji College of Nursing Sciences. All rights reserved.
        </div>
      </div>

      {/* Right Side — Forms */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-16 bg-nursing-50/30 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="lg:hidden text-center"><Logo className="mx-auto" /></div>

          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => { setTab('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'login' ? 'bg-white text-nursing-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setRegError(null); setRegSuccess(false); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'register' ? 'bg-white text-nursing-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              New Student Registration
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                <p className="mt-1 text-sm text-slate-500">Sign in to access your dashboard.</p>
              </div>

              <form className="space-y-5" onSubmit={handleLogin}>
                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <Input id="email" label="Email Address" type="email" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" icon={<Mail className="w-5 h-5" />} />

                <div className="relative">
                  <Input id="password" label="Password" type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" required value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                    icon={<Lock className="w-5 h-5" />} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-nursing-600 focus:ring-nursing-500" />
                    <span className="text-sm text-slate-600">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-medium text-nursing-600 hover:underline">Forgot password?</a>
                </div>

                <Button type="submit" className="w-full bg-nursing-600 hover:bg-nursing-700 shadow-lg shadow-nursing-600/20" isLoading={isLoading}>
                  Sign In <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              {/* Quick login buttons — dev only */}
              {import.meta.env.VITE_SHOW_QUICK_LOGIN === 'true' && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Quick Preview Portals</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: 'Student', email: 'student@gamji.edu.ng', color: 'bg-nursing-50 hover:bg-nursing-100/80 text-nursing-700 border-nursing-100' },
                      { label: 'Lecturer', email: 'lecturer@gamji.edu.ng', color: 'bg-blue-50 hover:bg-blue-100/80 text-blue-700 border-blue-100' },
                      { label: 'Registrar', email: 'registrar@gamji.edu.ng', color: 'bg-purple-50 hover:bg-purple-100/80 text-purple-700 border-purple-100' },
                      { label: 'Bursar', email: 'bursar@gamji.edu.ng', color: 'bg-orange-50 hover:bg-orange-100/80 text-amber-800 border-orange-100' },
                      { label: 'Admin', email: 'admin@gamji.edu.ng', color: 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-100' },
                      { label: 'Provost', email: 'provost@gamji.edu.ng', color: 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200' },
                    ].map((r, i) => (
                      <button key={i} type="button" onClick={() => handleQuickLogin(r.email)}
                        className={`px-2 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${r.color}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-slate-500 pt-2 flex flex-col items-center gap-3">
                <p>Need help? <a href="#" className="font-medium text-nursing-600 hover:underline">Contact IT Support</a></p>
                {import.meta.env.VITE_SHOW_QUICK_LOGIN === 'true' && (
                  <button type="button" onClick={() => setShowConfig(!showConfig)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer">
                    <Settings className="w-3.5 h-3.5" />
                    {showConfig ? 'Hide Go Backend Settings' : 'Configure Go Lang Backend'}
                  </button>
                )}
              </div>

              {import.meta.env.VITE_SHOW_QUICK_LOGIN === 'true' && showConfig && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-nursing-600" /> Go Backend Integrator
                    </h4>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${goEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                      {goEnabled ? 'Enabled' : 'Mock Mode'}
                    </span>
                  </div>
                  <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 cursor-pointer">
                    <input type="checkbox" checked={goEnabled} onChange={e => setGoEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-nursing-600 border-slate-300 cursor-pointer" />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block">Route to Go Backend</span>
                      <span className="text-[10px] text-slate-500">Uncheck for mock/sandbox mode</span>
                    </div>
                  </label>
                  {goEnabled && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input type="text" value={goUrl} onChange={e => setGoUrl(e.target.value)}
                          placeholder="http://localhost:8080"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500" />
                        <button type="button" onClick={handleTestConnection} disabled={pingStatus === 'testing'}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white disabled:opacity-50">
                          {pingStatus === 'testing' ? 'Ping...' : 'Test'}
                        </button>
                      </div>
                      {pingStatus === 'success' && <p className="text-[11px] text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Connected!</p>}
                      {pingStatus === 'failed' && <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Connection refused.</p>}
                    </div>
                  )}
                  <button type="button" onClick={handleSaveConfig}
                    className="w-full py-1.5 rounded-lg text-xs font-bold bg-nursing-600 hover:bg-nursing-700 text-white transition">
                    Save Configuration
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Registration</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Register for a new student account. Your registration will be reviewed and activated by the Registrar.
                </p>
              </div>

              {regSuccess ? (
                <div className="p-6 rounded-2xl bg-green-50 border border-green-100 text-center space-y-4">
                  <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
                  <h3 className="text-lg font-bold text-green-900">Registration Submitted!</h3>
                  <p className="text-sm text-green-700">
                    Your application has been received and a registration number has been assigned to you.
                    Please wait for the Registrar to activate your account before you can log in.
                  </p>
                  <p className="text-xs text-green-600 font-medium">You will be notified when your account is activated.</p>
                  <button onClick={() => { setTab('login'); setRegSuccess(false); }}
                    className="text-sm font-medium text-green-700 hover:underline">
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleRegister}>
                  {regError && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{regError}</p>
                    </div>
                  )}

                  <Input id="reg-name" label="Full Name" type="text" required
                    value={regFullName} onChange={e => setRegFullName(e.target.value)}
                    placeholder="e.g. Hadiza Bello Shagari" icon={<User className="w-5 h-5" />} />

                  <Input id="reg-email" label="Email Address" type="email" required
                    value={regEmail} onChange={e => setRegEmail(e.target.value)}
                    placeholder="your@email.com" icon={<Mail className="w-5 h-5" />} />

                  {/* Program dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-slate-400" /> Program
                    </label>
                    <select required value={regProgram} onChange={e => setRegProgram(e.target.value)}
                      className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500">
                      <option value="">-- Select your program --</option>
                      {PROGRAMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <Input id="reg-password" label="Password" type={regShowPassword ? 'text' : 'password'} required
                      value={regPassword} onChange={e => setRegPassword(e.target.value)}
                      placeholder="At least 8 characters" icon={<Lock className="w-5 h-5" />} />
                    <button type="button" onClick={() => setRegShowPassword(!regShowPassword)}
                      className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none">
                      {regShowPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <Input id="reg-confirm" label="Confirm Password" type="password" required
                    value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password" icon={<Lock className="w-5 h-5" />} />

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700">
                      <strong>Note:</strong> After registration, your account will be in <em>pending</em> status. 
                      The Registrar will review and activate it. You will then receive a registration number to log in.
                    </p>
                  </div>

                  <Button type="submit" className="w-full bg-nursing-600 hover:bg-nursing-700" isLoading={regLoading}>
                    Submit Registration <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
