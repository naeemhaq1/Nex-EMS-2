import { Router } from "express";
import { storage } from "../storage";
import { insertBadgeSchema } from "@shared/schema";
import { z } from "zod";
import { badgeService } from "../services/badgeService";

export const gamificationRouter = Router();

// Get all badges
gamificationRouter.get("/badges", async (req, res) => {
  try {
    const { category, isActive } = req.query;
    
    const badges = await storage.getBadges({
      category: category as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    
    res.json(badges);
  } catch (error: any) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// Get specific badge
gamificationRouter.get("/badges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const badge = await storage.getBadge(id);
    
    if (!badge) {
      return res.status(404).json({ error: "Badge not found" });
    }
    
    res.json(badge);
  } catch (error: any) {
    console.error('Error fetching badge:', error);
    res.status(500).json({ error: "Failed to fetch badge" });
  }
});

// Create badge
gamificationRouter.post("/badges", async (req, res) => {
  try {
    const badge = insertBadgeSchema.parse(req.body);
    const created = await storage.createBadge(badge);
    res.json(created);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid badge data", details: error.errors });
    }
    console.error('Error creating badge:', error);
    res.status(500).json({ error: "Failed to create badge" });
  }
});

// Update badge
gamificationRouter.patch("/badges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const badge = insertBadgeSchema.partial().parse(req.body);
    const updated = await storage.updateBadge(id, badge);
    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid badge data", details: error.errors });
    }
    console.error('Error updating badge:', error);
    res.status(500).json({ error: "Failed to update badge" });
  }
});

// Delete badge
gamificationRouter.delete("/badges/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteBadge(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting badge:', error);
    res.status(500).json({ error: "Failed to delete badge" });
  }
});

// Get employee badges
gamificationRouter.get("/employees/:employeeId/badges", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const badges = await storage.getEmployeeBadges(employeeId);
    res.json(badges);
  } catch (error: any) {
    console.error('Error fetching employee badges:', error);
    res.status(500).json({ error: "Failed to fetch employee badges" });
  }
});

// Award badge to employee
gamificationRouter.post("/employees/:employeeId/badges/:badgeId", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const badgeId = parseInt(req.params.badgeId);
    
    const awarded = await storage.awardBadge(employeeId, badgeId);
    
    // Create gamification event
    await storage.createGamificationEvent({
      employeeId,
      eventType: 'badge_earned',
      points: 50, // Default points for earning a badge
      description: `Earned badge #${badgeId}`,
      metadata: { badgeId }
    });
    
    res.json(awarded);
  } catch (error: any) {
    console.error('Error awarding badge:', error);
    res.status(500).json({ error: "Failed to award badge" });
  }
});

// Get employee streak
gamificationRouter.get("/employees/:employeeId/streak", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const streak = await storage.getEmployeeStreak(employeeId);
    res.json(streak || { 
      employeeId,
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
      level: 1,
      lastCheckIn: null
    });
  } catch (error: any) {
    console.error('Error fetching employee streak:', error);
    res.status(500).json({ error: "Failed to fetch employee streak" });
  }
});

// Get gamification events
gamificationRouter.get("/events", async (req, res) => {
  try {
    const { employeeId, eventType, limit } = req.query;
    
    const events = await storage.getGamificationEvents({
      employeeId: employeeId ? parseInt(employeeId as string) : undefined,
      eventType: eventType as string,
      limit: limit ? parseInt(limit as string) : 50
    });
    
    res.json(events);
  } catch (error: any) {
    console.error('Error fetching gamification events:', error);
    res.status(500).json({ error: "Failed to fetch gamification events" });
  }
});

// Get leaderboard
gamificationRouter.get("/leaderboard", async (req, res) => {
  try {
    const { limit } = req.query;
    const leaderboard = await storage.getLeaderboard('monthly');
    res.json(leaderboard);
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// Get top performers
gamificationRouter.get("/top-performers", async (req, res) => {
  try {
    const { limit } = req.query;
    const topPerformers = await storage.getTopPerformers(
      limit ? parseInt(limit as string) : 100
    );
    res.json(topPerformers);
  } catch (error: any) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({ error: "Failed to fetch top performers" });
  }
});

// Initialize default badges
gamificationRouter.post("/initialize-badges", async (req, res) => {
  try {
    await badgeService.initializeDefaultBadges();
    res.json({ success: true, message: "Default badges initialized" });
  } catch (error: any) {
    console.error('Error initializing badges:', error);
    res.status(500).json({ error: "Failed to initialize badges" });
  }
});

// Process badges for all employees
gamificationRouter.post("/process-badges", async (req, res) => {
  try {
    await badgeService.processAllEmployeesBadges();
    res.json({ success: true, message: "Badge processing completed" });
  } catch (error: any) {
    console.error('Error processing badges:', error);
    res.status(500).json({ error: "Failed to process badges" });
  }
});

// Process badges for specific employee
gamificationRouter.post("/employees/:employeeId/process-badges", async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    await badgeService.processEmployeeBadges(employeeId);
    res.json({ success: true, message: "Employee badges processed" });
  } catch (error: any) {
    console.error('Error processing employee badges:', error);
    res.status(500).json({ error: "Failed to process employee badges" });
  }
});

// Process attendance for gamification
gamificationRouter.post("/process-attendance", async (req, res) => {
  try {
    const { employeeId, checkIn, isOnTime } = req.body;
    
    if (!employeeId || !checkIn) {
      return res.status(400).json({ error: "Employee ID and check-in time required" });
    }
    
    // Get or create streak
    let streak = await storage.getEmployeeStreak(employeeId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!streak) {
      streak = await storage.createEmployeeStreak({
        employeeId,
        currentStreak: 1,
        longestStreak: 1,
        totalPoints: 10,
        level: 1,
        lastCheckIn: new Date(checkIn)
      });
    } else {
      // Check if this is a consecutive day
      const lastCheckIn = new Date(streak.lastCheckIn);
      lastCheckIn.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      
      let newStreak = streak.currentStreak;
      let points = 10; // Base points for attendance
      
      if (daysDiff === 1) {
        // Consecutive day
        newStreak = streak.currentStreak + 1;
        points += Math.min(newStreak * 5, 50); // Bonus points for streak
      } else if (daysDiff > 1) {
        // Streak broken
        newStreak = 1;
      }
      
      // On-time bonus
      if (isOnTime) {
        points += 5;
      }
      
      const longestStreak = Math.max(newStreak, streak.longestStreak);
      const totalPoints = streak.totalPoints + points;
      const level = Math.floor(totalPoints / 1000) + 1; // Level up every 1000 points
      
      await storage.updateEmployeeStreak(employeeId, {
        currentStreak: newStreak,
        longestStreak,
        totalPoints,
        level,
        lastCheckIn: new Date(checkIn)
      });
      
      // Create gamification event
      await storage.createGamificationEvent({
        employeeId,
        eventType: 'attendance_points',
        points,
        description: `Check-in ${isOnTime ? 'on time' : 'late'}. Streak: ${newStreak} days`,
        metadata: { 
          streak: newStreak,
          onTime: isOnTime
        }
      });
      
      // Check for badge achievements
      if (newStreak === 7) {
        await storage.createGamificationEvent({
          employeeId,
          eventType: 'achievement_unlocked',
          points: 50,
          description: 'Weekly Warrior - 7 day streak!',
          metadata: { achievement: 'weekly_warrior' }
        });
      } else if (newStreak === 30) {
        await storage.createGamificationEvent({
          employeeId,
          eventType: 'achievement_unlocked',
          points: 200,
          description: 'Monthly Master - 30 day streak!',
          metadata: { achievement: 'monthly_master' }
        });
      }
    }
    
    res.json({ success: true, streak });
  } catch (error: any) {
    console.error('Error processing attendance gamification:', error);
    res.status(500).json({ error: "Failed to process attendance gamification" });
  }
});