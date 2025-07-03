import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shield, 
  User,
  Mail,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import useStore from '@/store';

function getRoleBadgeColor(role) {
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
}

function formatDate(dateString) {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}



function UserActions({ user, onEdit, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit User
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onDelete(user)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileUserCard({ user, onEdit, onDelete }) {
  return (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900 truncate">
              {user.first_name || user.last_name 
                ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                : user.email?.split('@')[0] || 'N/A'
              }
            </p>
            <Badge className={cn("text-xs", getRoleBadgeColor(user.role))}>
              {user.role?.replace('_', ' ') || 'user'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email || 'N/A'}</span>
            </div>
            
            {user.created_at && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>Joined {formatDate(user.created_at)}</span>
              </div>
            )}
            
            {user.last_sign_in_at && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>Last active {formatDate(user.last_sign_in_at)}</span>
              </div>
            )}
          </div>
        </div>
        
        <UserActions user={user} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

function DesktopUserTable({ users, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-4 font-medium text-gray-900">User Name</th>
            <th className="text-left p-4 font-medium text-gray-900">Email</th>
            <th className="text-center p-4 font-medium text-gray-900">Role</th>
            <th className="text-left p-4 font-medium text-gray-900">Joined</th>
            <th className="text-left p-4 font-medium text-gray-900">Last Active</th>
            <th className="text-right p-4 font-medium text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b hover:bg-gray-50">
              <td className="p-4">
                <div className="font-medium text-gray-900 text-left">
                  {user.first_name || user.last_name 
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : ''
                  }
                </div>
              </td>
              <td className="p-4">
                <div className="text-sm text-gray-600 text-left">
                  {user.email || 'N/A'}
                </div>
              </td>
              <td className="p-4 text-center">
                <Badge className={cn("text-xs", getRoleBadgeColor(user.role))}>
                  {user.role?.replace('_', ' ') || 'user'}
                </Badge>
              </td>
              <td className="p-4 text-sm text-gray-600">
                {formatDate(user.created_at)}
              </td>
              <td className="p-4 text-sm text-gray-600">
                {formatDate(user.last_sign_in_at)}
              </td>
              <td className="p-4 text-right">
                <UserActions user={user} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UserTable({ users, onEditUser }) {
  const { updateUserRole } = useStore();
  const [deleteUser, setDeleteUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  


  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    setIsDeleting(true);
    try {
      // TODO: Implement user deletion in store
      console.log('Deleting user:', deleteUser.id);
      // await deleteUserById(deleteUser.id);
      setDeleteUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
        <p className="text-gray-600">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden">
        {users.map((user) => (
          <MobileUserCard
            key={user.id}
            user={user}
            onEdit={onEditUser}
            onDelete={setDeleteUser}
          />
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <DesktopUserTable
          users={users}
          onEdit={onEditUser}
          onDelete={setDeleteUser}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteUser?.email}? This action cannot be undone.
              All of their data, including embers and stories, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 