import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Mail,
    Send,
    X,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useStore from '@/store';

export default function PasswordResetModal({
    user,
    onClose,
    isMobile = false
}) {
    const { sendPasswordReset } = useStore();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [emailSent, setEmailSent] = useState(false);

    const handleSendReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const result = await sendPasswordReset(user.email);

            if (!result.success) {
                setError(result.error);
                return;
            }

            setMessage('Password reset email sent successfully!');
            setEmailSent(true);
        } catch (error) {
            console.error('Error sending password reset:', error);
            setError(`Failed to send reset email: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("space-y-6", isMobile ? "p-4" : "p-0")}>
            {/* Header */}
            {isMobile ? (
                <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Reset Password</h2>
                        <p className="text-sm text-gray-600">
                            Send a password reset email to the user
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>
                        Send a password reset email to the user
                    </DialogDescription>
                </DialogHeader>
            )}

            {/* User Info */}
            <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">
                            {user.first_name || user.last_name
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                : 'User'
                            }
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            {message && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        {message}
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Information */}
            <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• A secure reset link will be sent to the user's email</li>
                    <li>• The user can click the link to set a new password</li>
                    <li>• The reset link will expire after 1 hour for security</li>
                    <li>• The user will be redirected to complete the reset process</li>
                </ul>
            </div>

            {/* Action Buttons */}
            <div className={cn(
                "flex gap-3 pt-4 border-t",
                isMobile ? "flex-col" : "flex-row justify-end"
            )}>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                    className={isMobile ? "w-full" : ""}
                >
                    {emailSent ? 'Close' : 'Cancel'}
                </Button>
                {!emailSent && (
                    <Button
                        onClick={handleSendReset}
                        disabled={loading}
                        className={isMobile ? "w-full" : ""}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Reset Email
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
