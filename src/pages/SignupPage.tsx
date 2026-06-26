import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/http';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Eyebrow from '../components/ui/Eyebrow';
import { Field, Input } from '../components/ui/Input';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({ name, email, password });
      // Signup does NOT log you in (no token returned) — send to login.
      navigate('/login', {
        replace: true,
        state: { justSignedUp: true },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.body?.message ?? 'Please check your details.');
      } else if (err instanceof ApiError && err.status === 409) {
        setError('An account with that email already exists.');
      } else {
        setError(err instanceof Error ? err.message : 'Signup failed.');
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
          <h1 className="mt-2 font-display text-2xl font-semibold text-paper">Sign up</h1>
        </div>
        <div className="px-6 py-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Name" htmlFor="name">
              <Input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
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
                autoComplete="new-password"
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
              {submitting ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-paper-dim">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brass hover:text-brass-bright">
              Log in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
