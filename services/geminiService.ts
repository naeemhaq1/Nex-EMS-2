import { GoogleGenAI } from "@google/genai";

interface GeminiConfig {
  apiKey: string;
  model: string;
}

export class GeminiService {
  private genai: GoogleGenAI | null = null;
  private model: string = "gemini-2.5-flash";
  private isAvailable: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        this.genai = new GoogleGenAI({ apiKey });
        this.isAvailable = true;
        console.log('[Gemini AI] Service initialized successfully');
      } catch (error) {
        console.error('[Gemini AI] Initialization failed:', error);
        this.isAvailable = false;
      }
    } else {
      console.log('[Gemini AI] API key not configured, using fallback responses');
      this.isAvailable = false;
    }
  }

  async generateContextualResponse(
    messageText: string, 
    employeeName: string, 
    conversationContext: string,
    lastBotMessage?: string,
    isEmployeeRegistered: boolean = false
  ): Promise<string> {
    try {
      // SECURITY CHECK: AI functionality is ONLY available to registered employees
      if (!isEmployeeRegistered) {
        console.log(`[Gemini AI] ❌ AI request BLOCKED - Employee ${employeeName} is NOT registered`);
        return `Hello ${employeeName}! AI assistance requires WhatsApp registration. Please reply with /Register to unlock AI features.`;
      }

      console.log(`[Gemini AI] ✅ AI request APPROVED - Employee ${employeeName} is registered`);
      
      // Only use AI for complex queries if available
      if (this.isAvailable && this.genai) {
        const prompt = `You are a helpful WhatsApp assistant for Nexlinx company employees.

Employee: ${employeeName}
Current message: "${messageText}"
Context: ${conversationContext}
${lastBotMessage ? `Last bot message: "${lastBotMessage}"` : ''}

Guidelines:
- Keep responses short and professional (max 2-3 sentences)
- Use the employee's name when appropriate
- Be helpful and friendly but concise
- For acknowledgments like "alright", "ok", "thanks" - offer further assistance
- For questions - provide helpful information
- For greetings - respond warmly
- Always end with an offer to help if appropriate

Generate a contextual response:`;

        try {
          const result = await this.genai.models.generateContent({
            model: this.model,
            contents: prompt,
          });
          const text = result.text || "Sorry, I couldn't generate a response right now.";

          console.log(`[Gemini AI] Generated response for ${employeeName}: ${text.substring(0, 50)}...`);
          return text.trim();
        } catch (aiError) {
          console.error('[Gemini AI] API error, using fallback:', aiError);
        }
      }

      // Smart rule-based fallback responses
      console.log(`[Gemini AI] Using fallback response for ${employeeName}`);
      console.log(`[Gemini AI] Processing message: "${messageText}"`);
      const lowerMessage = messageText.toLowerCase().trim();
      console.log(`[Gemini AI] Lower case message: "${lowerMessage}"`);
      
      // Acknowledgments
      if (['alright', 'ok', 'okay', 'thanks', 'thank you', 'got it'].includes(lowerMessage)) {
        return `Great! Is there anything else I can help you with, ${employeeName}?`;
      }
      
      // Help requests
      if (['help', 'assist', 'support'].some(word => lowerMessage.includes(word))) {
        return `Hi ${employeeName}! I can help you with attendance queries, schedule information, or connect you with HR. What do you need?`;
      }
      
      // Schedule queries - THIS IS THE MAIN FIX
      if (['schedule', 'shift', 'work'].some(word => lowerMessage.includes(word))) {
        const scheduleResponse = `Hi ${employeeName}! I don't see a specific schedule assigned to you in the system. Please contact your manager or HR department for your work schedule information.`;
        console.log(`[Gemini AI] SCHEDULE RESPONSE TRIGGERED for: "${lowerMessage}"`);
        console.log(`[Gemini AI] Full schedule response: ${scheduleResponse}`);
        return scheduleResponse;
      }
      
      // Attendance queries
      if (['attendance', 'punch', 'time'].some(word => lowerMessage.includes(word))) {
        return `Hi ${employeeName}! For attendance information, you can check your employee dashboard or contact HR for detailed records.`;
      }
      
      // Payroll queries
      if (['salary', 'pay', 'payroll'].some(word => lowerMessage.includes(word))) {
        return `Hi ${employeeName}! For payroll questions, please contact the HR department or check your employee portal for salary information.`;
      }
      
      // Default fallback
      return `Hello ${employeeName}! How can I assist you today?`;
    } catch (error) {
      console.error('[Gemini AI] Error generating response:', error);
      return `Hello ${employeeName}! How can I assist you today?`;
    }
  }

  /**
   * Determine conversation context from message content
   */
  getConversationContext(messageText: string): string {
    const lowerMessage = messageText.toLowerCase();
    
    if (['alright', 'ok', 'okay', 'thanks', 'thank you', 'got it'].includes(lowerMessage.trim())) {
      return 'acknowledgment_after_registration';
    }
    
    if (['help', 'assist', 'support'].some(word => lowerMessage.includes(word))) {
      return 'help_request';
    }
    
    if (['schedule', 'shift', 'work time', 'duty', 'roster'].some(word => lowerMessage.includes(word))) {
      return 'schedule_query';
    }
    
    if (['attendance', 'punch', 'checkin', 'checkout', 'present', 'absent'].some(word => lowerMessage.includes(word))) {
      return 'attendance_query';
    }
    
    if (['salary', 'pay', 'payroll', 'wage', 'payment'].some(word => lowerMessage.includes(word))) {
      return 'payroll_query';
    }
    
    return 'general_query';
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

export const geminiService = new GeminiService();