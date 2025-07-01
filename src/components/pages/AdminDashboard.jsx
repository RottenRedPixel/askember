import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare } from 'lucide-react';
import PromptManagement from '@/components/admin/PromptManagement';

export default function AdminDashboard() {
  const { 
    allUsers, 
    adminLoading, 
    fetchAllUsers, 
    updateUserRole,
    userProfile 
  } = useStore();
  
  const [updatingUser, setUpdatingUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUser(userId);
    const success = await updateUserRole(userId, newRole);
    if (success) {
      // Role updated successfully
    }
    setUpdatingUser(null);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderator':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Manage users and system settings
          </p>
        </div>
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Super Admin
        </Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 mr-2 inline" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'prompts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4 mr-2 inline" />
            Prompt Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allUsers.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Admins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allUsers.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Regular Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {allUsers.filter(u => u.role === 'user').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getRoleBadgeColor(userProfile?.role)}>
                  {userProfile?.role?.replace('_', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage all registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Last Login</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user) => (
                      <tr key={user.user_id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">
                              {user.auth_users?.email || 'No email'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {user.user_id.slice(0, 8)}...
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {user.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(user.auth_users?.last_sign_in_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {user.role !== 'super_admin' && (
                              <>
                                {user.role !== 'admin' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRoleChange(user.user_id, 'admin')}
                                    disabled={updatingUser === user.user_id}
                                  >
                                    Make Admin
                                  </Button>
                                )}
                                {user.role !== 'user' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRoleChange(user.user_id, 'user')}
                                    disabled={updatingUser === user.user_id}
                                  >
                                    Make User
                                  </Button>
                                )}
                              </>
                            )}
                            {user.role === 'super_admin' && user.user_id !== userProfile?.user_id && (
                              <Badge variant="secondary">Protected</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {allUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Prompt Management Tab */}
      {activeTab === 'prompts' && (
        <PromptManagement />
      )}
    </motion.div>
  );
} 