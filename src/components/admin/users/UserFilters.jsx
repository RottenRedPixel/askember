import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const roleOptions = [
  { value: 'all', label: 'All Roles', count: null },
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  { value: 'moderator', label: 'Moderator', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'user', label: 'User', color: 'bg-gray-100 text-gray-800' },
];

export default function UserFilters({ 
  selectedRole, 
  onRoleChange, 
  compact = false, 
  onClose 
}) {
  const handleReset = () => {
    onRoleChange('all');
    if (onClose) onClose();
  };

  if (compact) {
    // Desktop compact version
    return (
      <div className="flex items-center gap-2">
        <Select value={selectedRole} onValueChange={onRoleChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedRole !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Mobile full version
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filters</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Filter by Role
          </Label>
          <div className="grid grid-cols-1 gap-2">
            {roleOptions.map((role) => (
              <button
                key={role.value}
                onClick={() => onRoleChange(role.value)}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                  selectedRole === role.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium">{role.label}</span>
                {role.color && (
                  <Badge className={`text-xs ${role.color}`}>
                    {role.label}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters */}
        {selectedRole !== 'all' && (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Active Filters
            </Label>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1 cursor-pointer"
                onClick={handleReset}
              >
                Role: {roleOptions.find(r => r.value === selectedRole)?.label}
                <X className="h-3 w-3" />
              </Badge>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            Clear All
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              className="flex-1"
            >
              Apply Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 