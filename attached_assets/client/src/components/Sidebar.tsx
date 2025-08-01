import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { useState } from "react";
import { shouldRedirectToMobile } from "@/utils/deviceDetection";
import { 
  BarChart3, 
  Clock, 
  FileText, 
  Settings, 
  FolderSync, 
  Users, 
  User,
  Monitor,
  TrendingUp,
  Building2,
  LayoutGrid,
  CheckCircle,
  Database,
  UserCheck,
  ShieldOff,
  CalendarDays,
  Menu,
  ChevronDown,
  ChevronRight,
  Layers,
  Target,
  MessageCircle,
  MessageSquare,
  Trophy,
  Bell,
  Smartphone,
  Terminal,
  LogOut,
  RefreshCw,
  Navigation2,
  Shield
} from "lucide-react";

interface NavGroup {
  label: string;
  icon: any;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Workforce", "Scheduling", "Analytics & Reports", "Admin Management", "System Administration"
  ]);

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupLabel) 
        ? prev.filter(g => g !== groupLabel)
        : [...prev, groupLabel]
    );
  };

  const navGroups: NavGroup[] = [
    {
      label: "Workforce",
      icon: Users,
      items: [
        { path: "/employees", label: "Employee Directory", icon: Users },
        { path: "/attendance", label: "Attendance Records", icon: Clock },
        { path: "/track-trace", label: "Track & Trace", icon: Navigation2 },
        { path: "/manager-assignment", label: "Manager Assignment", icon: UserCheck },
        { path: "/shifts", label: "Shift Timings", icon: Clock },
        { path: "/advanced-shifts", label: "Shift Management", icon: Target },
        { path: "/biometric-exemptions", label: "Biometric Exemptions", icon: ShieldOff },
        { path: "/groups", label: "Department Groups", icon: LayoutGrid },
      ]
    },

    {
      label: "Analytics & Reports",
      icon: TrendingUp,
      items: [
        { path: "/unified-analytics", label: "Unified Analytics", icon: BarChart3 },
        { path: "/analytics", label: "Analytics Dashboard", icon: TrendingUp },
        { path: "/attendance-metrics", label: "Attendance Metrics", icon: Clock },
        { path: "/performance-overview", label: "Performance Overview", icon: CheckCircle },
        { path: "/scoring-system", label: "Scoring System", icon: Target },
        { path: "/reports", label: "Standard Reports", icon: FileText },
        { path: "/comprehensive-report", label: "Comprehensive Report", icon: FileText },
      ]
    },
    {
      label: "Admin Management",
      icon: Shield,
      items: [
        ...(user?.role === "superadmin" || user?.role === "general_admin" ? [
          { path: "/user-management", label: "User Management", icon: User },
          { path: "/session-management", label: "Session Management", icon: Monitor }
        ] : []),

        { path: "/role-management", label: "Role Management", icon: Shield },
      ]
    },
    {
      label: "System Administration",
      icon: Settings,
      items: [
        { path: "/devices-management", label: "Session Control", icon: Smartphone },
        { path: "/device-management", label: "Device Management", icon: Smartphone },
        { path: "/data-interface", label: "Live Data", icon: Database },
        { path: "/data-continuity", label: "Data Continuity", icon: Database },
        { path: "/service-health", label: "Service Health", icon: Monitor },
        { path: "/polling-interface", label: "3-Poller System", icon: RefreshCw },
        { path: "/department-field-management", label: "Field Staff Optimization", icon: Navigation2 },
        { path: "/whatsapp-console", label: "WhatsApp Console", icon: MessageCircle },
        { path: "/notification-management", label: "Notification Management", icon: Bell },
        { path: "/shell", label: "Shell Terminal", icon: Terminal },
        { path: "/settings", label: "System Settings", icon: Settings },
      ]
    }
  ];

  // For staff users, show limited navigation
  if (user?.role === "staff") {
    return (
      <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#1A1B3E] border-r border-slate-700 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-3 ${isCollapsed ? 'hidden' : 'block'}`}>
              <div className="bg-blue-500 rounded-lg p-2">
                <Clock className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Nexlinx Smart EMS</h1>
                <p className="text-slate-400 text-xs">Employee Portal</p>
              </div>
            </div>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-[#2A2B5E] text-slate-300 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="p-3 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <EmployeeAvatar name={user?.username || "Employee"} size="sm" />
                <div className="status-indicator bg-green-500"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{user?.username || "Employee"}</p>
                <p className="text-xs text-slate-400">Employee</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Employee Navigation Links */}
          <Link href="/my-profile">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/my-profile"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <User className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">My Profile</span>}
            </div>
          </Link>

          <Link href="/attendance">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/attendance"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <Clock className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Attendance</span>}
            </div>
          </Link>

          <Link href="/schedule">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/schedule"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <CalendarDays className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Schedule</span>}
            </div>
          </Link>

          <Link href="/analytics">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/analytics"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <BarChart3 className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Analytics</span>}
            </div>
          </Link>

          <Link href="/requests">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/requests"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <FileText className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Requests</span>}
            </div>
          </Link>

          <Link href="/communicate">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/communicate"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <MessageCircle className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Communicate</span>}
            </div>
          </Link>

          <Link href="/leaderboard">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/leaderboard"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <Trophy className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Leaderboard</span>}
            </div>
          </Link>

          <Link href="/settings">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/settings"
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <Settings className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Settings</span>}
            </div>
          </Link>

          {/* Separator */}
          <div className="border-t border-slate-700 my-2"></div>

          {/* Logout */}
          <div 
            onClick={() => {
              // Handle logout
              window.location.href = '/logout';
            }}
            className="flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && <span className="text-sm">Logout</span>}
          </div>
        </nav>
      </aside>
    );
  }

  if (user?.role === "employee") {
    // Employee portal handles its own layout and sidebar
    return null;
  }

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#1A1B3E] border-r border-slate-700 flex flex-col transition-all duration-300`}>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${isCollapsed ? 'hidden' : 'block'}`}>
            <div className="bg-blue-500 rounded-lg p-2">
              <Clock className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Nexlinx Smart EMS</h1>
              <p className="text-slate-400 text-xs">Employee Management</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-[#2A2B5E] text-slate-300 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-3 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <EmployeeAvatar name={user?.username || "Admin"} size="sm" />
              <div className="status-indicator bg-green-500"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{user?.username || "Admin"}</p>
              <p className="text-xs text-slate-400">System Administrator</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* My Dashboard - top standalone item with device detection */}
        <div 
          onClick={() => {
            const targetUrl = shouldRedirectToMobile() ? "/mobile/employee/dashboard" : "/desktop/employee/dashboard";
            window.location.href = targetUrl;
          }}
          className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
            location === "/my-dashboard" || location === "/desktop/employee/dashboard" || location === "/mobile/employee/dashboard"
              ? "bg-[#2A2B5E] text-white" 
              : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
          }`}>
          <User className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm">My Dashboard</span>}
        </div>

        {/* Admin Dashboard - standalone item - only for admin users */}
        {(user?.role === "admin" || user?.role === "superadmin" || user?.role === "general_admin") && (
          <Link href="/">
            <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
              location === "/" 
                ? "bg-[#2A2B5E] text-white" 
                : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
            }`}>
              <BarChart3 className="w-4 h-4" />
              {!isCollapsed && <span className="text-sm">Admin Dashboard</span>}
            </div>
          </Link>
        )}

        {/* Separator */}
        <div className="border-t border-slate-700 my-2"></div>

        {navGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.label);
          const GroupIcon = group.icon;
          
          return (
            <div key={group.label} className="space-y-1">
              <button
                onClick={() => !isCollapsed && toggleGroup(group.label)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left ${
                  isCollapsed ? 'cursor-default' : 'hover:bg-[#2A2B5E] hover:text-white'
                } text-slate-300`}
              >
                <div className="flex items-center space-x-3">
                  <GroupIcon className="w-4 h-4" />
                  {!isCollapsed && <span className="text-sm font-medium">{group.label}</span>}
                </div>
                {!isCollapsed && (
                  isExpanded ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {(isExpanded || isCollapsed) && (
                <div className={`space-y-1 ${isCollapsed ? '' : 'ml-2'}`}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} href={item.path}>
                        <div className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                          location === item.path 
                            ? "bg-[#2A2B5E] text-white" 
                            : "text-slate-300 hover:bg-[#2A2B5E] hover:text-white"
                        }`}>
                          <Icon className="w-4 h-4" />
                          {!isCollapsed && <span className="text-sm">{item.label}</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          Version 2.0.1
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
