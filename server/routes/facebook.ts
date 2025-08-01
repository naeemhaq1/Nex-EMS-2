import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Facebook App Configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";

// Schema for Facebook user data
const facebookUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  picture: z.object({
    data: z.object({
      url: z.string(),
    }),
  }).optional(),
});

// Schema for Facebook access token response
const facebookTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().optional(),
});

// Get Facebook App ID for frontend
router.get("/config", requireAuth, async (req, res) => {
  try {
    res.json({
      appId: FACEBOOK_APP_ID,
      redirectUri: `${req.protocol}://${req.get('host')}/api/facebook/callback`,
    });
  } catch (error) {
    console.error("Error getting Facebook config:", error);
    res.status(500).json({ error: "Failed to get Facebook configuration" });
  }
});

// Get current user's Facebook connection status
router.get("/status", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [user] = await db
      .select({
        facebookId: users.facebookId,
        facebookName: users.facebookName,
        facebookEmail: users.facebookEmail,
        facebookProfilePhoto: users.facebookProfilePhoto,
        facebookLinkedAt: users.facebookLinkedAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isConnected = !!user.facebookId;
    
    res.json({
      isConnected,
      facebookProfile: isConnected ? {
        id: user.facebookId,
        name: user.facebookName,
        email: user.facebookEmail,
        profilePhoto: user.facebookProfilePhoto,
        linkedAt: user.facebookLinkedAt,
      } : null,
    });
  } catch (error) {
    console.error("Error checking Facebook status:", error);
    res.status(500).json({ error: "Failed to check Facebook connection status" });
  }
});

// Link Facebook account
router.post("/link", requireAuth, async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }

    // Verify token with Facebook and get user data
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      return res.status(400).json({ 
        error: "Invalid Facebook access token",
        details: errorData.error?.message 
      });
    }

    const facebookUser = await userResponse.json();
    const validatedUser = facebookUserSchema.parse(facebookUser);

    // Check if this Facebook account is already linked to another user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.facebookId, validatedUser.id));

    if (existingUser.length > 0 && existingUser[0].id !== req.user.id) {
      return res.status(400).json({ 
        error: "This Facebook account is already linked to another user" 
      });
    }

    // Update current user with Facebook data
    await db
      .update(users)
      .set({
        facebookId: validatedUser.id,
        facebookAccessToken: accessToken,
        facebookName: validatedUser.name,
        facebookEmail: validatedUser.email,
        facebookProfilePhoto: validatedUser.picture?.data?.url,
        facebookLinkedAt: new Date(),
      })
      .where(eq(users.id, req.user.id));

    res.json({
      success: true,
      message: "Facebook account linked successfully",
      profile: {
        id: validatedUser.id,
        name: validatedUser.name,
        email: validatedUser.email,
        profilePhoto: validatedUser.picture?.data?.url,
      },
    });
  } catch (error) {
    console.error("Error linking Facebook account:", error);
    res.status(500).json({ error: "Failed to link Facebook account" });
  }
});

// Unlink Facebook account
router.post("/unlink", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    await db
      .update(users)
      .set({
        facebookId: null,
        facebookAccessToken: null,
        facebookName: null,
        facebookEmail: null,
        facebookProfilePhoto: null,
        facebookLinkedAt: null,
      })
      .where(eq(users.id, userId));

    res.json({
      success: true,
      message: "Facebook account unlinked successfully",
    });
  } catch (error) {
    console.error("Error unlinking Facebook account:", error);
    res.status(500).json({ error: "Failed to unlink Facebook account" });
  }
});

export default router;