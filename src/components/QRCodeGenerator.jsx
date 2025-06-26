import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';

export default function QRCodeGenerator({ url, title = "QR Code", size = 200 }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    generateQRCode();
  }, [url, size]);

  const generateQRCode = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const qrOptions = {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };

      // Generate QR code as data URL
      const dataUrl = await QRCode.toDataURL(url, qrOptions);
      setQrCodeDataUrl(dataUrl);
      
      // Also generate on canvas for potential download
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, qrOptions);
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `ember-qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
        }
      });
    } catch (err) {
      console.error('Failed to copy QR code:', err);
      // Fallback: try to copy the URL instead
      try {
        await navigator.clipboard.writeText(url);
      } catch (fallbackErr) {
        console.error('Failed to copy URL as fallback:', fallbackErr);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-gray-500">Generating QR code...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          {qrCodeDataUrl && (
            <img 
              src={qrCodeDataUrl} 
              alt={title}
              className="block"
              style={{ width: size, height: size }}
            />
          )}
          {/* Hidden canvas for download functionality */}
          <canvas 
            ref={canvasRef} 
            style={{ display: 'none' }} 
          />
        </div>
      </div>
      
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
        
        {navigator.clipboard && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyImage}
            className="flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy
          </Button>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Scan with your phone to open the ember
        </p>
      </div>
    </div>
  );
} 