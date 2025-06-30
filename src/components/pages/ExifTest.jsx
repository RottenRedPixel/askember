import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Camera, MapPin, Clock, Upload, CheckCircle, XCircle, Info } from 'phosphor-react';
import { uploadImageWithExif } from '@/lib/photos';
import { extractExifData, hasGPSData, hasTimestampData, formatCoordinates } from '@/lib/exif';
import useStore from '@/store';

export default function ExifTest() {
  const { user } = useStore();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [exifData, setExifData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setError(null);
    setUploadResult(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Extract EXIF data
    try {
      console.log('Extracting EXIF data from file...');
      const extractedData = await extractExifData(file);
      setExifData(extractedData);
      console.log('EXIF data extracted:', extractedData);
    } catch (error) {
      console.error('EXIF extraction error:', error);
      setError('Failed to extract EXIF data from image');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user?.id) return;

    setUploading(true);
    setError(null);

    try {
      console.log('Starting upload with EXIF processing...');
      const result = await uploadImageWithExif(selectedFile, user.id);
      console.log('Upload completed:', result);
      setUploadResult(result);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date available';
    return new Date(timestamp).toLocaleString();
  };

  const ExifDataDisplay = ({ data, title, icon: Icon }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon size={16} className="text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          value !== null && value !== undefined && (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-gray-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
              </span>
              <span className="font-medium text-gray-900 text-right ml-2">
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value.toString()}
              </span>
            </div>
          )
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">EXIF Data Extraction Test</h1>
          <p className="text-gray-600">
            Upload an image to test automatic EXIF metadata extraction and storage
          </p>
        </div>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload size={20} />
              Upload Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="image-upload">Select Image File</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>

            {selectedFile && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Preview</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>

                {/* File Info */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">File Information</Label>
                  <div className="space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedFile.name}</div>
                    <div><strong>Size:</strong> {formatFileSize(selectedFile.size)}</div>
                    <div><strong>Type:</strong> {selectedFile.type}</div>
                    <div><strong>Last Modified:</strong> {formatDate(selectedFile.lastModified)}</div>
                  </div>
                  
                  {exifData && (
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={hasGPSData(exifData) ? 'default' : 'secondary'}>
                          {hasGPSData(exifData) ? 'GPS Data Found' : 'No GPS Data'}
                        </Badge>
                        <Badge variant={hasTimestampData(exifData) ? 'default' : 'secondary'}>
                          {hasTimestampData(exifData) ? 'Timestamp Found' : 'No Timestamp'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedFile && (
              <Button 
                onClick={handleUpload}
                disabled={uploading || !user}
                className="w-full"
              >
                {uploading ? 'Uploading...' : 'Upload & Process EXIF Data'}
              </Button>
            )}

            {!user && (
              <Alert>
                <Info size={16} />
                <div>Please log in to upload and test EXIF processing</div>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <XCircle size={16} />
                <div>{error}</div>
              </Alert>
            )}

            {uploadResult && (
              <Alert>
                <CheckCircle size={16} />
                <div>
                  Upload successful! {uploadResult.enhanced && `Enhanced processing completed with ${uploadResult.enhancedFields} fields.`}
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* EXIF Data Display */}
        {exifData && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Extracted EXIF Data</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Location Data */}
              <ExifDataDisplay
                title="Location Data"
                icon={MapPin}
                data={{
                  coordinates: hasGPSData(exifData) 
                    ? formatCoordinates(exifData.latitude, exifData.longitude)
                    : 'No GPS data',
                  latitude: exifData.latitude,
                  longitude: exifData.longitude,
                  altitude: exifData.altitude ? `${exifData.altitude}m` : null
                }}
              />

              {/* Camera Data */}
              <ExifDataDisplay
                title="Camera Information"
                icon={Camera}
                data={{
                  make: exifData.cameraMake,
                  model: exifData.cameraModel,
                  lens: exifData.lensModel,
                  iso: exifData.isoSpeed,
                  aperture: exifData.apertureValue ? `f/${exifData.apertureValue}` : null,
                  shutter: exifData.shutterSpeed,
                  focalLength: exifData.focalLength ? `${exifData.focalLength}mm` : null,
                  flash: exifData.flashUsed
                }}
              />

              {/* Technical Data */}
              <ExifDataDisplay
                title="Technical Information"
                icon={Clock}
                data={{
                  timestamp: formatDate(exifData.timestamp),
                  dimensions: exifData.imageWidth && exifData.imageHeight 
                    ? `${exifData.imageWidth} × ${exifData.imageHeight}` 
                    : null,
                  orientation: exifData.orientation,
                  colorSpace: exifData.colorSpace,
                  fileSize: formatFileSize(exifData.fileSize)
                }}
              />
            </div>
          </div>
        )}

        {/* Upload Result Details */}
        {uploadResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Photo ID:</strong> {uploadResult.photo.id}
                </div>
                <div>
                  <strong>Storage URL:</strong> 
                  <a 
                    href={uploadResult.storageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    View Image
                  </a>
                </div>
                <div>
                  <strong>GPS Data:</strong> {uploadResult.hasGPS ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Timestamp:</strong> {uploadResult.hasTimestamp ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Enhanced Processing:</strong> {uploadResult.enhanced ? 'Yes' : 'No'}
                </div>
                {uploadResult.enhanced && (
                  <div>
                    <strong>Enhanced Fields:</strong> {uploadResult.enhancedFields}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 