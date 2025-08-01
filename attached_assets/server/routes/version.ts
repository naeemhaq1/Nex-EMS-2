import { Router } from 'express';
import { 
  INITIAL_COMPONENT_VERSIONS, 
  VERSION_HISTORY, 
  SYSTEM_VERSION, 
  BUILD_NUMBER,
  RELEASE_DATE,
  getComponentVersion,
  getVersionHistory,
  getComponentsByCategory,
  incrementVersion,
  type ComponentVersion,
  type VersionHistory
} from '@shared/versioning';

const router = Router();

// Get system version info
router.get('/system', (req, res) => {
  res.json({
    version: SYSTEM_VERSION,
    buildNumber: BUILD_NUMBER,
    releaseDate: RELEASE_DATE,
    totalComponents: INITIAL_COMPONENT_VERSIONS.length
  });
});

// Get all component versions
router.get('/components', (req, res) => {
  const { category, status } = req.query;
  
  let components = INITIAL_COMPONENT_VERSIONS;
  
  if (category) {
    components = components.filter(c => c.category === category);
  }
  
  if (status) {
    components = components.filter(c => c.status === status);
  }
  
  res.json(components);
});

// Get components by category
router.get('/components/category/:category', (req, res) => {
  const { category } = req.params;
  const components = getComponentsByCategory(category as ComponentVersion['category']);
  res.json(components);
});

// Get specific component version
router.get('/components/:componentId', (req, res) => {
  const { componentId } = req.params;
  const component = getComponentVersion(componentId);
  
  if (!component) {
    return res.status(404).json({ error: 'Component not found' });
  }
  
  res.json(component);
});

// Get component version history
router.get('/components/:componentId/history', (req, res) => {
  const { componentId } = req.params;
  const history = getVersionHistory(componentId);
  res.json(history);
});

// Get full version history
router.get('/history', (req, res) => {
  const { componentId, limit } = req.query;
  
  let history = VERSION_HISTORY;
  
  if (componentId) {
    history = history.filter(h => h.componentId === componentId);
  }
  
  // Sort by release date (newest first)
  history = history.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
  
  if (limit) {
    history = history.slice(0, parseInt(limit as string));
  }
  
  res.json(history);
});

// Get version statistics
router.get('/stats', (req, res) => {
  const stats = {
    totalComponents: INITIAL_COMPONENT_VERSIONS.length,
    componentsByCategory: {
      core: getComponentsByCategory('core').length,
      dashboard: getComponentsByCategory('dashboard').length,
      service: getComponentsByCategory('service').length,
      whatsapp: getComponentsByCategory('whatsapp').length,
      mobile: getComponentsByCategory('mobile').length,
      admin: getComponentsByCategory('admin').length
    },
    componentsByStatus: {
      stable: INITIAL_COMPONENT_VERSIONS.filter(c => c.status === 'stable').length,
      beta: INITIAL_COMPONENT_VERSIONS.filter(c => c.status === 'beta').length,
      alpha: INITIAL_COMPONENT_VERSIONS.filter(c => c.status === 'alpha').length,
      deprecated: INITIAL_COMPONENT_VERSIONS.filter(c => c.status === 'deprecated').length
    },
    recentUpdates: INITIAL_COMPONENT_VERSIONS
      .filter(c => {
        const daysSinceUpdate = (Date.now() - c.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate <= 7; // Components updated in last 7 days
      })
      .length,
    totalVersionHistory: VERSION_HISTORY.length
  };
  
  res.json(stats);
});

// Admin endpoint to update component version (for future use)
router.post('/components/:componentId/update', (req, res) => {
  const { componentId } = req.params;
  const { versionType, changes, author } = req.body;
  
  const component = getComponentVersion(componentId);
  if (!component) {
    return res.status(404).json({ error: 'Component not found' });
  }
  
  // In a real implementation, this would update the database
  // For now, we'll return what the new version would be
  const newVersion = incrementVersion(component.version, versionType || 'patch');
  
  const newVersionHistory: VersionHistory = {
    componentId,
    version: newVersion,
    releaseDate: new Date(),
    changes: changes || [],
    author: author || 'System',
    buildNumber: BUILD_NUMBER + 1
  };
  
  res.json({
    message: 'Version update simulated',
    component: {
      ...component,
      version: newVersion,
      lastUpdated: new Date(),
      changes: changes || component.changes
    },
    versionHistory: newVersionHistory
  });
});

// Get latest version updates (for dashboard widgets)
router.get('/latest-updates', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  
  const latestUpdates = INITIAL_COMPONENT_VERSIONS
    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
    .slice(0, limit)
    .map(component => ({
      id: component.id,
      name: component.name,
      category: component.category,
      version: component.version,
      lastUpdated: component.lastUpdated,
      status: component.status,
      hasRecentChanges: component.changes && component.changes.length > 0
    }));
  
  res.json(latestUpdates);
});

export default router;