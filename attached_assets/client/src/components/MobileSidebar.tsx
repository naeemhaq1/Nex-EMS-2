import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { 
  BarChart3, 
  Clock, 
  FileText, 
  FileSpreadsheet,
  Settings, 
  FolderSync, 
  Users, 
  User,
  Monitor,
  Calendar,
  MessageCircle,
  TrendingUp,
  Building2,
  LogOut,
  CheckCircle,
  LayoutGrid,
  Database,
  UserCheck,
  ShieldOff,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Smartphone,
  RotateCcw,
  WifiOff,
  Phone
} from "lucide-react";
import { Button } from "./ui/button";

interface MobileSidebarProps {
  onNavigate: () => void;
}

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

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Workforce", "Mobile Features", "Scheduling", "Analytics & Reports", "System Administration"
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
        { path: "/mobile/employees", label: "Employee Directory", icon: Users },
        { path: "/mobile/attendance", label: "Attendance Records", icon: Clock },
        { path: "/mobile/groups", label: "Department Groups", icon: LayoutGrid },
      ]
    },
    {
      label: "Mobile Features",
      icon: Smartphone,
      items: [
        { path: "/mobile/whatsapp", label: "WhatsApp Console", icon: MessageCircle },
        { path: "/mobile/offline-punch", label: "Offline Punch", icon: WifiOff },
        { path: "/mobile/admin-whatsapp", label: "Admin WhatsApp", icon: ShieldOff },
      ]
    },
    {
      label: "Mobile Admin",
      icon: TrendingUp,
      items: [
        { path: "/mobile/punch", label: "Mobile Punch", icon: Clock },
        { path: "/mobile/offline-punch", label: "Offline Punch", icon: WifiOff },
        { path: "/mobile/sync-status", label: "Sync Status", icon: RotateCcw },
      ]
    },
    {
      label: "Scheduling",
      icon: Calendar,
      items: [
        { path: "/mobile/schedule", label: "Schedule Calendar", icon: Calendar },
        { path: "/mobile/shifts", label: "Shift Management", icon: Clock },
      ]
    },
    {
      label: "Analytics & Reports",
      icon: TrendingUp,
      items: [
        { path: "/mobile/reports", label: "Standard Reports", icon: FileText },
        { path: "/mobile/comprehensive-report", label: "Comprehensive Report", icon: FileSpreadsheet },
      ]
    },
    {
      label: "System Administration",
      icon: Settings,
      items: [
        { path: "/mobile/devices", label: "Device Discovery", icon: Monitor },
        { path: "/mobile/devices-management", label: "Session Control", icon: Phone },
        { path: "/mobile/sync", label: "Data Synchronization", icon: FolderSync },
        { path: "/mobile/data-availability", label: "Data Availability", icon: BarChart3 },
        { path: "/mobile/whatsapp-console", label: "WhatsApp Console", icon: MessageCircle },
        { path: "/mobile/odoo", label: "Odoo Integration", icon: Building2 },
        { path: "/mobile/settings", label: "System Settings", icon: Settings },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    onNavigate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* User info */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-full p-2">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{user?.username}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {/* My Dashboard - top standalone item for admin users */}
          {(user?.role === "admin" || user?.role === "superadmin") && (
            <Link href="/mobile/my-dashboard">
              <div
                className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                  location === "/mobile/my-dashboard" 
                    ? "bg-primary text-white" 
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
                onClick={onNavigate}
              >
                <User className="w-4 h-4" />
                <span className="text-sm">My Dashboard</span>
              </div>
            </Link>
          )}

          {/* My Profile - available for all users */}
          <Link href="/mobile/my-profile">
            <div
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                location === "/mobile/my-profile" 
                  ? "bg-primary text-white" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={onNavigate}
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-sm">My Profile</span>
            </div>
          </Link>

          {/* Dashboard - standalone item */}
          <Link href="/mobile">
            <div
              className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                location === "/mobile" 
                  ? "bg-primary text-white" 
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
              onClick={onNavigate}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">{(user?.role === "admin" || user?.role === "superadmin") ? "Admin Dashboard" : "Dashboard"}</span>
            </div>
          </Link>

          {/* Separator */}
          <div className="border-t border-slate-700 my-2"></div>

          {navGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.label);
            const GroupIcon = group.icon;
            
            return (
              <div key={group.label} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between p-2 rounded-lg transition-colors text-left hover:bg-slate-700 hover:text-white text-slate-300"
                >
                  <div className="flex items-center space-x-3">
                    <GroupIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{group.label}</span>
                  </div>
                  {isExpanded ? 
                    <ChevronDown className="w-4 h-4" /> : 
                    <ChevronRight className="w-4 h-4" />
                  }
                </button>
                
                {isExpanded && (
                  <div className="space-y-1 ml-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path;
                      return (
                        <Link key={item.path} href={item.path}>
                          <div 
                            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                              isActive 
                                ? "bg-primary text-white" 
                                : "text-slate-300 hover:bg-slate-700 hover:text-white"
                            }`}
                            onClick={onNavigate}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{item.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>



      <div className="p-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          Version 2.0.1
        </div>
      </div>
    </div>
  );
}