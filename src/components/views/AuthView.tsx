import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { IsometricHeroArt } from '../common/IsometricHeroArt';
import {
  Sparkles, Shield, ArrowRight, Mail, Key, UserCheck, AlertCircle
} from 'lucide-react';
import type { UserRole } from '../../types';

interface AuthViewProps {
  mode?: 'login' | 'register';
}

export const AuthView: React.FC<AuthViewProps> = ({ mode = 'login' }) => {
  const { signIn, signUp } = useAuth();
  const { addToast, loginAs, setCurrentView } = useApp();
  const navigate = useNavigate();

  const isRegister = mode === 'register';
  const [email, setEmail] = useState('admin@skillsprint.local');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedDemoRole, setSelectedDemoRole] = useState<UserRole>('admin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const goAfterAuth = (role: UserRole) => {
    loginAs(role);
    setCurrentView(role === 'admin' ? 'dashboard' : 'learnerDashboard');
    navigate(role === 'admin' ? '/dashboard' : '/learner', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) {
        const res = await signUp(email, password, fullName || email.split('@')[0], selectedDemoRole);
        if (res.needsConfirmation) {
          setNeedsConfirmation(true);
          addToast('Check your email to confirm your account', 'info');
        } else {
          addToast('Account created successfully', 'success');
          goAfterAuth(selectedDemoRole);
        }
      } else {
        await signIn(email, password);
        addToast('Logged in successfully', 'success');
        // role resolved async; navigate by demo selection then corrected by profile
        goAfterAuth(selectedDemoRole);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0914] text-slate-100 flex items-center justify-center p-4 sm:p-6 selection:bg-purple-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl overflow-hidden border border-purple-800/40 shadow-2xl bg-slate-900/90 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-6 p-8 sm:p-12 bg-white text-slate-900 flex flex-col justify-between">
          <div>
            <Link to="/" className="flex items-center gap-2 cursor-pointer mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Skillsprint <span className="text-purple-600">AI</span>
              </span>
            </Link>

            <div className="space-y-2 mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isRegister ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-slate-500 text-sm">
                {isRegister
                  ? 'Register to access the onboarding intelligence platform.'
                  : 'Enter your enterprise credentials to access your onboarding dashboard.'}
              </p>
            </div>

            <div className="mb-6 p-1 bg-slate-100 rounded-xl flex items-center">
              <button
                type="button"
                onClick={() => {
                  setSelectedDemoRole('admin');
                  if (!isRegister) setEmail('admin@skillsprint.local');
                }}
                className={
                  'flex-1 py-2 text-xs font-bold rounded-lg transition ' +
                  (selectedDemoRole === 'admin'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900')
                }
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDemoRole('learner');
                  if (!isRegister) setEmail('learner@skillsprint.local');
                }}
                className={
                  'flex-1 py-2 text-xs font-bold rounded-lg transition ' +
                  (selectedDemoRole === 'learner'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900')
                }
              >
                Learner
              </button>
            </div>

            {needsConfirmation && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex gap-2">
                <UserCheck className="w-4 h-4 shrink-0" />
                Confirmation email sent. Verify your inbox, then sign in.
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Alice Johnson"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  {!isRegister && (
                    <span className="text-xs text-slate-400">Demo: admin123</span>
                  )}
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder={isRegister ? 'Create password (min 6)' : 'Your password'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              >
                <span>{busy ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In to Platform'}</span>
                {!busy && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            <p className="text-xs text-slate-500 mt-4 text-center">
              {isRegister ? (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="text-purple-600 font-semibold hover:underline">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New here?{' '}
                  <Link to="/register" className="text-purple-600 font-semibold hover:underline">
                    Create an account
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 mt-6">
            <span>Enterprise SSO Enabled</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <Shield className="w-3.5 h-3.5" /> SOC-2 Compliant
            </span>
          </div>
        </div>

        <div className="hidden lg:flex lg:col-span-6 bg-gradient-to-br from-[#120a2a] via-[#1b113a] to-[#0d0722] p-12 flex-col justify-between relative overflow-hidden border-l border-purple-900/40">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Automated Knowledge Pipeline</span>
            </div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              Deterministic Training Curriculum with Zero Hallucinations
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Every onboarding plan is cross-referenced with exact source documentation IDs and verified against deterministic rule matrices.
            </p>
          </div>

          <div className="relative z-10 my-4 flex items-center justify-center transform scale-90">
            <IsometricHeroArt />
          </div>

          <div className="relative z-10 pt-4 border-t border-purple-900/30 flex items-center justify-between text-xs text-purple-300">
            <span>© 2026 Skillsprint AI Inc.</span>
            <Link to="/" className="hover:underline text-purple-200">
              Return to Landing Page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
