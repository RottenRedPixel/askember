import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCallback() {
  const [status, setStatus] = useState('processing');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/embers';
  
  console.log('AuthCallback: redirectTo =', redirectTo);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback: Processing URL:', window.location.href);
        
        // Handle hash-based auth (email confirmations, magic links)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          return;
        }

        console.log('AuthCallback: Session data:', data);

        if (data.session) {
          console.log('AuthCallback: User authenticated:', data.session.user.email);
          setStatus('success');
          // Redirect to specified page or embers page after successful auth
          setTimeout(() => {
            navigate(redirectTo);
          }, 2000);
        } else {
          // Try to handle the hash fragment directly
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          
          if (accessToken) {
            console.log('AuthCallback: Found access token in hash, processing...');
            // Let Supabase handle the session automatically
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            console.log('AuthCallback: No session or token found');
            setStatus('error');
          }
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
              <p className="text-sm text-gray-600">Redirecting to your embers...</p>
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