import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { whatsappMessages, whatsappContacts, employeeRecords } from '@shared/schema';
import { desc, eq, and, or, like } from 'drizzle-orm';
import { whatsappService } from '../services/whatsappService';
// WhatsApp delivery tracker temporarily disabled during service recreation
// import { deliveryTracker } from '../services/whatsappDeliveryTracker';

const router = Router();
// Using singleton service instance

// Get enhanced chats with delivery status
router.get('/chats-enhanced', requireAuth, async (req, res) => {
  try {
    // Get recent conversations grouped by phone number
    const conversations = await db.select({
      id: whatsappMessages.id,
      messageId: whatsappMessages.messageId,
      recipientPhone: whatsappMessages.toNumber,
      messageContent: whatsappMessages.messageContent,
      messageStatus: whatsappMessages.messageStatus,
      messageType: whatsappMessages.messageType,
      sentAt: whatsappMessages.sentAt,
      deliveredAt: whatsappMessages.deliveredAt,
      readAt: whatsappMessages.readAt,
      failedAt: whatsappMessages.failedAt,
      deliveryStatusDetails: whatsappMessages.deliveryStatusDetails,
      errorDetails: whatsappMessages.errorDetails,
      deliveryAttempts: whatsappMessages.deliveryAttempts,
    })
    .from(whatsappMessages)
    .orderBy(desc(whatsappMessages.sentAt))
    .limit(100);

    // Group messages by recipient phone number
    const chatGroups: { [key: string]: any } = {};
    
    for (const msg of conversations) {
      const phone = msg.recipientPhone;
      if (!chatGroups[phone]) {
        // Try to get recipient name from employee records
        const [employee] = await db.select({
          firstName: employeeRecords.firstName,
          lastName: employeeRecords.lastName,
          employeeCode: employeeRecords.employeeCode,
        })
        .from(employeeRecords)
        .where(or(
          eq(employeeRecords.phone, phone),
          eq(employeeRecords.mobile, phone),
          eq(employeeRecords.wanumber, phone)
        ))
        .limit(1);

        chatGroups[phone] = {
          id: `chat-${phone}`,
          recipientPhone: phone,
          recipientName: employee ? `${employee.firstName} ${employee.lastName}` : phone.replace('92', '+92 '),
          employeeCode: employee?.employeeCode || null,
          messages: [],
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          status: 'offline' as const,
        };
      }

      chatGroups[phone].messages.push({
        id: msg.id.toString(),
        messageId: msg.messageId,
        content: msg.messageContent,
        timestamp: msg.sentAt?.toISOString() || new Date().toISOString(),
        status: msg.messageStatus,
        isOutgoing: msg.messageType === 'outgoing',
        recipientName: chatGroups[phone].recipientName,
        recipientPhone: phone,
        deliveryDetails: {
          sentAt: msg.sentAt?.toISOString(),
          deliveredAt: msg.deliveredAt?.toISOString(),
          readAt: msg.readAt?.toISOString(),
          failedAt: msg.failedAt?.toISOString(),
          error: msg.errorDetails,
          deliveryAttempts: msg.deliveryAttempts || 0,
        },
      });
    }

    // Convert to array and set last message info
    const chats = Object.values(chatGroups).map((chat: any) => {
      // Sort messages by timestamp
      chat.messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Set last message info
      if (chat.messages.length > 0) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        chat.lastMessage = lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '');
        chat.lastMessageTime = lastMsg.timestamp;
      }

      return chat;
    });

    // Sort chats by last message time
    chats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    res.json(chats);
  } catch (error) {
    console.error('[WhatsApp Messages] Error fetching enhanced chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Send tracked message with delivery status
router.post('/send-tracked-message', requireAuth, async (req, res) => {
  try {
    const { phoneNumber, message, trackDelivery = true } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    console.log(`[WhatsApp Messages] 📤 Sending tracked message to ${phoneNumber}`);

    // Send message via WhatsApp service
    const result = await whatsappService.sendTextMessage(phoneNumber, message);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        status: 'sent',
        timestamp: new Date().toISOString(),
        trackingEnabled: trackDelivery,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      });
    }
  } catch (error) {
    console.error('[WhatsApp Messages] Error sending tracked message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get delivery details for a specific message
router.get('/delivery-details/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const details = await deliveryTracker.getMessageDeliveryDetails(messageId);
    
    if (!details) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(details);
  } catch (error) {
    console.error('[WhatsApp Messages] Error getting delivery details:', error);
    res.status(500).json({ error: 'Failed to get delivery details' });
  }
});

// Update message delivery status manually (for testing)
router.post('/update-delivery-status', requireAuth, async (req, res) => {
  try {
    const { messageId, status, timestamp } = req.body;

    if (!messageId || !status) {
      return res.status(400).json({ error: 'Message ID and status are required' });
    }

    await deliveryTracker.updateDeliveryStatus({
      messageId,
      status,
      timestamp: timestamp || new Date().toISOString(),
      details: { manual_update: true, updated_by: 'admin' },
    });

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('[WhatsApp Messages] Error updating delivery status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;