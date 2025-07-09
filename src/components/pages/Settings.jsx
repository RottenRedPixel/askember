import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import useStore from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { updateUserVoiceModel, getUserVoiceModel } from '@/lib/database';

export default function Settings() {
  const { user, userProfile, fetchUserProfile } = useStore();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: ''
  });
  
  // Voice model form state
  const [voiceData, setVoiceData] = useState({
    elevenlabsVoiceId: '',
    elevenlabsVoiceName: ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load existing profile data
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        firstName: userProfile.first_name || '',
        lastName: userProfile.last_name || '',
        avatarUrl: userProfile.avatar_url || ''
      });
      
      // Load voice model data
      setVoiceData({
        elevenlabsVoiceId: userProfile.elevenlabs_voice_id || '',
        elevenlabsVoiceName: userProfile.elevenlabs_voice_name || ''
      });
    }
  }, [userProfile]);

  // Helper function to get user initials
  const getUserInitials = (email, firstName = '', lastName = '') => {
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Update profile information
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          avatar_url: profileData.avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh the user profile in the store
      await fetchUserProfile(user.id);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Update voice model
  const handleVoiceModelUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate voice ID format (ElevenLabs voice IDs are typically alphanumeric)
    if (voiceData.elevenlabsVoiceId && !/^[a-zA-Z0-9_-]+$/.test(voiceData.elevenlabsVoiceId)) {
      setMessage({ type: 'error', text: 'Voice ID contains invalid characters' });
      setLoading(false);
      return;
    }

    try {
      await updateUserVoiceModel(
        user.id, 
        voiceData.elevenlabsVoiceId || null, 
        voiceData.elevenlabsVoiceName || null
      );

      // Refresh the user profile in the store
      await fetchUserProfile(user.id);
      
      setMessage({ type: 'success', text: 'Voice model updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Update password
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    // Validate password length
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar file upload (using base64 encoding instead of storage)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 1MB for base64 storage)
    if (file.size > 1 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 1MB' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert image to base64 data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;
        
        // Update profile with base64 data URL
        setProfileData(prev => ({ ...prev, avatarUrl: base64Url }));
        setMessage({ type: 'success', text: 'Avatar uploaded successfully! Click "Update Profile" to save.' });
        setLoading(false);
      };
      
      reader.onerror = () => {
        setMessage({ type: 'error', text: 'Failed to read image file' });
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <p className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </p>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.avatarUrl} alt="Profile" />
                  <AvatarFallback className="bg-blue-100 text-blue-800 text-lg">
                    {getUserInitials(user?.email, profileData.firstName, profileData.lastName)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>Change Avatar</span>
                    </Button>
                  </Label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG or GIF (max 1MB)
                  </p>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="space-y-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Update */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="text-sm text-gray-600">
                <ul className="list-disc list-inside space-y-1">
                  <li>Password must be at least 6 characters long</li>
                  <li>Use a mix of letters, numbers, and symbols</li>
                </ul>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Voice Model */}
        <Card>
          <CardHeader>
            <CardTitle>Voice Model</CardTitle>
            <CardDescription>
              Associate your account with an ElevenLabs voice model for personalized story narration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVoiceModelUpdate} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="elevenlabsVoiceId">ElevenLabs Voice ID</Label>
                <Input
                  id="elevenlabsVoiceId"
                  value={voiceData.elevenlabsVoiceId}
                  onChange={(e) => setVoiceData(prev => ({ ...prev, elevenlabsVoiceId: e.target.value }))}
                  placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
                />
                <p className="text-xs text-gray-500">
                  Your ElevenLabs voice ID from your voice library
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="elevenlabsVoiceName">Voice Name (Display)</Label>
                <Input
                  id="elevenlabsVoiceName"
                  value={voiceData.elevenlabsVoiceName}
                  onChange={(e) => setVoiceData(prev => ({ ...prev, elevenlabsVoiceName: e.target.value }))}
                  placeholder="e.g., My Personal Voice"
                />
                <p className="text-xs text-gray-500">
                  A friendly name for your voice model
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">How to find your Voice ID:</h4>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Go to ElevenLabs Voice Library</li>
                  <li>Click on your voice model</li>
                  <li>Copy the Voice ID from the URL or settings</li>
                  <li>Paste it in the field above</li>
                </ol>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Voice Model'}
                </Button>
                
                {(voiceData.elevenlabsVoiceId || voiceData.elevenlabsVoiceName) && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setVoiceData({ elevenlabsVoiceId: '', elevenlabsVoiceName: '' });
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {voiceData.elevenlabsVoiceId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Voice model configured: <strong>{voiceData.elevenlabsVoiceName || 'Unnamed Voice'}</strong>
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Your voice will be used when you're selected as a contributor in story cuts
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            View your account details and role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">User ID</Label>
              <p className="text-sm text-gray-900 font-mono">{user?.id?.slice(0, 8)}...</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Role</Label>
              <p className="text-sm text-gray-900 capitalize">{userProfile?.role?.replace('_', ' ') || 'User'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Member Since</Label>
              <p className="text-sm text-gray-900">
                {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 