import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Layout } from "@/components/Layout";
import { useEffect } from "react";
import { shouldRedirectToMobile, shouldRedirectToDesktop } from "@/utils/deviceDetection";
import { registerServiceWorker } from "@/utils/serviceWorker";

// Global error handler to prevent runtime error plugin from persisting AbortErrors
window.addEventListener('error', (event) => {
  if (event.error?.name === 'AbortError') {
    event.preventDefault();
    console.log('AbortError caught and suppressed globally');
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AbortError') {
    event.preventDefault();
    console.log('Unhandled AbortError promise rejection caught and suppressed');
    return false;
  }
});

import Dashboard from "@/pages/Dashboard";
import EmployeeDirectory from "@/pages/NewEmployeeDirectory";
import EmployeeProfile from "@/pages/NewEmployeeProfile";
import AttendanceRecords from "@/pages/AttendanceRecords";
import EmployeePortal from "@/pages/EmployeePortal";

import DevicesManagement from "@/pages/DevicesManagement";
import ShiftManagement from "@/pages/ShiftManagement";
import AdvancedShiftManagement from "@/pages/AdvancedShiftManagement";


import AdminAnalytics from "@/pages/AdminAnalytics";
import Settings from "@/pages/Settings";
import ServiceHealthDashboard from "@/pages/ServiceHealthDashboard";
import NotificationManagement from "@/pages/NotificationManagement";
import ShellTerminal from "@/pages/ShellTerminal";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import DepartmentGroups from "@/pages/DepartmentGroups";
import DepartmentFieldManagement from "@/pages/admin/DepartmentFieldManagement";
import CheckAttend from "@/pages/CheckAttend";

import DataInterface from "@/pages/DataInterface";
import PresentToday from "@/pages/PresentToday";
// Desktop Data Continuity import
import DataContinuity from "@/pages/desktop/DataContinuity";

import BiometricExemptions from "@/pages/BiometricExemptions";
import DailyMetrics from "@/pages/DailyMetrics";

import ScoringSystem from "@/pages/ScoringSystem";
import WhatsAppStunningConsole from "@/pages/WhatsAppStunningConsole";
import RoleManagement from "@/pages/RoleManagement";
import ComprehensiveUserManagement from "@/components/ComprehensiveUserManagement";
import SessionManagement from "@/pages/SessionManagement";
import ManagerAssignment from "@/pages/ManagerAssignment";
import UnifiedUserManagement from './pages/UnifiedUserManagement';


import PollingInterface from "@/pages/PollingInterface";
import ImportExportTest from "@/pages/ImportExportTest";
// WhatsApp interfaces consolidated to stunning versions only
import { ThreeTierServiceMonitor } from "@/pages/mobile/ThreeTierServiceMonitor";

// Mobile imports
import MobileRouter from "@/pages/mobile/MobileRouter";
import MobileStyleDashboard from "@/components/MobileStyleDashboard";
import LoadingDemo from "@/pages/mobile/LoadingDemo";
import DesktopEmployeeDashboard from "@/pages/DesktopEmployeeDashboard";
import DesktopAdminDashboard from "@/pages/DesktopAdminDashboard";
import MobileAdminAttendanceTracker from "@/pages/mobile/admin/MobileAdminAttendanceTracker";
import DesktopAdminAttendanceTracker from "@/pages/desktop/admin/DesktopAdminAttendanceTracker";
import MobileUserManagement from "@/pages/mobile/admin/MobileUserManagement";

// Desktop Admin imports
import NewAdminDesktopDashboard from "@/pages/NewAdminDesktopDashboard";
import DesktopAdminAnnouncements from "@/pages/DesktopAdminAnnouncements";
import TrackTrace from "@/pages/TrackTrace";
import GoogleMapsVerification from "@/pages/GoogleMapsVerification";
import MonthlyReport from "@/pages/MonthlyReport";
import MonthlyReportTable from "@/pages/MonthlyReportTable";
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppRoutes from './AppRoutes';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import MobileRedirect from './components/MobileRedirect';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Small delay to prevent initial flash
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1A1B3E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="App">
            <MobileRedirect />
            <AppRoutes />
            <OfflineIndicator />
            <SyncStatusIndicator />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;