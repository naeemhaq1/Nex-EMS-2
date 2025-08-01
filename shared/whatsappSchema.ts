import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, uuid, serial } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enhanced WhatsApp Contacts table with 3-tier contact system
export const whatsappContacts = pgTable('whatsapp_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  status: varchar('status', { length: 255 }), // WhatsApp status message
  about: text('about'), // About section
  
  // Contact Type Classification (3 types as requested)
  contactType: varchar('contact_type', { length: 20 }).notNull().default('employees'), 
  // 'employees' = shared employee contacts
  // 'contacts_public' = shared public contacts  
  // 'contacts_private' = isolated private contacts per admin
  
  // Employee Integration
  employeeId: varchar('employee_id', { length: 50 }),
  employeeCode: varchar('employee_code', { length: 50 }),
  department: varchar('department', { length: 100 }),
  designation: varchar('designation', { length: 100 }),
  
  // Admin Isolation for Private Contacts
  addedBy: varchar('added_by', { length: 50 }).notNull(), // Admin username who added
  visibleToAdmins: jsonb('visible_to_admins').$type<string[]>().default([]), // Array of admin usernames for private contacts
  
  // Contact Metadata
  tags: jsonb('tags').$type<string[]>().default([]),
  notes: text('notes'),
  customFields: jsonb('custom_fields'), // Additional custom data
  
  // WhatsApp Status
  isActive: boolean('is_active').default(true),
  isBlocked: boolean('is_blocked').default(false),
  isPinned: boolean('is_pinned').default(false),
  isFavorite: boolean('is_favorite').default(false),
  
  // Activity Tracking
  lastSeen: timestamp('last_seen'),
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Enhanced WhatsApp Groups table with 3-tier group system
export const whatsappGroups = pgTable('whatsapp_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: varchar('group_id', { length: 100 }).unique(), // WhatsApp group ID from API
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  
  // Group Type Classification (3 types as requested)
  groupType: varchar('group_type', { length: 50 }).notNull(), 
  // 'departments' = department-based groups (shared/public)
  // 'dgroups' = department groups/custom groups (shared/public)  
  // 'whatsapp_groups' = WhatsApp groups created within console (shared/public)
  
  // Department Integration
  department: varchar('department', { length: 100 }), // For department groups
  departmentId: integer('department_id'), // Reference to department table
  
  // Group Management
  createdBy: varchar('created_by', { length: 50 }).notNull(),
  adminList: jsonb('admin_list').$type<string[]>().default([]), // Group admins
  memberList: jsonb('member_list').$type<string[]>().default([]), // Group members (phone numbers)
  memberCount: integer('member_count').default(0),
  
  // Group Settings (WhatsApp-like)
  settings: jsonb('settings').$type<{
    allowMemberAdd?: boolean;
    allowMemberRemove?: boolean;
    onlyAdminMessage?: boolean;
    disappearingMessages?: boolean;
    disappearingTime?: number; // in days
    groupInviteLink?: string;
    isAnnouncement?: boolean;
  }>().default({}),
  
  // Status
  isActive: boolean('is_active').default(true),
  isPinned: boolean('is_pinned').default(false),
  isMuted: boolean('is_muted').default(false),
  
  // Activity
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// WhatsApp Group Members table  
export const whatsappGroupMembers = pgTable('whatsapp_group_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => whatsappGroups.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => whatsappContacts.id, { onDelete: 'cascade' }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  role: varchar('role', { length: 20 }).default('member'), // 'admin', 'member'
  joinedAt: timestamp('joined_at').defaultNow(),
  addedBy: varchar('added_by', { length: 50 })
});

// Enhanced WhatsApp Messages table with WhatsApp-identical features
export const whatsappMessages = pgTable('whatsapp_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: varchar('message_id', { length: 100 }).unique(), // WhatsApp API message ID
  conversationId: varchar('conversation_id', { length: 100 }).notNull(), // phone number or group ID
  
  // Message Participants
  fromNumber: varchar('from_number', { length: 20 }),
  toNumber: varchar('to_number', { length: 20 }),
  groupId: uuid('group_id').references(() => whatsappGroups.id),
  contactId: uuid('contact_id').references(() => whatsappContacts.id),
  
  // Message Content (WhatsApp-like message types)
  messageType: varchar('message_type', { length: 20 }).notNull(), 
  // 'text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'poll'
  content: text('content').notNull(),
  mediaUrl: text('media_url'),
  mediaCaption: text('media_caption'),
  mediaMimeType: varchar('media_mime_type', { length: 100 }),
  mediaSize: integer('media_size'), // in bytes
  mediaDuration: integer('media_duration'), // for audio/video in seconds
  
  // WhatsApp-specific Features
  isQuoted: boolean('is_quoted').default(false),
  quotedMessageId: uuid('quoted_message_id'),
  isForwarded: boolean('is_forwarded').default(false),
  forwardCount: integer('forward_count').default(0),
  isStarred: boolean('is_starred').default(false),
  
  // Message Status (WhatsApp-identical)
  status: varchar('status', { length: 20 }).default('sending'), 
  // 'sending', 'sent', 'delivered', 'read', 'failed'
  direction: varchar('direction', { length: 10 }).notNull(), // 'incoming', 'outgoing'
  
  // Admin Context
  sentBy: varchar('sent_by', { length: 50 }), // Admin username who sent
  visibleToAdmins: jsonb('visible_to_admins').$type<string[]>().default([]),
  
  // Error Handling
  errorDetails: text('error_details'),
  retryCount: integer('retry_count').default(0),
  
  // Timestamps (WhatsApp-precise)
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  failedAt: timestamp('failed_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// WhatsApp Message Queue table
export const whatsappMessageQueue = pgTable('whatsapp_message_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: uuid('message_id').notNull().references(() => whatsappMessages.id, { onDelete: 'cascade' }),
  priority: integer('priority').default(1), // 1 = high, 2 = medium, 3 = low
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  nextRetryAt: timestamp('next_retry_at'),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  errorDetails: text('error_details'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// WhatsApp API Status table
export const whatsappApiStatus = pgTable('whatsapp_api_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'healthy', 'degraded', 'down'
  responseTime: integer('response_time'), // in milliseconds
  lastChecked: timestamp('last_checked').defaultNow(),
  errorCount: integer('error_count').default(0),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow()
});

// Insert schemas
export const insertWhatsappContact = createInsertSchema(whatsappContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWhatsappGroup = createInsertSchema(whatsappGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWhatsappMessage = createInsertSchema(whatsappMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWhatsappMessageQueue = createInsertSchema(whatsappMessageQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type WhatsappContact = typeof whatsappContacts.$inferSelect;
export type InsertWhatsappContact = z.infer<typeof insertWhatsappContact>;

export type WhatsappGroup = typeof whatsappGroups.$inferSelect;
export type InsertWhatsappGroup = z.infer<typeof insertWhatsappGroup>;

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessage>;

export type WhatsappMessageQueue = typeof whatsappMessageQueue.$inferSelect;
export type InsertWhatsappMessageQueue = z.infer<typeof insertWhatsappMessageQueue>;

export type WhatsappApiStatus = typeof whatsappApiStatus.$inferSelect;

// WhatsApp Gateway API Keys table (for external app integration)
export const whatsappApiKeys = pgTable('whatsapp_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyName: varchar('key_name', { length: 255 }).notNull(),
  hashedKey: varchar('hashed_key', { length: 255 }).notNull().unique(), // SHA256 hash of API key
  permissions: jsonb('permissions').$type<string[]>().default([]), // Array of permissions like ['send_message', 'read_contacts']
  rateLimit: integer('rate_limit').default(100), // Messages per hour
  isActive: boolean('is_active').default(true),
  createdBy: varchar('created_by', { length: 50 }).notNull(), // Admin who created the key
  lastUsed: timestamp('last_used'),
  usageCount: integer('usage_count').default(0),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// WhatsApp Gateway Logs table (for API usage tracking)
export const whatsappGatewayLogs = pgTable('whatsapp_gateway_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  apiKeyId: uuid('api_key_id').notNull().references(() => whatsappApiKeys.id, { onDelete: 'cascade' }),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(), // GET, POST, etc.
  requestData: jsonb('request_data'),
  responseData: jsonb('response_data'),
  success: boolean('success').default(false),
  error: text('error'),
  duration: integer('duration'), // Response time in milliseconds
  timestamp: timestamp('timestamp').defaultNow()
});

// WhatsApp Diagnostics table (for system health monitoring)
export const whatsappDiagnostics = pgTable('whatsapp_diagnostics', {
  id: uuid('id').primaryKey().defaultRandom(),
  testName: varchar('test_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'passed', 'failed', 'warning'
  message: text('message').notNull(),
  details: jsonb('details').default({}),
  duration: integer('duration'), // Test duration in milliseconds
  recommendations: jsonb('recommendations').$type<string[]>().default([]),
  timestamp: timestamp('timestamp').defaultNow()
});

// WhatsApp Chatbot Configuration table (for future chatbot integration)
export const whatsappChatbotConfig = pgTable('whatsapp_chatbot_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  botName: varchar('bot_name', { length: 255 }).notNull(),
  isEnabled: boolean('is_enabled').default(false),
  webhookUrl: text('webhook_url'),
  aiProvider: varchar('ai_provider', { length: 50 }), // 'openai', 'gemini', 'claude', etc.
  apiKey: text('api_key'), // Encrypted API key for AI provider
  model: varchar('model', { length: 100 }), // AI model name
  systemPrompt: text('system_prompt'),
  temperature: integer('temperature').default(70), // AI temperature (0-100)
  maxTokens: integer('max_tokens').default(1000),
  autoReply: boolean('auto_reply').default(false),
  triggerKeywords: jsonb('trigger_keywords').$type<string[]>().default([]),
  responseTemplates: jsonb('response_templates').default({}),
  fallbackMessage: text('fallback_message'),
  settings: jsonb('settings').default({}),
  createdBy: varchar('created_by', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// WhatsApp Chatbot Conversations table (for conversation tracking)
export const whatsappChatbotConversations = pgTable('whatsapp_chatbot_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 100 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  contactId: uuid('contact_id').references(() => whatsappContacts.id),
  botConfigId: uuid('bot_config_id').notNull().references(() => whatsappChatbotConfig.id),
  context: jsonb('context').default({}), // Conversation context and history
  messageCount: integer('message_count').default(0),
  isActive: boolean('is_active').default(true),
  lastInteraction: timestamp('last_interaction').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Additional insert schemas for new tables
export const insertWhatsappApiKey = createInsertSchema(whatsappApiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWhatsappGatewayLog = createInsertSchema(whatsappGatewayLogs).omit({
  id: true
});

export const insertWhatsappDiagnostic = createInsertSchema(whatsappDiagnostics).omit({
  id: true
});

export const insertWhatsappChatbotConfig = createInsertSchema(whatsappChatbotConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWhatsappChatbotConversation = createInsertSchema(whatsappChatbotConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Additional types for new tables
export type WhatsappApiKey = typeof whatsappApiKeys.$inferSelect;
export type InsertWhatsappApiKey = z.infer<typeof insertWhatsappApiKey>;

export type WhatsappGatewayLog = typeof whatsappGatewayLogs.$inferSelect;
export type InsertWhatsappGatewayLog = z.infer<typeof insertWhatsappGatewayLog>;

export type WhatsappDiagnostic = typeof whatsappDiagnostics.$inferSelect;
export type InsertWhatsappDiagnostic = z.infer<typeof insertWhatsappDiagnostic>;

export type WhatsappChatbotConfig = typeof whatsappChatbotConfig.$inferSelect;
export type InsertWhatsappChatbotConfig = z.infer<typeof insertWhatsappChatbotConfig>;

export type WhatsappChatbotConversation = typeof whatsappChatbotConversations.$inferSelect;
export type InsertWhatsappChatbotConversation = z.infer<typeof insertWhatsappChatbotConversation>;