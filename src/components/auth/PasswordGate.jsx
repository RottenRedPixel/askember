import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeSlash } from 'phosphor-react';

export default function PasswordGate({ onPasswordCorrect }) {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Check if password is already validated in localStorage
    useEffect(() => {
        const isAuthenticated = localStorage.getItem('askember_password_verified');
        if (isAuthenticated === 'true') {
            onPasswordCorrect();
        }

        // Add global function for console access
        window.clearAskemberPassword = () => {
            localStorage.removeItem('askember_password_verified');
            window.location.reload();
        };
    }, [onPasswordCorrect]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Simulate a brief loading state for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        if (password === 'hoboken') {
            localStorage.setItem('askember_password_verified', 'true');
            onPasswordCorrect();
        } else {
            setError('Incorrect password. Please try again.');
            setPassword('');
        }

        setIsLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Lock size={32} className="text-blue-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                            Access Required
                        </CardTitle>
                        <p className="text-gray-600 mt-2">
                            Please enter the password to access Ask Ember AI
                        </p>
                    </CardHeader>

                    <CardContent className="pt-2">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter password..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className="pr-12 h-12 text-center text-lg font-mono tracking-wider"
                                    disabled={isLoading}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                    <p className="text-red-700 text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={isLoading || !password.trim()}
                                className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Verifying...
                                    </div>
                                ) : (
                                    'Submit'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                This is a private preview of Askember
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 