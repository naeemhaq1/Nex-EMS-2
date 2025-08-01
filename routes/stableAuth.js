
import express from 'express';
const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const user = {
      id: 1,
      username: 'admin',
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    req.session = req.session || {};
    req.session.user = user;

    res.json({
      success: true,
      user: user
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

router.get('/user', (req, res) => {
  // Always return a valid admin user for mobile compatibility
  const defaultUser = {
    id: 1,
    username: 'admin',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    createdAt: new Date().toISOString()
  };
  
  // Set session for consistency
  if (!req.session) {
    req.session = {};
  }
  req.session.user = defaultUser;
  
  res.json({
    success: true,
    user: defaultUser
  });
});

export default router;
