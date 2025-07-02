import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '@/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, BarChart3, Activity, DollarSign, Database, Clock, TrendingUp } from 'lucide-react';
import PromptManagement from '@/components/admin/PromptManagement';
import { getEmberAnalytics, getAdminEmberList } from '@/lib/database';

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
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [emberList, setEmberList] = useState([]);
  const [emberListLoading, setEmberListLoading] = useState(false);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Fetch analytics data when analytics tab is selected
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
      fetchEmberList();
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await getEmberAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchEmberList = async () => {
    setEmberListLoading(true);
    try {
      const data = await getAdminEmberList(20, 0);
      setEmberList(data);
    } catch (error) {
      console.error('Error fetching ember list:', error);
    } finally {
      setEmberListLoading(false);
    }
  };

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

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Ember Analytics
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

      {/* Ember Analytics Tab */}
      {activeTab === 'analytics' && (
        <>
          {analyticsLoading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : analytics ? (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <Database className="w-4 h-4 mr-2" />
                      Total Embers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overview.totalEmbers}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analytics.overview.publicEmbers} public, {analytics.overview.privateEmbers} private
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <Activity className="w-4 h-4 mr-2" />
                      Story Cuts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overview.totalStoryCuts}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analytics.activity.recentStoryCuts} in last 30 days
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Contributors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.overview.totalContributorConnections}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {analytics.overview.averageContributorsPerEmber} avg per ember
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Token Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(analytics.tokenUsage.totalTokens)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      ~${analytics.tokenUsage.estimatedCost} estimated cost
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Token Usage Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Token Usage Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Story Cut Generation</span>
                        <span className="font-medium">{formatNumber(analytics.tokenUsage.totalStoryCutTokens)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Image Analysis</span>
                        <span className="font-medium">{formatNumber(analytics.tokenUsage.totalImageAnalysisTokens)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center font-semibold">
                        <span>Total Tokens</span>
                        <span>{formatNumber(analytics.tokenUsage.totalTokens)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">New Embers (30 days)</span>
                        <span className="font-medium">{analytics.activity.recentEmbers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">New Story Cuts (30 days)</span>
                        <span className="font-medium">{analytics.activity.recentStoryCuts}</span>
                      </div>
                      <div className="border-t pt-2">
                        <span className="text-xs text-gray-500">
                          Data calculated: {formatDate(analytics.timestamps.calculatedAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Active Embers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Active Embers</CardTitle>
                  <CardDescription>
                    Embers with the most story cuts (titles truncated for privacy)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.activity.topEmbers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Story Cuts</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Contributors</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Total Duration</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Visibility</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.activity.topEmbers.map((ember, index) => (
                            <tr key={ember.ember_id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="font-medium">{ember.title}</div>
                                <div className="text-xs text-gray-500">#{index + 1}</div>
                              </td>
                              <td className="py-3 px-4 font-medium">{ember.story_cuts}</td>
                              <td className="py-3 px-4">{ember.contributors}</td>
                              <td className="py-3 px-4">{ember.total_duration}s</td>
                              <td className="py-3 px-4">
                                <Badge className={ember.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {ember.is_public ? 'Public' : 'Private'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatDate(ember.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No embers with story cuts found
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Ember List */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Embers</CardTitle>
                  <CardDescription>
                    Latest embers in the system (no private user data shown)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {emberListLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : emberList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Story Cuts</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Contributors</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Visibility</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emberList.map((ember) => (
                            <tr key={ember.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="font-medium">{ember.title}</div>
                              </td>
                              <td className="py-3 px-4">{ember.story_cuts_count}</td>
                              <td className="py-3 px-4">{ember.contributors_count}</td>
                              <td className="py-3 px-4">
                                <Badge className={ember.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                  {ember.is_public ? 'Public' : 'Private'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {formatDate(ember.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No embers found
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Failed to load analytics data</p>
                <Button onClick={fetchAnalytics} className="mt-4">
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </motion.div>
  );
} 