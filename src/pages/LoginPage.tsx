import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/http';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Eyebrow from '../components/ui/Eyebrow';
import { Field, Input } from '../components/ui/Input';

interface LocationState {
  from?: { pathname: string };
  justSignedUp?: boolean;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const from = state?.from?.pathname ?? '/';
  const justSignedUp = state?.justSignedUp ?? false;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Incorrect email or password.');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-ink-line px-6 py-5">
          <Eyebrow>The Orpheum</Eyebrow>
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper">Log in</h1>
        </div>
        <div className="px-6 py-6">
          {justSignedUp && (
            <p className="mb-4 rounded-md border border-status-confirmed/40 bg-status-confirmed/10 px-3 py-2 text-sm text-status-confirmed">
              Account created — log in to continue.
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            {error && (
              <p className="rounded-md border border-status-expired/40 bg-status-expired/10 px-3 py-2 text-sm text-status-expired">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-paper-dim">
            No account?{' '}
            <Link to="/signup" className="font-medium text-brass hover:text-brass-bright">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
