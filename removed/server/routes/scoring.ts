import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { insertScoringRuleSchema, insertEmployeeScoreSchema, insertScoringAuditTrailSchema, insertScoringConfigurationSchema, insertScoringBaselinesSchema } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// All scoring routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// === Scoring Rules ===
router.get('/rules', async (req, res) => {
  try {
    const rules = await storage.getScoringRules();
    res.json(rules);
  } catch (error) {
    console.error('Error fetching scoring rules:', error);
    res.status(500).json({ error: 'Failed to fetch scoring rules' });
  }
});

router.get('/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rule = await storage.getScoringRule(id);
    if (!rule) {
      return res.status(404).json({ error: 'Scoring rule not found' });
    }
    res.json(rule);
  } catch (error) {
    console.error('Error fetching scoring rule:', error);
    res.status(500).json({ error: 'Failed to fetch scoring rule' });
  }
});

router.post('/rules', async (req, res) => {
  try {
    const validatedData = insertScoringRuleSchema.parse(req.body);
    const rule = await storage.createScoringRule(validatedData);
    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating scoring rule:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create scoring rule' });
  }
});

router.put('/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertScoringRuleSchema.partial().parse(req.body);
    const rule = await storage.updateScoringRule(id, validatedData);
    res.json(rule);
  } catch (error) {
    console.error('Error updating scoring rule:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update scoring rule' });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteScoringRule(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting scoring rule:', error);
    res.status(500).json({ error: 'Failed to delete scoring rule' });
  }
});

// === Employee Scores ===
router.get('/scores', async (req, res) => {
  try {
    const params = {
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      orderBy: req.query.orderBy as 'score' | 'date' | undefined,
      order: req.query.order as 'asc' | 'desc' | undefined,
    };

    const scores = await storage.getEmployeeScores(params);
    res.json(scores);
  } catch (error) {
    console.error('Error fetching employee scores:', error);
    res.status(500).json({ error: 'Failed to fetch employee scores' });
  }
});

router.get('/scores/:employeeId/:date', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const date = new Date(req.params.date);
    const score = await storage.getEmployeeScore(employeeId, date);
    if (!score) {
      return res.status(404).json({ error: 'Employee score not found' });
    }
    res.json(score);
  } catch (error) {
    console.error('Error fetching employee score:', error);
    res.status(500).json({ error: 'Failed to fetch employee score' });
  }
});

router.post('/scores', async (req, res) => {
  try {
    const validatedData = insertEmployeeScoreSchema.parse(req.body);
    const score = await storage.createEmployeeScore(validatedData);
    res.status(201).json(score);
  } catch (error) {
    console.error('Error creating employee score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create employee score' });
  }
});

router.put('/scores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertEmployeeScoreSchema.partial().parse(req.body);
    const score = await storage.updateEmployeeScore(id, validatedData);
    res.json(score);
  } catch (error) {
    console.error('Error updating employee score:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update employee score' });
  }
});

router.delete('/scores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteEmployeeScore(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting employee score:', error);
    res.status(500).json({ error: 'Failed to delete employee score' });
  }
});

// === Scoring Audit Trail ===
router.get('/audit', async (req, res) => {
  try {
    const params = {
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined,
      actionType: req.query.actionType as string | undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const auditTrail = await storage.getScoringAuditTrail(params);
    res.json(auditTrail);
  } catch (error) {
    console.error('Error fetching scoring audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch scoring audit trail' });
  }
});

router.post('/audit', async (req, res) => {
  try {
    const validatedData = insertScoringAuditTrailSchema.parse(req.body);
    const auditEntry = await storage.createScoringAuditTrail(validatedData);
    res.status(201).json(auditEntry);
  } catch (error) {
    console.error('Error creating scoring audit trail:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create scoring audit trail' });
  }
});

// === Scoring Configuration ===
router.get('/config', async (req, res) => {
  try {
    const config = await storage.getScoringConfiguration();
    if (!config) {
      // Initialize configuration if it doesn't exist
      const initialConfig = await storage.initializeScoringConfiguration();
      return res.json(initialConfig);
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching scoring configuration:', error);
    res.status(500).json({ error: 'Failed to fetch scoring configuration' });
  }
});

router.put('/config', async (req, res) => {
  try {
    const validatedData = insertScoringConfigurationSchema.partial().parse(req.body);
    const config = await storage.updateScoringConfiguration(validatedData);
    res.json(config);
  } catch (error) {
    console.error('Error updating scoring configuration:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update scoring configuration' });
  }
});

router.post('/config/initialize', async (req, res) => {
  try {
    const config = await storage.initializeScoringConfiguration();
    res.json(config);
  } catch (error) {
    console.error('Error initializing scoring configuration:', error);
    res.status(500).json({ error: 'Failed to initialize scoring configuration' });
  }
});

// === Scoring Baselines ===
router.get('/baselines', async (req, res) => {
  try {
    const params = {
      employeeId: req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const baselines = await storage.getScoringBaselines(params);
    res.json(baselines);
  } catch (error) {
    console.error('Error fetching scoring baselines:', error);
    res.status(500).json({ error: 'Failed to fetch scoring baselines' });
  }
});

router.get('/baselines/:employeeId/:date', async (req, res) => {
  try {
    const employeeId = parseInt(req.params.employeeId);
    const date = new Date(req.params.date);
    const baseline = await storage.getScoringBaseline(employeeId, date);
    if (!baseline) {
      return res.status(404).json({ error: 'Scoring baseline not found' });
    }
    res.json(baseline);
  } catch (error) {
    console.error('Error fetching scoring baseline:', error);
    res.status(500).json({ error: 'Failed to fetch scoring baseline' });
  }
});

router.post('/baselines', async (req, res) => {
  try {
    const validatedData = insertScoringBaselinesSchema.parse(req.body);
    const baseline = await storage.createScoringBaseline(validatedData);
    res.status(201).json(baseline);
  } catch (error) {
    console.error('Error creating scoring baseline:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create scoring baseline' });
  }
});

router.put('/baselines/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertScoringBaselinesSchema.partial().parse(req.body);
    const baseline = await storage.updateScoringBaseline(id, validatedData);
    res.json(baseline);
  } catch (error) {
    console.error('Error updating scoring baseline:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update scoring baseline' });
  }
});

router.delete('/baselines/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteScoringBaseline(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting scoring baseline:', error);
    res.status(500).json({ error: 'Failed to delete scoring baseline' });
  }
});

router.post('/baselines/generate', async (req, res) => {
  try {
    const employeeId = req.body.employeeId ? parseInt(req.body.employeeId) : undefined;
    const result = await storage.generateScoringBaselines(employeeId);
    res.json(result);
  } catch (error) {
    console.error('Error generating scoring baselines:', error);
    res.status(500).json({ error: 'Failed to generate scoring baselines' });
  }
});

// === Scoring Leaderboard ===
router.get('/leaderboard', async (req, res) => {
  try {
    const params = {
      period: req.query.period as 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined,
      date: req.query.date ? new Date(req.query.date as string) : undefined,
      department: req.query.department as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };

    const leaderboard = await storage.getScoringLeaderboard(params);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching scoring leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch scoring leaderboard' });
  }
});

export default router;