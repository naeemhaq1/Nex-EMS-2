import { Router } from 'express';
import { biometricAuthService } from '../services/biometricAuthService';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Get employee biometric data
 */
router.get('/employee/:employeeCode', requireAuth, async (req, res) => {
  try {
    const { employeeCode } = req.params;
    
    if (!employeeCode) {
      return res.status(400).json({ error: 'Employee code is required' });
    }

    const biometricData = await biometricAuthService.getEmployeeBiometricData(employeeCode);
    
    if (!biometricData) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(biometricData);
  } catch (error) {
    console.error('Error getting employee biometric data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all employees with biometric data
 */
router.get('/employees', requireAuth, async (req, res) => {
  try {
    const employees = await biometricAuthService.getAllEmployeesWithBiometrics();
    res.json(employees);
  } catch (error) {
    console.error('Error getting employees with biometrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Enroll employee face template
 */
router.post('/enroll', requireAuth, async (req, res) => {
  try {
    const { employeeCode, faceData } = req.body;
    
    if (!employeeCode || !faceData) {
      return res.status(400).json({ error: 'Employee code and face data are required' });
    }

    const result = await biometricAuthService.enrollFaceTemplate(employeeCode, faceData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error enrolling face template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Authenticate face for remote attendance
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { capturedFaceData, location } = req.body;
    
    if (!capturedFaceData) {
      return res.status(400).json({ error: 'Face data is required' });
    }

    const result = await biometricAuthService.authenticateFace(capturedFaceData, location);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error authenticating face:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process biometric attendance punch
 */
router.post('/attendance', async (req, res) => {
  try {
    const { capturedFaceData, location, punchType } = req.body;
    
    if (!capturedFaceData || !location || !punchType) {
      return res.status(400).json({ 
        error: 'Face data, location, and punch type are required' 
      });
    }

    if (!['in', 'out'].includes(punchType)) {
      return res.status(400).json({ 
        error: 'Punch type must be either "in" or "out"' 
      });
    }

    const result = await biometricAuthService.processBiometricAttendance(
      capturedFaceData, 
      location, 
      punchType
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error processing biometric attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Biometric login
 */
router.post('/login', async (req, res) => {
  try {
    const { capturedFaceData, location } = req.body;
    
    if (!capturedFaceData) {
      return res.status(400).json({ error: 'Face data is required' });
    }

    const result = await biometricAuthService.biometricLogin(capturedFaceData, location);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in biometric login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get biometric authentication statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await biometricAuthService.getBiometricStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting biometric stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;