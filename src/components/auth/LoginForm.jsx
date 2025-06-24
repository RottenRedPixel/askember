import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

export default function LoginForm({ onSwitchToSignup, onSwitchToMagicLink }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Login error details:', {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error
        });
        throw error;
      }

      console.log('Login successful:', data);
      // Success - user will be redirected by AuthGuard
    } catch (error) {
      console.error('Login failed:', error);
      
      // Provide more helpful error messages
      let userMessage = error.message;
      if (error.message === 'Invalid login credentials') {
        userMessage = 'Invalid email or password. If you just signed up, please check your email and confirm your account first.';
      }
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

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
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:underline"
            >
              Sign up
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 