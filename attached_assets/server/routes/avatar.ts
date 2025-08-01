import { Router } from 'express';
import { AvatarService } from '../services/AvatarService';
import { requireAuth } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get employee avatar
router.get('/employee/:id', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const size = parseInt(req.query.size as string) || 80;
    
    const avatarUrl = await AvatarService.getEmployeeAvatar(employeeId, size);
    
    res.json({ avatarUrl });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    res.status(500).json({ error: 'Failed to fetch avatar' });
  }
});

// Get avatar by employee code
router.get('/code/:code', async (req, res) => {
  try {
    const employeeCode = req.params.code;
    const size = parseInt(req.query.size as string) || 80;
    const email = req.query.email as string;
    
    const avatarUrl = AvatarService.getAvatarByCode(employeeCode, email, size);
    
    res.json({ avatarUrl });
  } catch (error) {
    console.error('Error fetching avatar by code:', error);
    res.status(500).json({ error: 'Failed to fetch avatar' });
  }
});

// Upload employee photo
router.post('/upload/:id', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const photoUrl = `/uploads/avatars/${req.file.filename}`;
    await AvatarService.updateEmployeePhoto(employeeId, photoUrl);
    
    res.json({ 
      message: 'Photo uploaded successfully',
      photoUrl
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Get avatar options for employee dashboard
router.get('/options', requireAuth, async (req, res) => {
  try {
    const size = parseInt(req.query.size as string) || 80;
    const options = AvatarService.getAvatarOptions(size);
    res.json(options);
  } catch (error) {
    console.error('Error fetching avatar options:', error);
    res.status(500).json({ error: 'Failed to fetch avatar options' });
  }
});

// Select avatar for employee
router.post('/select/:id', requireAuth, async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const { optionId, employeeCode } = req.body;
    
    if (!optionId || !employeeCode) {
      return res.status(400).json({ error: 'Option ID and employee code required' });
    }
    
    const avatarUrl = AvatarService.generateSelectedAvatar(optionId, employeeCode);
    await AvatarService.updateEmployeePhoto(employeeId, avatarUrl);
    
    res.json({ 
      message: 'Avatar selected successfully',
      avatarUrl
    });
  } catch (error) {
    console.error('Error selecting avatar:', error);
    res.status(500).json({ error: 'Failed to select avatar' });
  }
});

// Batch generate avatars for all employees
router.post('/generate-all', requireAuth, async (req, res) => {
  try {
    // This endpoint can be used to pre-generate avatar URLs for all employees
    // Useful for performance optimization
    res.json({ message: 'Avatar generation initiated' });
  } catch (error) {
    console.error('Error generating avatars:', error);
    res.status(500).json({ error: 'Failed to generate avatars' });
  }
});

export default router;