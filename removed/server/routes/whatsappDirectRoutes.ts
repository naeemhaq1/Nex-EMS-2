import express from 'express';
import { db } from '../db';
import { whatsappContacts, whatsappMessages } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { whatsappService } from '../services/whatsappService';
import { whatsappService } from '../services/whatsappService';

const router = express.Router();

// Add Contact endpoint
router.post('/contacts', async (req, res) => {
  try {
    const { name, phone, department, notes } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Format phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    const formattedPhone = normalizedPhone.startsWith('92') ? normalizedPhone : `92${normalizedPhone.replace(/^0/, '')}`;

    const newContact = await db.insert(whatsappContacts).values({
      name,
      phoneNumber: formattedPhone,
      department: department || 'Unknown',
      notes: notes || null,
      isActive: true,
      createdByUserId: req.user?.id || 1, // Use authenticated user ID
    }).returning();

    res.json({ success: true, contact: newContact[0] });
  } catch (error) {
    console.error('[WhatsApp:5002] Error adding contact:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Phone number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add contact' });
    }
  }
});

// Get Contacts endpoint
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await db.select().from(whatsappContacts)
      .where(eq(whatsappContacts.isActive, true))
      .orderBy(desc(whatsappContacts.createdAt));

    res.json({ contacts });
  } catch (error) {
    console.error('[WhatsApp:5002] Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Send Message endpoint
router.post('/send', async (req, res) => {
  try {
    const { phone, message, contactId } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    // Format phone number
    const normalizedPhone = phone.replace(/\D/g, '');
    const formattedPhone = normalizedPhone.startsWith('92') ? normalizedPhone : `92${normalizedPhone.replace(/^0/, '')}`;

    // Save message to database
    const messageRecord = await db.insert(whatsappMessages).values({
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      toNumber: formattedPhone,
      messageContent: message,
      messageType: 'text',
      messageStatus: 'pending',
      contactId: contactId || null,
      createdByUserId: req.user?.id || 1,
    }).returning();

    // Send through WhatsApp service
    const result = await whatsappService.sendMessage({
      to: formattedPhone,
      type: 'text',
      text: { body: message }
    });

    // Update message record with result
    await db.update(whatsappMessages)
      .set({ 
        messageStatus: result.success ? 'sent' : 'failed',
        sentAt: result.success ? new Date() : null,
        messageId: result.messageId || null
      })
      .where(eq(whatsappMessages.id, messageRecord[0].id));

    res.json({ 
      success: true, 
      messageId: messageRecord[0].messageId,
      status: 'sent'
    });
  } catch (error) {
    console.error('[WhatsApp:5002] Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get Messages endpoint
router.get('/messages', async (req, res) => {
  try {
    const { phone, limit = 50 } = req.query;
    
    let query = db.select().from(whatsappMessages)
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(Number(limit));

    if (phone) {
      const formattedPhone = String(phone).replace(/\D/g, '');
      query = query.where(eq(whatsappMessages.toNumber, formattedPhone));
    }

    const messages = await query;
    res.json({ messages });
  } catch (error) {
    console.error('[WhatsApp:5002] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Status endpoint
router.get('/status', async (req, res) => {
  try {
    const totalContacts = await db.select().from(whatsappContacts).then(rows => rows.length);
    const totalMessages = await db.select().from(whatsappMessages).then(rows => rows.length);
    
    res.json({
      status: 'active',
      totalContacts,
      totalMessages,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[WhatsApp:5002] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export { router as whatsappDirectRoutes };