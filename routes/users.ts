import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireSuperAdmin, requireAdmin } from '../middleware/auth';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';
import bcrypt from 'bcrypt';

const router = Router();

// Get all users (Admin and SuperAdmin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    // Remove password from response
    const safeUsers = users.map(user => ({
      ...user,
      password: undefined
    }));
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new admin user (SuperAdmin only)
router.post('/admin', requireSuperAdmin, async (req, res) => {
  try {
    const { username, password, employeeId } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      role: 'admin',
      employeeId: employeeId || null,
      isActive: true
    });

    // Remove password from response
    const safeUser = {
      ...newUser,
      password: undefined
    };

    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Update user (SuperAdmin only)
router.patch('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, password, role, employeeId, isActive } = req.body;

    const updateData: any = {};
    
    if (username) updateData.username = username;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const safeUser = {
      ...updatedUser,
      password: undefined
    };

    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update user role (Admin and SuperAdmin)
router.post('/:id/role', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Prevent non-superadmin from setting superadmin role
    if (role === 'superadmin' && req.session.user?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only SuperAdmin can assign SuperAdmin role' });
    }

    const updatedUser = await storage.updateUser(userId, { role });
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password from response
    const safeUser = {
      ...updatedUser,
      password: undefined
    };

    res.json(safeUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (SuperAdmin only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent deletion of SuperAdmin users
    const user = await storage.getUserById(userId);
    if (user && user.role === 'superadmin') {
      return res.status(400).json({ error: 'Cannot delete SuperAdmin users' });
    }

    const success = await storage.deleteUser(userId);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;