import { useState } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, Trophy, BarChart3, Calendar, Bell, Menu, LogOut, Target
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import EmployeeDashboard from "./employee/EmployeeDashboard";
import EmployeeLeaderboard from "./employee/EmployeeLeaderboard";
import EmployeeAnalytics from "./employee/EmployeeAnalytics";
import EmployeeAttendance from "./employee/EmployeeAttendance";
import EmployeeScoring from "./employee/EmployeeScoring";

const getMenuItems = (isLiveMode: boolean, isAdmin: boolean) => [
  { icon: LayoutDashboard, label: "Dashboard", path: "/employee-portal" },
  { icon: Calendar, label: "Attendance", path: "/employee-portal/attendance" },
  ...(isLiveMode || isAdmin ? [
    { icon: Target, label: "My Scoring", path: "/employee-portal/scoring" },
    { icon: BarChart3, label: "Analytics", path: "/employee-portal/analytics" },
    { icon: Trophy, label: "Leaderboard", path: "/employee-portal/leaderboard" },
  ] : []),
];

export default function EmployeePortal() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch system configuration to check if scoring is live
  const { data: systemConfig } = useQuery({
    queryKey: ["/api/system-configuration"],
  });

  const isLiveMode = systemConfig?.configValue === "live";
  const isAdmin = user?.role === "admin";

  // Development Phase - Logout functionality (Will be removed in final version)
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const EmployeeSidebar = () => (
    <div className="flex flex-col h-full bg-[#1A1B3E] text-white border-r border-[#2A2B5E]">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Employee Portal</h2>
        </div>
        <p className="text-sm text-gray-400">
          Welcome back, {user?.username}
        </p>
      </div>
      
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {getMenuItems(isLiveMode, isAdmin).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || 
              (item.path !== "/employee-portal" && location.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <div
                    className={`
                      flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors cursor-pointer
                      ${isActive 
                        ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30' 
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }
                    `}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Development Phase - Logout Button (Will be removed in final version) */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/5"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#1A1B3E]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-shrink-0">
        <EmployeeSidebar />
      </div>
      
      {/* Mobile Menu */}
      <div className="md:hidden">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 text-white">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <EmployeeSidebar />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Switch>
          <Route path="/employee-portal/attendance">
            <EmployeeAttendance />
          </Route>
          {(isLiveMode || isAdmin) && (
            <>
              <Route path="/employee-portal/scoring">
                <EmployeeScoring />
              </Route>
              <Route path="/employee-portal/analytics">
                <EmployeeAnalytics />
              </Route>
              <Route path="/employee-portal/leaderboard">
                <EmployeeLeaderboard />
              </Route>
            </>
          )}
          <Route path="/employee-portal">
            <EmployeeDashboard />
          </Route>
          <Route>
            <EmployeeDashboard />
          </Route>
        </Switch>
      </div>
    </div>
  );
}