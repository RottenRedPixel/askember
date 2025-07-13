import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Copy, QrCode, ShareNetwork } from 'phosphor-react';
import QRCodeGenerator from '@/components/QRCodeGenerator';

/**
 * Share slide out content component for ember sharing
 * Extracted from EmberDetail.jsx to improve maintainability
 */
const ShareSlideOutContent = ({ ember }) => {
    const [message, setMessage] = useState(null);
    const [showQRCode, setShowQRCode] = useState(false);

    const copyShareLink = async () => {
        try {
            const link = `${window.location.origin}/share/${ember.id}`;
            await navigator.clipboard.writeText(link);
            setMessage({ type: 'success', text: 'Link copied to clipboard' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to copy link' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleNativeShare = async () => {
        try {
            const link = `${window.location.origin}/share/${ember.id}`;
            const title = ember.title || 'Check out this ember';
            const description = ember.message || 'Shared from ember.ai';

            if (navigator.share) {
                await navigator.share({
                    title: title,
                    text: description,
                    url: link,
                });
            }
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl ${message.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}>
                    <p className="text-sm">{message.text}</p>
                </div>
            )}

            {/* View-Only Notice */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-medium text-green-900 mb-2">View-Only Sharing</h4>
                <p className="text-sm text-green-800">
                    Anyone with this link can view the ember but cannot edit or contribute to it.
                    To invite collaborators with edit access, use the "Invite Contributors" feature.
                </p>
            </div>

            {/* Share Link */}
            <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    Share Link (View-Only)
                </h4>
                <div className="flex gap-2">
                    <Input
                        value={`${window.location.origin}/share/${ember.id}`}
                        readOnly
                        className="text-xs min-w-0 flex-1 h-10"
                    />
                    <Button size="lg" onClick={copyShareLink} variant="blue" className="flex-shrink-0">
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* QR Code Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        QR Code (View-Only)
                    </h4>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="flex items-center gap-2"
                    >
                        {showQRCode ? 'Hide' : 'Generate'}
                    </Button>
                </div>

                {/* Fixed height container to prevent jumping */}
                <div className={`transition-all duration-200 overflow-hidden ${showQRCode ? 'h-[240px]' : 'h-0'}`}>
                    {showQRCode && (
                        <div className="mt-4">
                            <QRCodeGenerator
                                url={`${window.location.origin}/share/${ember.id}`}
                                title="Ember QR Code"
                                size={180}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Native Share Button - Bottom */}
            {typeof navigator !== 'undefined' && navigator.share && (
                <div className="mt-6 pt-4 border-t">
                    <Button
                        onClick={handleNativeShare}
                        variant="blue"
                        size="lg"
                        className="w-full flex items-center gap-2"
                    >
                        <ShareNetwork className="w-4 h-4" />
                        Share Ember
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ShareSlideOutContent; 