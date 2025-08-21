import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Key,
    ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function PasswordResetPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [validToken, setValidToken] = useState(null);

    useEffect(() => {
        // Check if we have a valid session from the reset link
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Session error:', error);
                    setError('Invalid or expired reset link. Please request a new password reset.');
                    setValidToken(false);
                    return;
                }

                if (session) {
                    console.log('Valid reset session found');
                    setValidToken(true);
                } else {
                    setError('No valid reset session found. Please request a new password reset.');
                    setValidToken(false);
                }
            } catch (err) {
                console.error('Error checking session:', err);
                setError('Unable to verify reset link. Please try again.');
                setValidToken(false);
            }
        };

        checkSession();
    }, []);

    const validatePassword = () => {
        if (password.length < 6) {
            return 'Password must be at least 6 characters long';
        }
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const passwordError = validatePassword();
        if (passwordError) {
            setError(passwordError);
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                throw error;
            }

            setSuccess(true);

            // Redirect to admin login after 3 seconds
            setTimeout(() => {
                navigate('/admin', { replace: true });
            }, 3000);

        } catch (error) {
            console.error('Password update error:', error);
            setError(error.message || 'Failed to update password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToAdmin = () => {
        navigate('/admin', { replace: true });
    };

    if (validToken === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Verifying reset link...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (validToken === false) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="border-red-200 bg-red-50">
                            <AlertDescription className="text-red-800">
                                {error}
                            </AlertDescription>
                        </Alert>
                        <Button
                            onClick={handleBackToAdmin}
                            className="w-full"
                            variant="outline"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Admin
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-xl">Password Updated Successfully</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Your password has been updated successfully. You will be redirected to the admin area shortly.
                            </AlertDescription>
                        </Alert>
                        <Button
                            onClick={handleBackToAdmin}
                            className="w-full"
                        >
                            Continue to Admin
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Key className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">Set New Password</CardTitle>
                    <p className="text-gray-600">Choose a strong password for your account</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    required
                                    disabled={isLoading}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-400" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Password Requirements */}
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            <p className="font-medium mb-2">Password requirements:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>At least 6 characters long</li>
                                <li>Use a mix of letters, numbers, and symbols</li>
                                <li>Both passwords must match</li>
                            </ul>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <Alert className="border-red-200 bg-red-50">
                                <AlertCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading || !password || !confirmPassword}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Updating Password...
                                </>
                            ) : (
                                <>
                                    <Key className="h-4 w-4 mr-2" />
                                    Update Password
                                </>
                            )}
                        </Button>

                        {/* Back Link */}
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={handleBackToAdmin}
                            disabled={isLoading}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Admin
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
