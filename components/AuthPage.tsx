import React, { useState, useEffect } from 'react';
import { api, getGoBackendConfig, saveGoBackendConfig, pingGoBackend } from '../services/apiClient';
import { Logo } from './Logo';
import { Button } from './Button';
import { Input } from './Input';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Activity, Heart, ArrowRight, Settings, Check, Wifi, WifiOff } from 'lucide-react';
import { UserRole } from '../App';

interface AuthPageProps {
  onLogin: (role: UserRole, userId: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Go Backend Settings States
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
      if (session && session.user) {
        onLogin(session.user.role as UserRole, session.user.id);
      } else {
        throw new Error("Unable to establish user profile. Connection returned invalid data.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid login credentials. Please verify your connection or user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setIsLoading(true);
    setError(null);
    setEmail(quickEmail);
    setPassword('secure-pass123');
    try {
      const session = await api.auth.login(quickEmail, 'secure-pass123');
      if (session && session.user) {
        onLogin(session.user.role as UserRole, session.user.id);
      } else {
        throw new Error("Unable to establish user profile. Connection returned invalid data.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid login credentials. Please verify your connection or user.');
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
    if (isAlive) {
      setPingStatus('success');
    } else {
      setPingStatus('failed');
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* Left Side - Branding/Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-nursing-900 overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-nursing-900/50 to-nursing-900/90"></div>
        
        <div className="relative z-10">
          <Logo variant="light" className="scale-100" />
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Excellence in Nursing Education & Practice
          </h2>
          <p className="text-nursing-100 text-lg leading-relaxed mb-8">
            Welcome to the Gamji College of Nursing Sciences Portal. 
            Securely access your academic resources, results, and administrative tools.
          </p>
          
          <div className="flex gap-6 text-sm font-medium text-nursing-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                <Activity className="w-5 h-5" />
              </div>
              <span>Academic<br/>Excellence</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                <Heart className="w-5 h-5" />
              </div>
              <span>Compassionate<br/>Care</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-nursing-300">
          &copy; {new Date().getFullYear()} Gamji College of Nursing Sciences. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-24 bg-nursing-50/30">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="lg:hidden text-center mb-8">
            <Logo className="mx-auto" />
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to Portal</h2>
            <p className="mt-2 text-sm text-slate-600">
              Please enter your credentials to access the dashboard.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <Input
                id="email"
                label="Email Address"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="id@gamji.edu.ng"
                icon={<Mail className="w-5 h-5" />}
              />

              <div className="relative">
                <Input
                  id="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock className="w-5 h-5" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-nursing-600 focus:ring-nursing-500" />
                <span className="text-sm text-slate-600 group-hover:text-slate-800">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-nursing-600 hover:text-nursing-700 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-nursing-600 hover:bg-nursing-700 shadow-lg shadow-nursing-600/20" 
              isLoading={isLoading}
            >
              Sign In <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Access Account Showcase for Easy Testing */}
          {import.meta.env.VITE_SHOW_QUICK_LOGIN === 'true' && (
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Preview Portals
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { label: 'Student', email: 'student@gamji.edu.ng', color: 'bg-nursing-50 hover:bg-nursing-100/80 text-nursing-700 border-nursing-100' },
                { label: 'Lecturer', email: 'lecturer@gamji.edu.ng', color: 'bg-blue-50 hover:bg-blue-100/80 text-blue-700 border-blue-100' },
                { label: 'Registrar', email: 'registrar@gamji.edu.ng', color: 'bg-purple-50 hover:bg-purple-100/80 text-purple-700 border-purple-100' },
                { label: 'Bursar', email: 'bursar@gamji.edu.ng', color: 'bg-orange-50 hover:bg-orange-100/80 text-amber-800 border-orange-100' },
                { label: 'Admin', email: 'admin@gamji.edu.ng', color: 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-100' },
                { label: 'Provost', email: 'provost@gamji.edu.ng', color: 'bg-slate-50 hover:bg-slate-100/80 text-slate-700 border-slate-200' },
              ].map((roleItem, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickLogin(roleItem.email)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${roleItem.color}`}
                >
                  {roleItem.label}
                </button>
              ))}
            </div>
          </div>
          )}

          <div className="text-center text-sm text-slate-500 pt-4 flex flex-col items-center gap-3 font-sans">
             <p>Need help accessing your account? <br/> <a href="#" className="font-medium text-nursing-600 hover:underline">Contact IT Support</a></p>
             
             <button
               type="button"
               onClick={() => setShowConfig(!showConfig)}
               className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
             >
               <Settings className="w-3.5 h-3.5" />
               {showConfig ? 'Hide Go Backend Settings' : 'Configure Go Lang Backend'}
             </button>
          </div>

          {showConfig && (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner space-y-4 text-left animate-fade-in-up font-sans">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-nursing-600" />
                  Go Backend Integrator
                </h4>
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${goEnabled ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                  {goEnabled ? 'Go Server Enabled' : 'Local State Engine'}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Reroute all requests from this React panel directly to your custom compiled <strong>Go Lang</strong> REST server!
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-nursing-300 transition">
                  <input
                    type="checkbox"
                    checked={goEnabled}
                    onChange={(e) => setGoEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-nursing-600 focus:ring-nursing-500 border-slate-300 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700">Route API Requests to Go</span>
                    <span className="text-[10px] text-slate-500 font-normal">Uncheck to run in sandbox simulation mode</span>
                  </div>
                </label>

                {goEnabled && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      Go REST Server Base URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={goUrl}
                        onChange={(e) => setGoUrl(e.target.value)}
                        placeholder="http://localhost:8080"
                        className="flex-1 block w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-nursing-500/20 focus:border-nursing-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={pingStatus === 'testing'}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white disabled:opacity-50 transition cursor-pointer"
                      >
                        {pingStatus === 'testing' ? 'Ping...' : 'Test'}
                      </button>
                    </div>

                    {pingStatus === 'success' && (
                      <p className="text-[11px] text-green-600 flex items-center gap-1 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Go API server connected successfully!
                      </p>
                    )}
                    {pingStatus === 'failed' && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" /> Connection refused. Please ensure Go backend runs and permits CORS.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="w-full py-1.5 rounded-lg text-xs font-bold bg-nursing-600 hover:bg-nursing-700 text-white transition text-center cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>

              <div className="p-3 bg-slate-100 rounded-lg space-y-1.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Go API Contracts
                </span>
                <code className="block text-[9px] text-slate-800 bg-white/80 p-2 rounded border border-slate-200 overflow-x-auto font-mono whitespace-pre leading-normal">
{`POST /api/auth/login     -> Session JSON
GET  /api/students       -> StudentProfile[]
GET  /api/courses        -> Course[]
GET  /api/results        -> Result[]
GET  /api/payments       -> Payment[]
PUT  /api/payments/:id/verify`}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};