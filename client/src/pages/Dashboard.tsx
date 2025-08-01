import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import MobileStyleDashboard from "@/components/MobileStyleDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect staff users to proper desktop employee dashboard
    if (user?.role === 'staff' || user?.role === 'employee') {
      setLocation('/desktop/employee/dashboard');
      return;
    }
  }, [user, setLocation]);

  // Only show for admin users
  if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'general_admin') {
    return <MobileStyleDashboard />;
  }

  // Loading state or redirect in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1B3E]">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p className="text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Calendar, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Total Employees",
      value: "293",
      description: "Active employees",
      icon: Users,
      color: "bg-blue-500"
    },
    {
      title: "Present Today",
      value: "271",
      description: "92.5% attendance rate",
      icon: Clock,
      color: "bg-green-500"
    },
    {
      title: "On Time",
      value: "226",
      description: "Punctual arrivals",
      icon: Calendar,
      color: "bg-purple-500"
    },
    {
      title: "Performance",
      value: "Excellent",
      description: "System running smoothly",
      icon: TrendingUp,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your dashboard overview for today
          </p>
          <Badge variant="secondary" className="mt-2">
            {user?.role?.toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest system updates and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">System Health Check</p>
                    <p className="text-xs text-gray-500">All services operational</p>
                  </div>
                  <span className="text-xs text-gray-400">2 mins ago</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Attendance Sync</p>
                    <p className="text-xs text-gray-500">Latest data synchronized</p>
                  </div>
                  <span className="text-xs text-gray-400">5 mins ago</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cache Updated</p>
                    <p className="text-xs text-gray-500">Dashboard metrics refreshed</p>
                  </div>
                  <span className="text-xs text-gray-400">10 mins ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <Users className="h-6 w-6 text-blue-600 mb-2" />
                  <p className="text-sm font-medium text-blue-900">View Employees</p>
                </button>
                <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <Clock className="h-6 w-6 text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-900">Attendance</p>
                </button>
                <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <Calendar className="h-6 w-6 text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-purple-900">Schedule</p>
                </button>
                <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                  <TrendingUp className="h-6 w-6 text-orange-600 mb-2" />
                  <p className="text-sm font-medium text-orange-900">Reports</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
