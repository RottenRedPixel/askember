import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToBlob, validateFile, getFileCategory } from '@/lib/storage';
import { createEmber } from '@/lib/database';
import useStore from '@/store';
import { Upload, Image, X } from 'lucide-react';

export default function Create() {
  const { user, isLoading } = useStore();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleFiles = (file) => {
    if (!file) return;

    try {
      validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/*']
      });

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
      };
      reader.readAsDataURL(file);
      
      setMessage({ type: '', text: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    handleFiles(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setMessage({ type: '', text: '' });
  };

  const createEmberHandler = async (e) => {
    e.preventDefault();
    
    if (!selectedImage) {
      setMessage({ type: 'error', text: 'Please select an image for your ember' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      // Upload image to Vercel Blob
      const imageResult = await uploadToBlob(selectedImage, 'images', user.id);
      
      // Save ember to database
      const emberData = {
        user_id: user.id,
        image_url: imageResult.url
      };

      const newEmber = await createEmber(emberData);
      console.log('Ember created:', newEmber);
      
      setMessage({ 
        type: 'success', 
        text: 'Ember created successfully! Redirecting to your ember...' 
      });

      // Reset form
      setSelectedImage(null);
      setImagePreview(null);

      // Redirect to the newly created ember detail page after a short delay
      setTimeout(() => {
        navigate(`/ember/${newEmber.id}`);
      }, 2000);

    } catch (error) {
      console.error('Error creating ember:', error);
      setMessage({ type: 'error', text: `Failed to create ember: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ x: -100 }} animate={{ x: 0 }} className="max-w-2xl mx-auto space-y-0">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">create an ember</h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">
          Share a moment that sparked something within you. Upload an image to create your first ember.
        </p>
      </div>

      {/* Create Ember Form - Only show if user is logged in */}
      {!isLoading && user && (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <form onSubmit={createEmberHandler} className="space-y-8">
              {/* File Upload Area */}
              <div className="space-y-4">
                {!imagePreview ? (
                  <div
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required
                    />
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-gray-900">
                          Drop your image here, or <span className="text-blue-600">browse</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports JPG, PNG, GIF, WebP up to 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative rounded-xl overflow-hidden bg-gray-100">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-auto object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Message */}
              {message.text && (
                <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                  <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={uploading || !selectedImage} 
                className="w-full h-10 text-base font-semibold"
                variant="blue"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating your ember...
                  </>
                ) : (
                  'Create Ember'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Message for non-logged-in users */}
      {!isLoading && !user && (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-8 text-center space-y-6">
            <Link to="/login?redirect=/create">
              <Button variant="blue" className="px-8 h-10 text-base font-semibold">
                Sign In to Continue
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
} 