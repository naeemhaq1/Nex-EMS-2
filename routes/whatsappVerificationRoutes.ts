import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Helper function to get the appropriate access token
function getAccessToken(): string {
  return process.env.WHATSAPP_ACCESS_TOKEN_TEMP || process.env.WHATSAPP_ACCESS_TOKEN || '';
}

// WhatsApp verification endpoints
router.post('/request-verification', async (req, res) => {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = getAccessToken();
    
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing WhatsApp credentials'
      });
    }

    console.log(`[WhatsApp Verification] Requesting SMS verification code for phone ID: ${phoneNumberId}`);

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/request_code`,
      {
        code_method: 'SMS'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[WhatsApp Verification] SMS request response:`, response.data);

    res.json({
      success: true,
      message: 'Verification SMS sent to +92 42 32099999',
      data: response.data
    });

  } catch (error: any) {
    console.error(`[WhatsApp Verification] Error requesting SMS:`, error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error?.response?.data?.error?.message || 'Failed to request verification SMS'
    });
  }
});

router.post('/verify-code', async (req, res) => {
  try {
    const { code } = req.body;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = getAccessToken();
    
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing WhatsApp credentials'
      });
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a 6-digit verification code'
      });
    }

    console.log(`[WhatsApp Verification] Verifying code for phone ID: ${phoneNumberId}`);

    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/verify_code`,
      {
        code: code
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[WhatsApp Verification] Code verification response:`, response.data);

    res.json({
      success: true,
      message: 'Phone number verified successfully!',
      data: response.data
    });

  } catch (error: any) {
    console.error(`[WhatsApp Verification] Error verifying code:`, error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error?.response?.data?.error?.message || 'Failed to verify code'
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = getAccessToken();
    
    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing WhatsApp credentials'
      });
    }

    console.log(`[WhatsApp Verification] Checking status for phone ID: ${phoneNumberId}`);

    const response = await axios.get(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,status,quality_rating,code_verification_status`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log(`[WhatsApp Verification] Status check:`, response.data);

    res.json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.error(`[WhatsApp Verification] Error checking status:`, error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error?.response?.data?.error?.message || 'Failed to check verification status'
    });
  }
});

export { router as whatsappVerificationRoutes };