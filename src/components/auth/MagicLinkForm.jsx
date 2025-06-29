import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

export default function MagicLinkForm({ onSwitchToLogin, onSwitchToSignup }) {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/embers';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // Redirect to production domain after clicking the magic link, with redirect parameter
          emailRedirectTo: `https://askember.ai/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
        }
      });

      if (error) throw error;

      setMessage('Check your email for the magic link!');
      setEmail('');
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">magic link</h1>
        <p className="text-gray-600">
          Enter your email to get a magic link for instant access
        </p>
      </div>
      <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

                      <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email}
              size="lg"
              variant="blue"
          >
            {isLoading ? 'Sending...' : 'Send Magic Link'}
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
        <div className="text-sm text-gray-600">
          Prefer password login?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:underline"
          >
            Sign in
          </button>
        </div>
        <div className="text-sm text-gray-600">
          Don't have an account?{' '}
          <button
            onClick={onSwitchToSignup}
            className="text-blue-600 hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
} 