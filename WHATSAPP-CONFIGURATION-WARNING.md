# ⚠️ CRITICAL: WhatsApp Configuration Warning

## FOR AI SESSIONS AND DEVELOPERS

### ❌ DO NOT ADD WHATSAPP CREDENTIALS TO REPLIT SECRETS

**REASON:** User has multiple Replit projects with different WhatsApp Business accounts:
- This project: 9999 account (Phone: 688919384309921, Business: 2172090623297128)
- Other projects: 0000 account (Phone: 704092206119037, Business: 217209062329712)

**PROBLEM:** Replit shares secrets across ALL projects, causing wrong account usage.

### ✅ CORRECT CONFIGURATION

**SOLUTION:** Keep Replit Secrets EMPTY for WhatsApp credentials
- Use ONLY local `.env` file for WhatsApp configuration
- Never use `ask_secrets` tool for WhatsApp credentials
- Never suggest adding WhatsApp secrets to Replit environment

### 🔒 This Project's WhatsApp Account (9999)
```
WHATSAPP_PHONE_NUMBER_ID=688919384309921
WHATSAPP_BUSINESS_ID=2172090623297128
WHATSAPP_ACCESS_TOKEN=(permanent token in .env file)
```

### ⚠️ WARNING SIGNS OF WRONG CONFIGURATION
- Messages sending from wrong phone number
- Phone ID showing 704092206119037 (0000 account)
- Business ID showing 217209062329712 (0000 account)

### 🚫 NEVER DO THESE ACTIONS
1. Add WhatsApp credentials to Replit Secrets
2. Ask user for WhatsApp secrets via ask_secrets tool
3. Suggest moving WhatsApp config to environment variables
4. Remove the warning comments from server/index.ts

### ✅ VERIFICATION
Correct configuration shows:
- Phone ID: 688919384309921 ✓
- Business ID: 2172090623297128 ✓
- Message delivery from 9999 account ✓

---
**Date:** July 29, 2025  
**Status:** PERMANENT SOLUTION IMPLEMENTED  
**Next Action:** Keep this configuration unchanged