# Nexlinx Employee Management System

## Overview
The Nexlinx Employee Management System is an advanced, mobile-first platform designed to provide a robust and high-performance administration experience across various devices. It aims to streamline employee management processes, leveraging cutting-edge mobile technologies. The project's vision is to deliver resilient and performant solutions for workforce management.

## User Preferences
- **CRITICAL: Always ask permission before making structural/architectural changes**
- **ABSOLUTE RULE: 3-POLLER SYSTEM AND DATA PROCESSING FROM STAGING TO FINAL ATTENDANCE IS NOT TO BE TOUCHED IN ANY WAY SHAPE OR FORM**
- Never consolidate or modify core services (data processing, polling systems) without explicit approval
- Data processing and pulling services (unifiedAttendanceProcessingService, threePollerSystem) must remain completely untouched
- Focus on deployment readiness and production optimization
- Prefer EAS CLI direct builds over GitHub Actions (faster: 5-10 min vs 15-20 min)
- Multiple builds needed for iterative development - Expo Starter plan recommended
- Resolve dependency conflicts properly rather than workarounds
- GitHub repository: https://github.com/naeemhaq1/Nex-EMS-Web
- Minimize Docker image size for successful deployment
- Preserve all essential application functionality
- Clean project structure without unnecessary files

## System Architecture
**UI/UX Decisions:**
- **CRITICAL DESIGN STANDARD**: Dark purple and blue theme must be followed for ALL interfaces.
    - **FORBIDDEN COLORS**: Yellow, brown, orange buttons are prohibited unless representing status indicators.
    - **APPROVED COLORS**: Dark purple gradients, indigo, blue variants, and purple accents only.
    - **STATUS EXCEPTION**: Orange/yellow/red only allowed for status indicators (urgent, warning, error states).
    - **CONSISTENCY REQUIREMENT**: All buttons, cards, gradients must use purple/blue color palette.
- Professional avatars are used system-wide, generated based on gender (limited female options) and designation.
- Data density is optimized across interfaces, particularly for the WhatsApp desktop console, to maximize information display in a full-screen layout.
- Responsive design is prioritized for all components, adapting to mobile and desktop views.

**Technical Implementations & Feature Specifications:**
- **Core System**:
    - Comprehensive Employee Management System.
    - Manager assignment interface with search, filters, and department assignment.
    - Biometric exemptions system with precise employee matching and updated attendance calculations.
    - Device management integrated into a comprehensive user management interface, including device monitoring, trust/untrust capabilities, and KPIs.
    - Advanced announcement system with real-time updates, targeting by department/employee, and a red text scroller for urgent messages.
    - Robust authentication system with role-based routing and session management.
    - Component versioning system for tracking and history.
    - Discrete location services with a subtle indicator and warnings only when disabled.
    - Comprehensive backup system with self-installing scripts and Docker exclusion.
- **WhatsApp Integration**:
    - Consolidated WhatsApp interfaces for significant code reduction.
    - Full-screen queue management system with real-time data, WAMNum tracking, and action controls.
    - Department-based access control for WhatsApp contacts.
    - Professional avatar integration for WhatsApp contacts.
    - Complete data density optimization for WhatsApp desktop console.
    - Automatic `wanumber` (92x format) population via database trigger on mobile number updates.
    - Mobile number import and WhatsApp staff directory population.
    - Comprehensive test console for WhatsApp API, including connectivity verification and error handling.
    - Streamlined WhatsApp service architecture into two focused services: Main and Chatbot.
- **Analytics & Reporting**:
    - Redesigned desktop admin analytics dashboard with 12+ modern charts.
    - Centralized analytics formulas system for consistent KPI reporting (e.g., TEE formula, late arrivals, missed punch-outs).
    - Comprehensive 7-day attendance analytics for mobile with Pakistan timezone consistency.
    - **Comprehensive Employee Work Hours Report System**: Monthly attendance reports with specific business rules:
        - 7.5 hours credited for missed punches with 0.5 hour deduction (noted in comments)
        - 160 hours minimum monthly threshold enforcement
        - Separate "Min Hour Breach" section for underperforming employees
        - Top 3 extra-hour performers highlighted with special recognition
        - Biometric-only employees included (non-biometric employees automatically excluded)
        - HTML email delivery with professional formatting and detailed analytics
        - API endpoint: POST /api/admin/generate-hours-report with optional month/year parameters
- **Mobile Application**:
    - Uses WebView to load existing mobile web dashboards.
    - Rolodex-style employee directory with continuous scroll.
    - Department-based access control for the mobile employee directory.
    - Comprehensive user management interface with session monitoring.
    - Extensive sync capabilities for offline data collection and transmission.
    - Complete offline caching system for WebView APK generation.
- **Performance & Stability**:
    - **CRITICAL FIX**: Blue screen loading issue permanently resolved by replacing slow dashboard API with ultra-fast cached version (1600ms+ → <100ms, 94%+ improvement).
    - **Ultra-Fast Dashboard Cache**: 30-second refresh cycle provides sub-500ms dashboard response times with fresh data balance.
    - Startup performance optimized from 30 seconds to under 10 seconds.
    - Authentication performance improved by 47-80% (timeouts reduced from 1500ms to 800ms).
    - Comprehensive error resolution, including React errors and TypeScript LSP errors.
    - Docker build exclusions significantly reduce container size (from 12GB to 783MB, 93% reduction).
    - System-wide button functionality crisis resolved.
    - Permanent timezone system implemented for Pakistan timezone consistency.
    - Graceful startup system implemented to prevent port conflicts.
    - Login performance optimized.

**System Design Choices:**
- **Three-Tier Architecture**: The application is structured into three tiers for minimal interference and service isolation:
    - **Port 5000**: Main web interface and general APIs.
    - **Port 5001**: Core services (attendance, monitoring, backup, polling).
    - **Port 5002**: WhatsApp services (messaging, chatbot, monitoring, contacts).
- **Frontend**: React web application with mobile-responsive design.
- **Backend**: Express.js with PostgreSQL database.
- **Authentication**: Session-based with role management, including admin exemption for device binding controls.
- **Data Integration**: Live connection to BioTime attendance system.
- **Deployment**: Optimized for Docker containers.
- **Environment Management**: Smart development/production mode toggle with auto-login for development and manual login for production.
- **Credential Management**: WhatsApp Business API credentials MUST be stored in `.env` file; Replit Secrets are explicitly forbidden for project isolation.

## External Dependencies
- **PostgreSQL**: Primary database for all system data.
- **BioTime API**: External source for employee and attendance data (`http://202.59.80.69/employees.aspx`).
- **WhatsApp Business API (Meta)**: For messaging, contact management, and broadcast features. Credentials managed via `.env` file.
- **Google Maps API**: Integrated for location tracking and mapping functionalities.
- **Recharts**: JavaScript charting library for data visualization.
- **DiceBear API v7.x**: Used for generating professional avatars.
- **Expo (for Mobile App)**: Framework for building universal React applications.
- **EAS CLI**: Expo Application Services Command Line Interface for building and distributing mobile apps.
- **TanStack Query (React Query)**: For data fetching, caching, and state management.
- **Drizzle ORM**: For interacting with the PostgreSQL database.
- **Vite**: Frontend build tool.
- **Nexlinx SMTP Server**: Internal email delivery service (emailserver.nexlinx.net.pk:587) for automated report distribution.

## Comprehensive Employee Hours Reporting System

### Report Format Specifications
The system generates comprehensive monthly employee work hours reports with the following format:

**Business Rules:**
- Standard work day: 7.5 hours
- Missed punch deduction: 0.5 hours (noted in comments)
- Monthly minimum threshold: 160 hours
- Top performer recognition: Highlights top 3 employees with extra hours
- Biometric-only inclusion: Only employees with biometric attendance (excludes non-bio exemptions)

**Report Sections:**
1. **Executive Summary**: Total employees analyzed, period covered, overall statistics
2. **Main Employee Hours Table**: Employee details, total hours, attendance days, comments
3. **Top Performers Section**: Employees exceeding standard hours with extra time highlighted
4. **Minimum Hour Breach Section**: Employees below 160-hour threshold requiring attention
5. **Detailed Comments**: Missed punch explanations with 0.5hr deductions noted

**Technical Implementation:**
- API Endpoint: `POST /api/admin/generate-hours-report`
- Report Generator: `server/generate-comprehensive-hours-report.ts`
- Email Delivery: Nexlinx SMTP integration with HTML formatting
- Data Source: `daily_attendance_summary` table with biometric exemption filtering
- Business Logic: Handles missed punches, calculates totals, applies deductions