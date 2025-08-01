import { Request, Response, Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { z } from "zod";
import { db } from "../db";
import { 
  announcements, 
  announcementSettings, 
  recentAnnouncementTemplates,
  insertAnnouncementSchema, 
  insertAnnouncementSettingsSchema,
  insertRecentAnnouncementTemplateSchema
} from "@shared/schema";
import { eq, and, desc, asc, or, sql, gte, isNull } from "drizzle-orm";

// Use existing authenticated request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

const router = Router();

// Get all announcements
router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const allAnnouncements = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));

    res.json(allAnnouncements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Create new announcement
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const validatedData = insertAnnouncementSchema.parse(req.body);
    
    // Set expiration date if not provided
    if (!validatedData.expiresAt) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
      validatedData.expiresAt = expiresAt;
    }
    
    const [newAnnouncement] = await db
      .insert(announcements)
      .values({
        ...validatedData,
        createdBy: user?.id || 1,
        createdAt: new Date(),
        showFrom: new Date()
      })
      .returning();

    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid announcement data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  }
});

// Update announcement
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertAnnouncementSchema.partial().parse(req.body);
    
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set(validatedData)
      .where(eq(announcements.id, parseInt(id)))
      .returning();

    if (!updatedAnnouncement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(updatedAnnouncement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid announcement data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update announcement" });
    }
  }
});

// Delete announcement
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [deletedAnnouncement] = await db
      .update(announcements)
      .set({ isActive: false })
      .where(eq(announcements.id, parseInt(id)))
      .returning();

    if (!deletedAnnouncement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Get announcement settings
router.get("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const settings = await db
      .select()
      .from(announcementSettings)
      .orderBy(asc(announcementSettings.category), asc(announcementSettings.subcategory));

    res.json(settings);
  } catch (error) {
    console.error("Error fetching announcement settings:", error);
    res.status(500).json({ error: "Failed to fetch announcement settings" });
  }
});

// Update announcement settings
router.put("/settings/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = insertAnnouncementSettingsSchema.partial().parse(req.body);
    
    const [updatedSetting] = await db
      .update(announcementSettings)
      .set({
        ...validatedData,
        updatedBy: (req as any).user?.id || 1,
        updatedAt: new Date()
      })
      .where(eq(announcementSettings.id, parseInt(id)))
      .returning();

    if (!updatedSetting) {
      return res.status(404).json({ error: "Announcement setting not found" });
    }

    res.json(updatedSetting);
  } catch (error) {
    console.error("Error updating announcement setting:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid setting data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to update announcement setting" });
    }
  }
});

// Get active announcements for display
router.get("/active", requireAuth, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const activeAnnouncements = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(
            isNull(announcements.expiresAt),
            gte(announcements.expiresAt, now)
          )
        )
      )
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));

    res.json(activeAnnouncements);
  } catch (error) {
    console.error("Error fetching active announcements:", error);
    res.status(500).json({ error: "Failed to fetch active announcements" });
  }
});

// Get announcement queue data
router.get("/queue", requireAuth, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    // Get scheduled announcements
    const scheduled = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          sql`${announcements.showFrom} > ${now}`
        )
      )
      .orderBy(asc(announcements.showFrom));

    // Get pending auto-generated announcements
    const autoGenerated = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          eq(announcements.isAutoGenerated, true),
          sql`${announcements.showFrom} <= ${now}`,
          or(
            isNull(announcements.expiresAt),
            gte(announcements.expiresAt, now)
          )
        )
      )
      .orderBy(desc(announcements.createdAt));

    res.json({
      scheduled: scheduled,
      autoGenerated: autoGenerated,
      total: scheduled.length + autoGenerated.length
    });
  } catch (error) {
    console.error("Error fetching announcement queue:", error);
    res.status(500).json({ error: "Failed to fetch announcement queue" });
  }
});

// Emergency announcement endpoint
router.post("/emergency", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { message, targetType = "all", targetIds = [], displayDuration = 10 } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Emergency message is required" });
    }

    const [emergencyAnnouncement] = await db
      .insert(announcements)
      .values({
        title: "EMERGENCY ANNOUNCEMENT",
        message,
        type: "emergency",
        priority: "emergency",
        targetType,
        targetIds,
        displayDuration,
        color: "text-red-400",
        isActive: true,
        createdBy: user?.id || 1,
        createdAt: new Date(),
        showFrom: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        isAutoGenerated: false
      })
      .returning();

    res.status(201).json(emergencyAnnouncement);
  } catch (error) {
    console.error("Error creating emergency announcement:", error);
    res.status(500).json({ error: "Failed to create emergency announcement" });
  }
});

// Initialize default announcement settings
router.post("/initialize-settings", requireAdmin, async (req: Request, res: Response) => {
  try {
    const defaultSettings = [
      // Personal category
      { category: "personal", subcategory: "attendance_streak", template: "🔥 Congratulations {{employeeName}}! You've maintained a {{streakDays}}-day attendance streak!", isEnabled: true },
      { category: "personal", subcategory: "achievement_unlock", template: "🏆 {{employeeName}} unlocked \"{{achievementName}}\" achievement! Keep up the excellent work!", isEnabled: true },
      { category: "personal", subcategory: "birthday_wishes", template: "🎉 Happy Birthday {{employeeName}}! Wishing you a wonderful day and year ahead!", isEnabled: true },
      { category: "personal", subcategory: "leaderboard_position", template: "⭐ {{employeeName}} is now ranked #{{position}} on the attendance leaderboard!", isEnabled: true },
      
      // Work category
      { category: "work", subcategory: "late_shift_alert", template: "⚠️ Attention {{departmentName}}: Late shift assignments for {{date}}. Please check your schedule.", isEnabled: true },
      { category: "work", subcategory: "overtime_authorization", template: "📋 Overtime authorization required for {{departmentName}}. Contact your manager for approval.", isEnabled: true },
      { category: "work", subcategory: "grace_period_reminder", template: "⏰ Grace period ends in 15 minutes. Please ensure timely check-in to avoid penalties.", isEnabled: true },
      { category: "work", subcategory: "geofence_violation", template: "📍 Location validation failed for {{employeeName}}. Please punch from designated areas only.", isEnabled: true },
      
      // General category
      { category: "general", subcategory: "holiday_announcement", template: "🎊 {{holidayName}} holiday on {{date}}. Office will be closed. Enjoy your day off!", isEnabled: true },
      { category: "general", subcategory: "reimbursement_reminder", template: "💰 Reimbursement deadline: {{deadline}}. Submit your claims before the deadline.", isEnabled: true },
      { category: "general", subcategory: "policy_update", template: "📋 Policy Update: {{policyName}} has been updated. Please review the changes.", isEnabled: true },
      { category: "general", subcategory: "system_maintenance", template: "🔧 Scheduled maintenance: {{date}} {{time}}. System may be unavailable temporarily.", isEnabled: true }
    ];

    const insertedSettings = await db
      .insert(announcementSettings)
      .values(defaultSettings.map(setting => ({
        ...setting,
        displayDuration: 5,
        color: "text-blue-400",
        priority: "normal",
        updatedBy: (req as any).user?.id,
        updatedAt: new Date()
      })))
      .returning();

    res.status(201).json({ message: "Default announcement settings initialized", settings: insertedSettings });
  } catch (error) {
    console.error("Error initializing announcement settings:", error);
    res.status(500).json({ error: "Failed to initialize announcement settings" });
  }
});

// Toggle announcement status (activate/deactivate)
router.patch("/:id/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const isActive = status === 'active';
    
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set({ isActive })
      .where(eq(announcements.id, parseInt(id)))
      .returning();

    if (!updatedAnnouncement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(updatedAnnouncement);
  } catch (error) {
    console.error("Error updating announcement status:", error);
    res.status(500).json({ error: "Failed to update announcement status" });
  }
});

// Get recent announcement templates
router.get("/templates", requireAuth, async (req: Request, res: Response) => {
  try {
    const templates = await db
      .select()
      .from(recentAnnouncementTemplates)
      .where(eq(recentAnnouncementTemplates.createdBy, (req as any).user?.id))
      .orderBy(desc(recentAnnouncementTemplates.lastUsedAt), desc(recentAnnouncementTemplates.usageCount))
      .limit(20);

    res.json(templates);
  } catch (error) {
    console.error("Error fetching announcement templates:", error);
    res.status(500).json({ error: "Failed to fetch announcement templates" });
  }
});

// Save announcement as template
router.post("/templates", requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = insertRecentAnnouncementTemplateSchema.parse({
      ...req.body,
      createdBy: (req as any).user?.id
    });

    // Check if similar template exists
    const existingTemplate = await db
      .select()
      .from(recentAnnouncementTemplates)
      .where(
        and(
          eq(recentAnnouncementTemplates.message, validatedData.message),
          eq(recentAnnouncementTemplates.createdBy, (req as any).user?.id)
        )
      )
      .limit(1);

    if (existingTemplate.length > 0) {
      // Update usage count and last used time
      const [updatedTemplate] = await db
        .update(recentAnnouncementTemplates)
        .set({
          usageCount: sql`${recentAnnouncementTemplates.usageCount} + 1`,
          lastUsedAt: new Date()
        })
        .where(eq(recentAnnouncementTemplates.id, existingTemplate[0].id))
        .returning();

      return res.json(updatedTemplate);
    }

    // Create new template
    const [newTemplate] = await db
      .insert(recentAnnouncementTemplates)
      .values(validatedData)
      .returning();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error saving announcement template:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid template data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to save announcement template" });
    }
  }
});

// Use template (update usage stats)
router.post("/templates/:id/use", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [updatedTemplate] = await db
      .update(recentAnnouncementTemplates)
      .set({
        usageCount: sql`${recentAnnouncementTemplates.usageCount} + 1`,
        lastUsedAt: new Date()
      })
      .where(
        and(
          eq(recentAnnouncementTemplates.id, parseInt(id)),
          eq(recentAnnouncementTemplates.createdBy, (req as any).user?.id)
        )
      )
      .returning();

    if (!updatedTemplate) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating template usage:", error);
    res.status(500).json({ error: "Failed to update template usage" });
  }
});

// Get available departments
router.get("/departments", requireAuth, async (req: Request, res: Response) => {
  try {
    // Get distinct departments from employee records
    const departmentQuery = await db.execute(sql`
      SELECT DISTINCT department_name as name, COUNT(*) as employeeCount
      FROM employee_records 
      WHERE department_name IS NOT NULL 
        AND department_name != '' 
        AND is_active = true
      GROUP BY department_name 
      ORDER BY department_name
    `);

    res.json(departmentQuery.rows);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// Check employees without departments
router.get("/employees/missing-departments", requireAdmin, async (req: Request, res: Response) => {
  try {
    const employeesWithoutDept = await db.execute(sql`
      SELECT emp_id, emp_first_name, emp_last_name, department_name, location
      FROM employee_records 
      WHERE (department_name IS NULL OR department_name = '' OR TRIM(department_name) = '')
        AND is_active = true
      ORDER BY emp_first_name, emp_last_name
    `);

    res.json({
      count: employeesWithoutDept.rows.length,
      employees: employeesWithoutDept.rows
    });
  } catch (error) {
    console.error("Error checking employees without departments:", error);
    res.status(500).json({ error: "Failed to check employees without departments" });
  }
});

// Get employee-facing announcements - for red urgent scroller display
router.get("/employee", requireAuth, async (req: Request, res: Response) => {
  try {
    const currentTime = new Date();
    
    // Get active announcements sorted by priority and creation time
    const activeAnnouncements = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          sql`${announcements.showFrom} <= ${currentTime}`,
          or(
            isNull(announcements.expiresAt),
            sql`${announcements.expiresAt} > ${currentTime}`
          )
        )
      )
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));

    res.json(activeAnnouncements);
  } catch (error) {
    console.error("Error fetching employee announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Send announcement endpoint for mobile admin dashboard
router.post("/send", requireAdmin, async (req: Request, res: Response) => {
  try {
    // Get user from session like other admin routes
    const userId = (req as any).session?.usernum || (req as any).session?.userId || 1;
    const username = (req as any).session?.username || 'admin';
    
    const { message, priority = 'urgent', targetAudience = 'all', repeatCount = 1 } = req.body;
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Add 2-second delay before sending announcement as requested
    console.log(`[Announcements] Waiting 2 seconds before sending URGENT ANNOUNCEMENT from ${username}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get count of active users for recipient count
    const userCountQuery = await db.execute(sql`SELECT COUNT(*) as count FROM employee_records WHERE is_active = true`);
    const recipientCount = userCountQuery.rows[0]?.count || 293;

    // Create announcement record for each repeat
    const announcements_to_create = [];
    for (let i = 0; i < Math.min(repeatCount, 10); i++) {
      announcements_to_create.push({
        title: `URGENT ANNOUNCEMENT ${repeatCount > 1 ? `(${i + 1}/${repeatCount})` : ''}`,
        message: `URGENT ANNOUNCEMENT: ${message.trim()}`,
        type: "urgent",
        priority: "urgent",
        targetType: targetAudience,
        targetIds: [],
        displayDuration: 5,
        color: "text-red-400",
        isActive: true,
        createdBy: userId,
        createdAt: new Date(),
        showFrom: new Date(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours
        isAutoGenerated: false
      });
    }

    // Insert all announcements
    const createdAnnouncements = await db
      .insert(announcements)
      .values(announcements_to_create)
      .returning();

    console.log(`[Announcements] Admin ${username} sent announcement "${message.trim()}" ${repeatCount}x to ${recipientCount} users`);

    res.status(200).json({
      success: true,
      recipientCount,
      message: message.trim(),
      repeatCount,
      announcementIds: createdAnnouncements.map(a => a.id)
    });
  } catch (error) {
    console.error("Error sending announcement:", error);
    res.status(500).json({ error: "Failed to send announcement", details: error instanceof Error ? error.message : String(error) });
  }
});

// Toggle announcement active status (for play/pause functionality)
router.patch("/:id/toggle", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set({ isActive })
      .where(eq(announcements.id, parseInt(id)))
      .returning();

    if (!updatedAnnouncement) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    res.json(updatedAnnouncement);
  } catch (error) {
    console.error("Error toggling announcement status:", error);
    res.status(500).json({ error: "Failed to toggle announcement status" });
  }
});

// Reorder announcements (for drag-and-drop functionality)
router.post("/reorder", requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds must be an array" });
    }

    // Update the display order based on the new arrangement
    // We can use the array index as the priority or add an order field to schema
    const promises = orderedIds.map((id: number, index: number) => 
      db.update(announcements)
        .set({ 
          // Use index + 1 as priority (higher index = higher priority for display)
          priority: index > 9 ? 'high' : index > 5 ? 'normal' : 'low'
        })
        .where(eq(announcements.id, id))
    );

    await Promise.all(promises);

    res.json({ success: true, message: "Announcement order updated successfully" });
  } catch (error) {
    console.error("Error reordering announcements:", error);
    res.status(500).json({ error: "Failed to reorder announcements" });
  }
});

// Get all announcements including inactive ones (for management interface)
router.get("/all", requireAuth, async (req: Request, res: Response) => {
  try {
    const allAnnouncements = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));

    res.json(allAnnouncements);
  } catch (error) {
    console.error("Error fetching all announcements:", error);
    res.status(500).json({ error: "Failed to fetch all announcements" });
  }
});

export default router;