import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  ArrowRight,
  Shield,
  Activity,
  Database,
  Wrench
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useStore from '@/store';

const quickActions = [
  {
    title: "User Management",
    description: "Manage user accounts, roles, and permissions",
    icon: Users,
    href: "/admin/users",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  {
    title: "System Analytics",
    description: "View system metrics and user activity",
    icon: BarChart3,
    href: "/admin/analytics",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  {
    title: "Prompt Management",
    description: "Configure AI prompts and templates",
    icon: MessageSquare,
    href: "/admin/prompts",
    color: "text-purple-600",
    bgColor: "bg-purple-100"
  },
  {
    title: "API Testing",
    description: "Test API endpoints and system health",
    icon: Settings,
    href: "/admin/api",
    color: "text-orange-600",
    bgColor: "bg-orange-100"
  },
  {
    title: "Development Tools",
    description: "Database utilities, prompt seeding, and dev tools",
    icon: Wrench,
    href: "/admin/tools",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100"
  }
];

export default function AdminDashboard() {
  const { userProfile, allUsers } = useStore();

  const stats = [
    {
      title: "Total Users",
      value: allUsers?.length || 0,
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Admin Users",
      value: allUsers?.filter(u => u.role === 'super_admin' || u.role === 'admin').length || 0,
      icon: Shield,
      color: "text-red-600"
    },
    {
      title: "System Status",
      value: "Healthy",
      icon: Activity,
      color: "text-green-600"
    },
    {
      title: "Database",
      value: "Connected",
      icon: Database,
      color: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {userProfile?.first_name || 'Admin'}. Here's what's happening with your system.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${action.bgColor}`}>
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                      <Button asChild variant="outline" size="sm">
                        <Link to={action.href}>
                          Go to {action.title}
                          <ArrowRight className="h-3 w-3 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>
            Overview of system status and recent activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Database Connection</span>
              </div>
              <span className="text-sm text-green-600">Healthy</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">API Services</span>
              </div>
              <span className="text-sm text-green-600">Operational</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-800">Storage</span>
              </div>
              <span className="text-sm text-blue-600">Available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 