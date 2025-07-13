import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useStore from '@/store';

const roleOptions = [
  {
    value: 'user',
    label: 'User',
    description: 'Regular user with basic permissions',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'moderator',
    label: 'Moderator',
    description: 'Can moderate content and assist users',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage users and system settings',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full system access and control',
    color: 'bg-red-100 text-red-800'
  },
];

function getUserInitials(email, firstName, lastName) {
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (!email) return 'U';
  const parts = email.split('@')[0].split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export default function UserModal({
  user,
  onClose,
  isCreate = false,
  isMobile = false
}) {
  const { updateUserRole, updateUserProfile, createUser } = useStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'user'
  });

  // Initialize form data
  useEffect(() => {
    if (user && !isCreate) {
      console.log('UserModal: Initializing with user data:', {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        allFields: Object.keys(user)
      });

      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user'
      });
    }
  }, [user, isCreate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCreate) {
        console.log('Creating user:', formData);
        const result = await createUser(formData);

        if (!result.success) {
          console.error('User creation failed:', result.error);
          alert(`Failed to create user: ${result.error}`);
          return;
        }

        console.log('User created successfully:', result.data);
      } else {
        // Update existing user profile
        const updateData = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role
        };

        await updateUserProfile(user.user_id, updateData);
        console.log('Updated user profile:', user.user_id, updateData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(`Error saving user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roleOptions.find(r => r.value === formData.role);

  return (
    <div className={cn("space-y-6", isMobile ? "p-4" : "p-0")}>
      {/* Header */}
      {isMobile ? (
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              {isCreate ? 'Add New User' : 'Edit User'}
            </h2>
            <p className="text-sm text-gray-600">
              {isCreate
                ? 'Create a new user account with specific permissions'
                : 'Update user information and permissions'
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Add New User' : 'Edit User'}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Create a new user account with specific permissions'
              : 'Update user information and permissions'
            }
          </DialogDescription>
        </DialogHeader>
      )}

      {/* User Avatar Section */}
      {!isCreate && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={user?.avatar_url}
              alt={user?.email}
              onError={(e) => {
                console.log('Avatar failed to load for user:', user?.email, 'URL:', user?.avatar_url);
                e.target.style.display = 'none';
              }}
            />
            <AvatarFallback className="bg-blue-100 text-blue-800">
              {getUserInitials(user?.email, formData.first_name || user?.first_name, formData.last_name || user?.last_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">
              {(formData.first_name || formData.last_name)
                ? `${formData.first_name || ''} ${formData.last_name || ''}`.trim()
                : (user?.first_name || user?.last_name)
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                  : user?.email?.split('@')[0] || 'Unknown User'
              }
            </div>
            <div className="text-sm text-gray-600">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("text-xs", selectedRole?.color)}>
                {selectedRole?.label || 'User'}
              </Badge>
              {user?.created_at && (
                <span className="text-xs text-gray-500">
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="user@example.com"
            disabled={!isCreate} // Can't change email for existing users
            required
          />
          {!isCreate && (
            <p className="text-xs text-gray-500">
              Email cannot be changed for existing users
            </p>
          )}
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role & Permissions
          </Label>
          <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {roleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-gray-500">{role.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRole && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn("text-xs", selectedRole.color)}>
                  {selectedRole.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-700">{selectedRole.description}</p>
            </div>
          )}
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className={isMobile ? "w-full" : ""}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                {isCreate ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isCreate ? 'Create User' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 