// Application version information
export const APP_VERSION = {
  version: "3.0.0",
  name: "Nexlinx Smart EMS",
  codename: "Safecity Premium",
  releaseDate: "2025-01-10",
  buildNumber: "3000",
  environment: process.env.NODE_ENV || "development",
  features: [
    "Employee Management with CNIC tracking",
    "Real-time Attendance Tracking",
    "Shift Management System", 
    "Pakistan Timezone Support",
    "Attendance Heat Map",
    "Mobile Application",
    "Email Reporting",
    "Department Groups",
    "Gamification System",
    "Audit Trail",
    "Present Employee Management",
    "Theme Switching (Dark/Light)",
    "Advanced Analytics Dashboard",
    "Employee Portal with KPIs",
    "Performance Tracking",
    "Forced Punch-out Controls",
    "Comprehensive Visual Charts"
  ],
  changelog: [
    {
      version: "3.0.0",
      date: "2025-01-10",
      changes: [
        "Added comprehensive Employee Portal with KPI panels",
        "Implemented theme switching (Dark/Light mode)",
        "Enhanced Present Employee Management interface",
        "Added advanced visual analytics with donut/bar charts",
        "Implemented forced punch-out controls for admin",
        "Added comprehensive audit logging system",
        "Enhanced dashboard with real-time metrics",
        "Improved mobile responsiveness across all features"
      ]
    },
    {
      version: "2.4.0",
      date: "2025-01-09",
      changes: [
        "Fixed authentication system",
        "Enhanced department chart functionality",
        "Improved attendance calculations",
        "Added timezone support for Pakistan",
        "Fixed employee directory display"
      ]
    }
  ]
};