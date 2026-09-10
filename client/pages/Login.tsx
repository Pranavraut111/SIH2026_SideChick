/**
 * Login page for ShikshaSetu.
 * Supports Email/Password and Google sign-in.
 */
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

function Mark() {
  return (
    <div className="brand-mark" aria-label="ShikshaSetu logo">
      <span />
      <span />
      <span />
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Sign in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        // New Google user → needs role selection
        navigate('/signup?google=true', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070708] px-4">
      <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[#7158a6]/10 blur-[130px]" />
      <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-[#6b519f]/10 blur-[100px]" />

      <div className="relative z-10 w-full max-w-[420px]">
        <Link to="/" className="mb-10 flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-extrabold tracking-[-.04em] text-white">ShikshaSetu</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-[-.06em] text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-white/40">Sign in to continue to your workspace.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-[#b46e6e]/30 bg-[#b46e6e]/10 px-4 py-3 text-xs text-[#dc9b9b]">
            {error}
          </div>
        )}

        {/* Google sign-in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mb-5 flex w-full items-center justify-center gap-3 rounded-lg border border-white/12 bg-white/[.04] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-white/[.08] active:scale-[.98] disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.2-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.5 18.8 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.4 0-9.9-3.6-11.3-8.5l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.7 39.5 44 34 44 24c0-1.3-.2-2.7-.4-3.9z"/></svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/25">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-[.18em] text-white/35">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full rounded-lg border border-white/12 bg-white/[.035] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#b69ce7]/50 focus:ring-1 focus:ring-[#b69ce7]/25"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-[.18em] text-white/35">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full rounded-lg border border-white/12 bg-white/[.035] px-4 py-3 pr-10 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#b69ce7]/50 focus:ring-1 focus:ring-[#b69ce7]/25"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#efede8] px-4 py-3 text-[12px] font-bold text-[#0a0a0b] transition-all hover:bg-white active:scale-[.98] disabled:opacity-50">
            {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0a0a0b]/20 border-t-[#0a0a0b]" /> : <>Sign in <ArrowRight size={14} /></>}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-white/35">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#b69ce7] hover:text-[#c8b3f5] transition">Create one</Link>
        </p>
      </div>
    </div>
  );
}
