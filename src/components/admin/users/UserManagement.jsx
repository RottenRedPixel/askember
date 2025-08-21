import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Plus,
  Users,
  UserCheck,
  UserX,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useStore from '@/store';
import UserTable from './UserTable';
import UserFilters from './UserFilters';
import UserModal from './UserModal';
import PasswordResetModal from './PasswordResetModal';

export default function UserManagement() {
  const { allUsers, fetchAllUsers, adminLoading } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [passwordResetUser, setPasswordResetUser] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Filter users based on search and role
  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = !searchQuery ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  // Get user statistics
  const userStats = {
    total: allUsers.length,
    admins: allUsers.filter(u => u.role === 'super_admin' || u.role === 'admin').length,
    users: allUsers.filter(u => u.role === 'user').length,
    active: allUsers.filter(u => u.last_sign_in_at &&
      new Date(u.last_sign_in_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedUser(null);
    fetchAllUsers(); // Refresh data
  };

  const handlePasswordReset = (user) => {
    setPasswordResetUser(user);
    setIsPasswordResetModalOpen(true);
  };

  const handlePasswordResetModalClose = () => {
    setIsPasswordResetModalOpen(false);
    setPasswordResetUser(null);
  };

  if (adminLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Users</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{userStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Active</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{userStats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Admins</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{userStats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-600">Regular</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{userStats.users}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Mobile Filters */}
            <div className="sm:hidden">
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[400px]">
                  <UserFilters
                    selectedRole={selectedRole}
                    onRoleChange={setSelectedRole}
                    onClose={() => setFiltersOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Filters */}
            <div className="hidden sm:block">
              <UserFilters
                selectedRole={selectedRole}
                onRoleChange={setSelectedRole}
                compact
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Table/List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            {searchQuery && `Showing results for "${searchQuery}"`}
            {selectedRole !== 'all' && ` • Role: ${selectedRole}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UserTable
            users={filteredUsers}
            onEditUser={handleEditUser}
          />
        </CardContent>
      </Card>

      {/* Add User Button */}
      <div className="flex justify-end">
        <Button onClick={handleCreateUser} className="px-6 py-3 text-lg font-medium">
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </Button>
      </div>

      {/* Create User Modal (Desktop) / Sheet (Mobile) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="hidden sm:block max-w-2xl">
          <UserModal
            user={null}
            onClose={handleModalClose}
            isCreate
          />
        </DialogContent>
      </Dialog>

      <Sheet open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <SheetContent side="bottom" className="sm:hidden h-[90vh]">
          <UserModal
            user={null}
            onClose={handleModalClose}
            isCreate
            isMobile
          />
        </SheetContent>
      </Sheet>

      {/* Edit User Modal (Desktop) / Sheet (Mobile) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="hidden sm:block max-w-2xl">
          <UserModal
            user={selectedUser}
            onClose={handleModalClose}
            onPasswordReset={handlePasswordReset}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <SheetContent side="bottom" className="sm:hidden h-[90vh]">
          <UserModal
            user={selectedUser}
            onClose={handleModalClose}
            onPasswordReset={handlePasswordReset}
            isMobile
          />
        </SheetContent>
      </Sheet>

      {/* Password Reset Modal (Desktop) / Sheet (Mobile) */}
      <Dialog open={isPasswordResetModalOpen} onOpenChange={setIsPasswordResetModalOpen}>
        <DialogContent className="hidden sm:block max-w-lg">
          <PasswordResetModal
            user={passwordResetUser}
            onClose={handlePasswordResetModalClose}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={isPasswordResetModalOpen} onOpenChange={setIsPasswordResetModalOpen}>
        <SheetContent side="bottom" className="sm:hidden h-[70vh]">
          <PasswordResetModal
            user={passwordResetUser}
            onClose={handlePasswordResetModalClose}
            isMobile
          />
        </SheetContent>
      </Sheet>
    </div>
  );
} 