import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Auth modal on the Scoreboard system.
 *
 * Beyond radius and shadow, the substantive fix is colour: the old error and
 * success blocks were `bg-red-50 dark:bg-red-900/20`, and the Google button was
 * `bg-white ... text-gray-700`. Tailwind's darkMode here is class-based and
 * nothing ever sets a `dark` class — themes switch on `data-theme` — so those
 * `dark:` variants never applied and the panel stayed light in all six themes.
 * Everything now runs off tokens. The only literal colours left are inside
 * Google's own mark, which has to keep its brand palette.
 */

const inputClass =
  'min-h-[44px] w-full border border-border bg-background px-3 text-[12px] text-foreground ' +
  'placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-50';

const labelClass =
  'mb-1.5 block text-[8.5px] font-medium uppercase tracking-[0.13em] text-muted-foreground';

const LoginModal = ({ isOpen, onClose }) => {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Error signing in with Google:', error.message);
      setError('Failed to sign in with Google. Please try again.');
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to sign in. Please check your credentials.');
    } else {
      setMessage('Successfully signed in!');
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signUpWithEmail(email, password);
    setLoading(false);

    if (error) {
      setError(error.message || 'Failed to sign up. Please try again.');
    } else {
      setMessage('Check your email for the confirmation link!');
      setEmail('');
      setPassword('');
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 font-mono backdrop-blur-sm">
      <div className="relative max-h-[95vh] w-full max-w-sm overflow-y-auto border border-border bg-panel">
        <div className="flex items-start justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
              FPL League Hub
            </h2>
            <p className="mt-1 text-[7.5px] uppercase tracking-[0.12em] text-muted-foreground">
              Sign in to save your team
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Same tab bar as the player page: hairline rule, 2px underline. */}
        <div className="flex border-b border-border">
          {[
            { id: 'signin', label: 'SIGN IN' },
            { id: 'signup', label: 'SIGN UP' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`-mb-px flex-1 border-b-2 py-[11px] text-[9.5px] font-medium leading-none tracking-[0.14em] transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="px-4 pb-5 pt-4">
          {error && (
            <div className="mb-3 border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
              <p className="text-[10px] leading-[1.5] text-destructive">{error}</p>
            </div>
          )}
          {message && (
            <div className="mb-3 border-l-2 border-live bg-muted px-3 py-2.5">
              <p className="text-[10px] leading-[1.5] text-foreground">{message}</p>
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex min-h-[44px] w-full items-center justify-center gap-2.5 border border-border bg-background px-3 text-[9.5px] font-medium tracking-[0.14em] text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            CONTINUE WITH GOOGLE
          </button>

          <div className="flex items-center gap-2 pt-[22px] pb-2.5">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={activeTab === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
            <div>
              <label htmlFor="login-email" className={labelClass}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="login-password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={`${inputClass} pr-[62px]`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 text-[8px] font-medium tracking-[0.13em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full bg-primary text-[9.5px] font-medium tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'WORKING…' : activeTab === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>

            <p className="text-center text-[9px] tracking-[0.1em] text-muted-foreground">
              {activeTab === 'signin' ? "No account yet? " : 'Already registered? '}
              <button
                type="button"
                onClick={() => switchTab(activeTab === 'signin' ? 'signup' : 'signin')}
                className="text-primary-lighter hover:underline"
              >
                {activeTab === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
