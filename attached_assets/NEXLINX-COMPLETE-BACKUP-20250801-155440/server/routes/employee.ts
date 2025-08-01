import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, format } from "date-fns";

// Schema for photo upload
const photoUploadSchema = z.object({
  photo: z.string().min(1, "Photo data is required"),
});

const router = Router();

// All employee routes require authentication
router.use(requireAuth);

// Get employee profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get user details
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get employee details
    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee profile not found" });
    }

    res.json({
      ...employee,
      lastLogin: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching employee profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Get employee dashboard stats
router.get("/dashboard/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const startOfMonthDate = startOfMonth(today);
    const endOfMonthDate = endOfMonth(today);

    // Get attendance stats for the month
    const monthlyAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: startOfMonthDate,
      dateTo: endOfMonthDate,
    });

    // Calculate stats
    const workingDays = monthlyAttendance.records.filter(r => r.status === 'present').length;
    const lateArrivals = monthlyAttendance.records.filter(r => r.status === 'late').length;
    const earlyDepartures = monthlyAttendance.records.filter(r => {
      if (!r.checkOut) return false;
      const checkOutTime = new Date(r.checkOut);
      return checkOutTime.getHours() < 17; // Before 5 PM
    }).length;

    // Get current streak
    const streak = await storage.getEmployeeStreak(employee.id);

    // Get badge count
    const badges = await storage.getEmployeeBadges(employee.id);

    // Calculate attendance percentage
    const totalDays = new Date().getDate(); // Days passed in current month
    const attendancePercentage = totalDays > 0 ? Math.round((workingDays / totalDays) * 100) : 0;

    res.json({
      workingDays,
      lateArrivals,
      earlyDepartures,
      attendancePercentage,
      currentStreak: streak?.currentStreak || 0,
      totalBadges: badges.length,
      totalPoints: badges.reduce((sum, b) => sum + (b.badge?.points || 0), 0),
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// Get employee attendance stats (for the new dashboard)
router.get("/attendance-stats", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const startOfMonthDate = startOfMonth(today);
    const endOfMonthDate = endOfMonth(today);
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 });

    // Get attendance stats for the month
    const monthlyAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: startOfMonthDate,
      dateTo: endOfMonthDate,
    });

    // Get current week attendance
    const weeklyAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: startOfWeekDate,
      dateTo: endOfWeekDate(today, { weekStartsOn: 1 }),
    });

    // Calculate weekly hours
    const weeklyHours = weeklyAttendance.records.reduce((sum, r) => 
      sum + parseFloat(r.totalHours || '0'), 0);

    // Calculate attendance rates
    const presentCount = monthlyAttendance.records.filter(r => r.status === 'present').length;
    const lateCount = monthlyAttendance.records.filter(r => r.status === 'late').length;
    const absentCount = monthlyAttendance.records.filter(r => r.status === 'absent').length;
    const totalRecords = monthlyAttendance.records.length;

    const presentRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
    const lateRate = totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0;
    const absentRate = totalRecords > 0 ? Math.round((absentCount / totalRecords) * 100) : 0;

    // Get badges and gamification score
    const badges = await storage.getEmployeeBadges(employee.id);
    const gamificationScore = badges.reduce((sum, b) => sum + (b.badge?.points || 0), 0);

    res.json({
      weeklyHours: Math.round(weeklyHours * 100) / 100,
      attendanceRate: presentRate,
      gamificationScore,
      presentRate,
      lateRate,
      absentRate,
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
    });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({ error: "Failed to fetch attendance stats" });
  }
});

// Get employee weekly hours data
router.get("/weekly-hours", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 });

    // Get attendance for current week
    const weeklyAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: startOfWeekDate,
      dateTo: endOfWeek(today, { weekStartsOn: 1 }),
    });

    // Create daily breakdown
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const weeklyData = daysOfWeek.map((dayName, index) => {
      const dayDate = new Date(startOfWeekDate);
      dayDate.setDate(startOfWeekDate.getDate() + index);
      
      const dayRecord = weeklyAttendance.records.find(r => {
        const recordDate = new Date(r.date);
        return recordDate.toDateString() === dayDate.toDateString();
      });

      return {
        day: dayName.substring(0, 2),
        hours: dayRecord ? Math.round(parseFloat(dayRecord.totalHours || '0')) : 0,
      };
    });

    res.json(weeklyData);
  } catch (error) {
    console.error("Error fetching weekly hours:", error);
    res.status(500).json({ error: "Failed to fetch weekly hours" });
  }
});

// Get employee attendance records
router.get("/attendance", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const { page = "1", limit = "20", dateFrom, dateTo } = req.query;

    const records = await storage.getAttendanceRecords({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      employeeId: employee.id,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    res.json(records);
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    res.status(500).json({ error: "Failed to fetch attendance records" });
  }
});

// Get employee recent activity
router.get("/recent-activity", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get last 7 days of attendance
    const sevenDaysAgo = subDays(new Date(), 7);
    const attendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: sevenDaysAgo,
      dateTo: new Date(),
      limit: 10,
    });

    const activity = attendance.records.map(record => ({
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      status: record.status,
      hoursWorked: record.hoursWorked,
    }));

    res.json(activity);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

// Get employee badges
router.get("/badges", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const badges = await storage.getEmployeeBadges(employee.id);
    res.json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// Get badge statistics
router.get("/badges/stats", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const earnedBadges = await storage.getEmployeeBadges(employee.id);
    const allBadges = await storage.getBadges({ isActive: true });

    // Calculate stats
    const totalPoints = earnedBadges.reduce((sum, b) => sum + (b.badge?.points || 0), 0);
    const latestBadge = earnedBadges.length > 0 
      ? earnedBadges.sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())[0]
      : null;

    // Find next achievable badge (simplified logic)
    const unlockedBadgeIds = new Set(earnedBadges.map(b => b.badgeId));
    const nextBadge = allBadges.find(b => !unlockedBadgeIds.has(b.id));

    res.json({
      earned: earnedBadges.length,
      total: allBadges.length,
      totalPoints,
      latestBadge: latestBadge ? {
        id: latestBadge.badgeId,
        name: latestBadge.badge.name,
        icon: latestBadge.badge.icon,
        earnedAt: latestBadge.earnedAt,
      } : null,
      nextBadge: nextBadge ? {
        id: nextBadge.id,
        name: nextBadge.name,
        progress: Math.floor(Math.random() * 80), // TODO: Calculate actual progress
      } : null,
    });
  } catch (error) {
    console.error("Error fetching badge stats:", error);
    res.status(500).json({ error: "Failed to fetch badge stats" });
  }
});

// Get employee schedule
router.get("/schedule", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const { startDate, endDate } = req.query;
    
    const assignments = await storage.getShiftAssignments({
      employeeId: employee.id,
      dateFrom: startDate ? new Date(startDate as string) : startOfWeek(new Date()),
      dateTo: endDate ? new Date(endDate as string) : endOfWeek(new Date()),
    });

    // Get shift details
    const shiftsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const shift = assignment.shiftId ? await storage.getShift(assignment.shiftId) : null;
        return {
          ...assignment,
          shift,
        };
      })
    );

    // Calculate summary
    const summary = {
      totalShifts: shiftsWithDetails.length,
      totalHours: shiftsWithDetails.reduce((sum, a) => {
        if (!a.shift) return sum;
        const start = parseInt(a.shift.startTime.split(':')[0]);
        const end = parseInt(a.shift.endTime.split(':')[0]);
        return sum + (end - start);
      }, 0),
      uniqueProjects: new Set(shiftsWithDetails.map(a => a.shift?.projectName).filter(Boolean)).size,
      shiftBreakdown: shiftsWithDetails.reduce((acc, a) => {
        const shiftName = a.shift?.name || 'Unassigned';
        acc[shiftName] = (acc[shiftName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    res.json({
      assignments: shiftsWithDetails,
      summary,
      teammates: [], // TODO: Implement teammates feature
    });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// Get leave balance (placeholder)
router.get("/leave/balance", async (req: Request, res: Response) => {
  try {
    // TODO: Implement actual leave balance from database
    res.json({
      annual: { available: 15, total: 21, used: 6, pending: 0 },
      sick: { available: 7, total: 10, used: 3, pending: 0 },
      personal: { available: 3, total: 5, used: 2, pending: 0 },
      totalUsed: 11,
      details: [
        {
          type: "annual",
          name: "Annual Leave",
          available: 15,
          total: 21,
          used: 6,
          pending: 0,
          expiryDate: new Date(new Date().getFullYear(), 11, 31),
        },
        {
          type: "sick",
          name: "Sick Leave",
          available: 7,
          total: 10,
          used: 3,
          pending: 0,
        },
        {
          type: "personal",
          name: "Personal Leave",
          available: 3,
          total: 5,
          used: 2,
          pending: 0,
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    res.status(500).json({ error: "Failed to fetch leave balance" });
  }
});

// Get leave history (placeholder)
router.get("/leave/history", async (req: Request, res: Response) => {
  try {
    // TODO: Implement actual leave history from database
    res.json({
      requests: [
        {
          id: 1,
          type: "Annual Leave",
          startDate: new Date(2025, 0, 15),
          endDate: new Date(2025, 0, 17),
          days: 3,
          status: "approved",
          reason: "Family vacation",
        },
        {
          id: 2,
          type: "Sick Leave",
          startDate: new Date(2024, 11, 20),
          endDate: new Date(2024, 11, 21),
          days: 2,
          status: "approved",
          reason: "Medical appointment",
        },
      ],
    });
  } catch (error) {
    console.error("Error fetching leave history:", error);
    res.status(500).json({ error: "Failed to fetch leave history" });
  }
});

// Get leave policies (placeholder)
router.get("/leave/policies", async (req: Request, res: Response) => {
  try {
    // TODO: Implement actual leave policies from database
    res.json([
      {
        id: 1,
        name: "Annual Leave Policy",
        description: "Employees are entitled to 21 days of paid annual leave per year.",
        annualDays: 21,
        carryForward: true,
        maxCarryForward: 5,
        noticeDays: 7,
      },
      {
        id: 2,
        name: "Sick Leave Policy",
        description: "Employees are entitled to 10 days of paid sick leave per year.",
        annualDays: 10,
        carryForward: false,
        maxCarryForward: 0,
        noticeDays: 0,
      },
      {
        id: 3,
        name: "Personal Leave Policy",
        description: "Employees are entitled to 5 days of personal leave per year for emergencies.",
        annualDays: 5,
        carryForward: false,
        maxCarryForward: 0,
        noticeDays: 1,
      },
    ]);
  } catch (error) {
    console.error("Error fetching leave policies:", error);
    res.status(500).json({ error: "Failed to fetch leave policies" });
  }
});

// Get weekly attendance analytics
router.get("/analytics/weekly", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const startOfWeekDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const endOfWeekDate = endOfWeek(today, { weekStartsOn: 1 });

    // Get current week attendance
    const weeklyAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: startOfWeekDate,
      dateTo: endOfWeekDate,
    });

    // Get previous 4 weeks for trends
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(subDays(today, i * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subDays(today, i * 7), { weekStartsOn: 1 });
      
      const weekAttendance = await storage.getAttendanceRecords({
        employeeId: employee.id,
        dateFrom: weekStart,
        dateTo: weekEnd,
      });

      const presentDays = weekAttendance.records.filter(r => r.status === 'present').length;
      const lateDays = weekAttendance.records.filter(r => r.status === 'late').length;
      const totalHours = weekAttendance.records.reduce((sum, r) => sum + parseFloat(r.totalHours || '0'), 0);

      weeks.push({
        week: `Week ${i === 0 ? 'Current' : `${i + 1}`}`,
        present: presentDays,
        late: lateDays,
        absent: 5 - presentDays - lateDays, // Assuming 5 working days
        totalHours: Math.round(totalHours * 100) / 100,
        avgHours: Math.round((totalHours / Math.max(1, presentDays + lateDays)) * 100) / 100,
      });
    }

    res.json({
      currentWeek: weeks[0],
      weeklyTrends: weeks.reverse(),
      dailyBreakdown: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
        const dayRecord = weeklyAttendance.records.find(r => {
          const recordDate = new Date(r.date);
          return recordDate.toLocaleDateString('en-US', { weekday: 'long' }) === day;
        });
        
        return {
          day: day.substring(0, 3),
          status: dayRecord ? dayRecord.status : 'absent',
          hours: dayRecord ? parseFloat(dayRecord.totalHours || '0') : 0,
          checkIn: dayRecord?.checkIn ? format(new Date(dayRecord.checkIn), 'HH:mm') : null,
          checkOut: dayRecord?.checkOut ? format(new Date(dayRecord.checkOut), 'HH:mm') : null,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching weekly analytics:", error);
    res.status(500).json({ error: "Failed to fetch weekly analytics" });
  }
});

// Get monthly attendance analytics
router.get("/analytics/monthly", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    
    // Get last 6 months of data
    const months = [];
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthAttendance = await storage.getAttendanceRecords({
        employeeId: employee.id,
        dateFrom: monthStart,
        dateTo: monthEnd,
      });

      const presentDays = monthAttendance.records.filter(r => r.status === 'present').length;
      const lateDays = monthAttendance.records.filter(r => r.status === 'late').length;
      const totalHours = monthAttendance.records.reduce((sum, r) => sum + parseFloat(r.totalHours || '0'), 0);
      const workingDays = monthAttendance.records.length;

      months.push({
        month: format(monthDate, 'MMM yyyy'),
        present: presentDays,
        late: lateDays,
        absent: Math.max(0, 22 - presentDays - lateDays), // Assuming ~22 working days
        totalHours: Math.round(totalHours * 100) / 100,
        attendanceRate: workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0,
        avgHoursPerDay: workingDays > 0 ? Math.round((totalHours / workingDays) * 100) / 100 : 0,
      });
    }

    res.json({
      monthlyTrends: months.reverse(),
      currentMonth: months[months.length - 1],
    });
  } catch (error) {
    console.error("Error fetching monthly analytics:", error);
    res.status(500).json({ error: "Failed to fetch monthly analytics" });
  }
});

// Get hourly patterns analytics
router.get("/analytics/patterns", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    // Get last 30 days of attendance
    const recentAttendance = await storage.getAttendanceRecords({
      employeeId: employee.id,
      dateFrom: thirtyDaysAgo,
      dateTo: today,
    });

    // Analyze check-in patterns
    const checkInPatterns = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count: 0,
    }));

    const checkOutPatterns = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      count: 0,
    }));

    recentAttendance.records.forEach(record => {
      if (record.checkIn) {
        const checkInHour = new Date(record.checkIn).getHours();
        checkInPatterns[checkInHour].count++;
      }
      if (record.checkOut) {
        const checkOutHour = new Date(record.checkOut).getHours();
        checkOutPatterns[checkOutHour].count++;
      }
    });

    // Performance metrics
    const avgCheckIn = recentAttendance.records
      .filter(r => r.checkIn)
      .reduce((sum, r) => sum + new Date(r.checkIn!).getHours(), 0) / 
      recentAttendance.records.filter(r => r.checkIn).length;

    const avgCheckOut = recentAttendance.records
      .filter(r => r.checkOut)
      .reduce((sum, r) => sum + new Date(r.checkOut!).getHours(), 0) / 
      recentAttendance.records.filter(r => r.checkOut).length;

    res.json({
      checkInPatterns: checkInPatterns.filter(p => p.count > 0),
      checkOutPatterns: checkOutPatterns.filter(p => p.count > 0),
      averageCheckIn: Math.round(avgCheckIn * 100) / 100,
      averageCheckOut: Math.round(avgCheckOut * 100) / 100,
      punctualityScore: Math.round((recentAttendance.records.filter(r => r.status === 'present').length / recentAttendance.records.length) * 100),
    });
  } catch (error) {
    console.error("Error fetching pattern analytics:", error);
    res.status(500).json({ error: "Failed to fetch pattern analytics" });
  }
});

// Upload profile photo
router.post("/profile/photo", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const employee = await storage.getEmployeeByCode(user.username);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const { photo } = photoUploadSchema.parse(req.body);
    
    // Validate the photo is a valid base64 image
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ error: "Invalid image format" });
    }

    // Update employee profile with photo
    await storage.updateEmployee(employee.id, { profilePhoto: photo });

    res.json({ success: true, message: "Profile photo updated successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    console.error("Error uploading profile photo:", error);
    res.status(500).json({ error: "Failed to upload profile photo" });
  }
});

export default router;