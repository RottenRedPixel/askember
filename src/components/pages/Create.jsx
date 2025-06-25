import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToBlob, validateFile, getFileCategory } from '@/lib/storage';
import { createEmber } from '@/lib/database';
import useStore from '@/store';

export default function Create() {
  const { user, isLoading } = useStore();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
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
        text: 'Ember created successfully! Redirecting to your embers...' 
      });

      // Reset form
      setSelectedImage(null);
      setImagePreview(null);
      e.target.reset();

      // Redirect to embers page after a short delay
      setTimeout(() => {
        navigate('/embers');
      }, 2000);

    } catch (error) {
      console.error('Error creating ember:', error);
      setMessage({ type: 'error', text: `Failed to create ember: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div initial={{ x: -100 }} animate={{ x: 0 }} className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-6 mt-2 pt-2">create an ember</h1>
        <div className="prose prose-lg">
          <p className="text-gray-600 leading-relaxed">
            Create your first ember by adding an image. More features like titles, audio and AI analysis coming soon.
          </p>
        </div>
      </div>

      {/* Create Ember Form - Only show if user is logged in */}
      {!isLoading && user && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Ember</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createEmberHandler} className="space-y-6">

              {/* Image Upload */}
              <div>
                <Label htmlFor="image">Image</Label>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF or WebP (max 10MB)
                </p>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div>
                  <Label>Preview</Label>
                  <div className="mt-1">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-full h-48 object-cover rounded-md border"
                    />
                  </div>
                </div>
              )}

              {/* Message */}
              {message.text && (
                <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                  <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? 'Creating Ember...' : 'Create Ember'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Message for non-logged-in users */}
      {!isLoading && !user && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to start creating</h3>
          <p className="text-gray-600 mb-4">
            Log in to create your first ember with an image.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}
    </motion.div>
  );
} 