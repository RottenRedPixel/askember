import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCallback() {
  const [status, setStatus] = useState('processing');
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          return;
        }

        if (data.session) {
          setStatus('success');
          // Redirect to dashboard after successful auth
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle>
            {status === 'processing' && '🔄 Signing you in...'}
            {status === 'success' && '✅ Welcome back!'}
            {status === 'error' && '❌ Authentication failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'processing' && (
            <div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Processing your magic link...</p>
            </div>
          )}
          {status === 'success' && (
            <div>
              <p className="text-green-600 mb-4">Successfully authenticated!</p>
              <p className="text-sm text-gray-600">Redirecting to dashboard...</p>
            </div>
          )}
          {status === 'error' && (
            <div>
              <p className="text-red-600 mb-4">Something went wrong.</p>
              <button 
                onClick={() => navigate('/')}
                className="text-blue-600 hover:underline"
              >
                Return to home
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 