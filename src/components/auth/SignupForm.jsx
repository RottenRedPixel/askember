import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

export default function SignupForm({ onSwitchToLogin, onSwitchToMagicLink }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const validatePassword = () => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const passwordError = validatePassword();
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: 'https://askember.ai/auth/callback'
        }
      });

      if (error) throw error;

      setMessage('Account created! Check your email and click the confirmation link before signing in.');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">create account</h1>
        <p className="text-gray-600">
          Get started with your new account
        </p>
      </div>
      <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-10"
            />
          </div>

                      <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email || !password || !confirmPassword}
              size="lg"
              variant="blue"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        {message && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {message}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

      <div className="mt-6 text-center space-y-2">
        <button
          onClick={onSwitchToMagicLink}
          className="text-sm text-blue-600 hover:underline"
        >
          Prefer magic link instead?
        </button>
        <div className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
} 