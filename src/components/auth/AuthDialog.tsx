'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'login' | 'register';
  onSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, mode, onSuccess }: AuthDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const { toast } = useToast();

  const isRegister = mode === 'register';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isRegister) {
        // Register — credentials are owned by Supabase Auth (G7)
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }
        if (data.emailConfirmationRequired) {
          throw new Error(
            'Account created! Please check your email and confirm your address, then log in.',
          );
        }
        toast({ title: 'Account created!', description: 'Welcome to BharatSocial.' });
      }

      // Login (after register or directly)
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error('Invalid email or password');
      }

      toast({
        title: isRegister ? 'Welcome to BharatSocial!' : 'Welcome back!',
        description: 'You are now logged in.',
      });

      // Reset form
      setEmail('');
      setPassword('');
      setUsername('');
      setName('');

      onOpenChange(false);
      onSuccess?.();

      // Reload to get fresh server-side data
      window.location.reload();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoogle() {
    // Full-page redirect into the Supabase-mediated Google OAuth flow (G7).
    window.location.href = '/api/auth/supabase-oauth?provider=google';
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-card p-0 sm:rounded-2xl">
        <DialogTitle className="sr-only">
          {isRegister ? 'Create your account' : 'Log in to BharatSocial'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isRegister ? 'Sign up for a BharatSocial account' : 'Enter your credentials to log in'}
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-white">
            {isRegister ? 'Join BharatSocial' : 'Log In'}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pt-5">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z" />
            </svg>
            {isRegister ? 'Sign up with Google' : 'Continue with Google'}
          </button>
          <div className="flex items-center gap-3 py-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5 pt-0">
          {isRegister && (
            <>
              <div>
                <Label htmlFor="name" className="text-muted-foreground">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-background border-border text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username" className="text-muted-foreground">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  placeholder="username"
                  className="bg-background border-border text-white"
                  required
                  minLength={3}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email" className="text-muted-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-background border-border text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-muted-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background border-border text-white"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-saffron px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-saffron/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRegister ? 'Creating account…' : 'Logging in…'}
              </>
            ) : (
              isRegister ? 'Create Account' : 'Log In'
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
