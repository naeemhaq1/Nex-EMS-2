import express from 'express';
import { storage } from '../storage';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Team Templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await storage.getTeamTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching team templates:', error);
    res.status(500).json({ error: 'Failed to fetch team templates' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const template = await storage.createTeamTemplate(req.body);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating team template:', error);
    res.status(500).json({ error: 'Failed to create team template' });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await storage.updateTeamTemplate(parseInt(req.params.id), req.body);
    res.json(template);
  } catch (error) {
    console.error('Error updating team template:', error);
    res.status(500).json({ error: 'Failed to update team template' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await storage.deleteTeamTemplate(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team template:', error);
    res.status(500).json({ error: 'Failed to delete team template' });
  }
});

// Assembled Teams
router.get('/teams', async (req, res) => {
  try {
    const teams = await storage.getAssembledTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error fetching assembled teams:', error);
    res.status(500).json({ error: 'Failed to fetch assembled teams' });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const team = await storage.createAssembledTeam(req.body);
    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating assembled team:', error);
    res.status(500).json({ error: 'Failed to create assembled team' });
  }
});

router.put('/teams/:id', async (req, res) => {
  try {
    const team = await storage.updateAssembledTeam(parseInt(req.params.id), req.body);
    res.json(team);
  } catch (error) {
    console.error('Error updating assembled team:', error);
    res.status(500).json({ error: 'Failed to update assembled team' });
  }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    await storage.deleteAssembledTeam(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting assembled team:', error);
    res.status(500).json({ error: 'Failed to delete assembled team' });
  }
});

// Team Members
router.get('/teams/:teamId/members', async (req, res) => {
  try {
    const members = await storage.getTeamMembers(parseInt(req.params.teamId));
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

router.post('/teams/:teamId/members', async (req, res) => {
  try {
    const member = await storage.addTeamMember({
      ...req.body,
      teamId: parseInt(req.params.teamId)
    });
    res.status(201).json(member);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

router.delete('/teams/:teamId/members/:memberId', async (req, res) => {
  try {
    await storage.removeTeamMember(parseInt(req.params.memberId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

// Department Managers
router.get('/managers', async (req, res) => {
  try {
    const managers = await storage.getDepartmentManagers();
    res.json(managers);
  } catch (error) {
    console.error('Error fetching department managers:', error);
    res.status(500).json({ error: 'Failed to fetch department managers' });
  }
});

router.post('/managers', async (req, res) => {
  try {
    const { userId, departments } = req.body;
    const manager = await storage.assignDepartmentManager(userId, departments);
    res.status(201).json(manager);
  } catch (error) {
    console.error('Error assigning department manager:', error);
    res.status(500).json({ error: 'Failed to assign department manager' });
  }
});

router.delete('/managers/:userId', async (req, res) => {
  try {
    await storage.removeDepartmentManager(parseInt(req.params.userId));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing department manager:', error);
    res.status(500).json({ error: 'Failed to remove department manager' });
  }
});

// Team-Shift Assignments
router.get('/teams/:teamId/shifts', async (req, res) => {
  try {
    const shifts = await storage.getTeamShifts(parseInt(req.params.teamId));
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching team shifts:', error);
    res.status(500).json({ error: 'Failed to fetch team shifts' });
  }
});

router.post('/teams/:teamId/shifts', async (req, res) => {
  try {
    const assignment = await storage.assignTeamShift(parseInt(req.params.teamId), req.body);
    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning team shift:', error);
    res.status(500).json({ error: 'Failed to assign team shift' });
  }
});

export default router;