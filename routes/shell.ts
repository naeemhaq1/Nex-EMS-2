import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '../middleware/auth';

const router = Router();
const execAsync = promisify(exec);

// Execute shell commands
router.post('/execute', requireAuth, async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Sanitize command (basic security)
    const sanitizedCommand = command.trim();
    
    // Block potentially dangerous commands
    const dangerousCommands = [
      'rm -rf',
      'format',
      'fdisk',
      'mkfs',
      'dd',
      'shutdown',
      'reboot',
      'passwd',
      'su',
      'sudo',
      'chmod 777',
      'chown root',
      'kill -9',
      'killall',
      'pkill',
    ];

    const isDangerous = dangerousCommands.some(dangerous => 
      sanitizedCommand.toLowerCase().includes(dangerous.toLowerCase())
    );

    if (isDangerous) {
      return res.json({
        output: 'Error: Command blocked for security reasons',
        success: false,
      });
    }

    // Execute command with timeout
    const timeout = 30000; // 30 seconds
    const { stdout, stderr } = await execAsync(sanitizedCommand, { 
      timeout,
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    // Combine stdout and stderr
    const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');

    res.json({
      output: output || 'Command executed successfully (no output)',
      success: !stderr,
    });

  } catch (error) {
    console.error('Shell command error:', error);
    
    let errorMessage = 'Command execution failed';
    if (error.code === 'ENOENT') {
      errorMessage = 'Command not found';
    } else if (error.signal === 'SIGTERM') {
      errorMessage = 'Command timed out';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.json({
      output: `Error: ${errorMessage}`,
      success: false,
    });
  }
});

export default router;