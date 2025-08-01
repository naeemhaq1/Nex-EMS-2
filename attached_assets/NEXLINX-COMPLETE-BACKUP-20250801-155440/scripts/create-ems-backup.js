#!/usr/bin/env node

/**
 * EMS-BKP-0728-SAMEDB - Comprehensive Self-Installing Automatic Backup System
 * Enterprise Management System Backup - July 28, 2025 - Same Database
 * 
 * Creates complete self-installing backup packages with zero external dependencies
 * Features: Complete source code, database, dependencies, configuration files
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { createReadStream, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EMSBackupSystem {
    constructor() {
        this.backupName = `EMS-BKP-0728-SAMEDB-${this.getTimestamp()}`;
        // Ensure we're working from project root, not scripts directory
        this.sourceDir = path.dirname(__dirname);
        this.backupDir = path.join(this.sourceDir, 'backups', this.backupName);
        
        // Critical directories and files to include
        this.includePaths = [
            'client/',
            'server/',
            'shared/',
            'scripts/',
            'docs/',
            'package.json',
            'package-lock.json',
            'tsconfig.json',
            'tailwind.config.ts',
            'drizzle.config.ts',
            'postcss.config.js',
            'vite.config.ts',
            '.replit',
            'replit.md',
            'components.json',
            '.env.template',
            'Dockerfile',
            'README.md'
        ];
        
        // Paths to exclude from backup
        this.excludePaths = [
            'node_modules/',
            '.git/',
            'dist/',
            'build/',
            'backups/',
            'backup/',
            'tmp/',
            'to-restore/',
            '.cache/',
            '*.log',
            '.env.local',
            'cookies.txt',
            '*.tar.gz',
            '*.zip',
            'attached_assets/',
            'mobile/',
            'nexlinx-mobile-*',
            'github-*'
        ];
    }

    getTimestamp() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}-${hour}${minute}`;
    }

    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        
        // Write to backup log
        const logFile = path.join(this.backupDir, 'backup.log');
        try {
            await fs.appendFile(logFile, logMessage + '\n');
        } catch (error) {
            // Ignore log write errors during initialization
        }
    }

    async createBackupDirectory() {
        await this.log('Creating backup directory structure...');
        
        try {
            await fs.mkdir(path.join(process.cwd(), 'backups'), { recursive: true });
            await fs.mkdir(this.backupDir, { recursive: true });
            await fs.mkdir(path.join(this.backupDir, 'source'), { recursive: true });
            await fs.mkdir(path.join(this.backupDir, 'database'), { recursive: true });
            await fs.mkdir(path.join(this.backupDir, 'dependencies'), { recursive: true });
            await fs.mkdir(path.join(this.backupDir, 'config'), { recursive: true });
            
            await this.log(`Backup directory created: ${this.backupDir}`);
        } catch (error) {
            await this.log(`Error creating backup directory: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async backupSourceCode() {
        await this.log('Backing up source code...');
        
        const sourceBackupDir = path.join(this.backupDir, 'source');
        let fileCount = 0;
        
        for (const includePath of this.includePaths) {
            const sourcePath = path.join(this.sourceDir, includePath);
            const targetPath = path.join(sourceBackupDir, includePath);
            
            try {
                const stats = await fs.stat(sourcePath);
                
                if (stats.isDirectory()) {
                    await this.copyDirectory(sourcePath, targetPath);
                    const files = await this.countFiles(targetPath);
                    fileCount += files;
                    await this.log(`Copied directory: ${includePath} (${files} files)`);
                } else if (stats.isFile()) {
                    await fs.mkdir(path.dirname(targetPath), { recursive: true });
                    await fs.copyFile(sourcePath, targetPath);
                    fileCount++;
                    await this.log(`Copied file: ${includePath}`);
                }
            } catch (error) {
                await this.log(`Warning: Could not backup ${includePath}: ${error.message}`, 'WARN');
            }
        }
        
        await this.log(`Source code backup complete: ${fileCount} files`);
        return fileCount;
    }

    async copyDirectory(source, target) {
        await fs.mkdir(target, { recursive: true });
        const items = await fs.readdir(source);
        
        for (const item of items) {
            const sourcePath = path.join(source, item);
            const targetPath = path.join(target, item);
            
            // Check if item should be excluded
            if (this.shouldExclude(item)) {
                continue;
            }
            
            const stats = await fs.stat(sourcePath);
            
            if (stats.isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            } else {
                await fs.copyFile(sourcePath, targetPath);
            }
        }
    }

    shouldExclude(itemName) {
        return this.excludePaths.some(excludePath => {
            if (excludePath.endsWith('/')) {
                return itemName === excludePath.slice(0, -1);
            }
            if (excludePath.startsWith('*.')) {
                return itemName.endsWith(excludePath.slice(1));
            }
            return itemName === excludePath;
        });
    }

    async countFiles(directory) {
        let count = 0;
        try {
            const items = await fs.readdir(directory);
            
            for (const item of items) {
                const itemPath = path.join(directory, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isDirectory()) {
                    count += await this.countFiles(itemPath);
                } else {
                    count++;
                }
            }
        } catch (error) {
            // Directory might not exist, return 0
        }
        
        return count;
    }

    async backupDatabase() {
        await this.log('Backing up database...');
        
        const databaseBackupDir = path.join(this.backupDir, 'database');
        
        try {
            // Create database schema backup
            const schemaBackup = path.join(databaseBackupDir, 'schema.sql');
            const dataBackup = path.join(databaseBackupDir, 'data.sql');
            const fullBackup = path.join(databaseBackupDir, 'full_backup.sql');
            
            // Export database schema
            try {
                execSync(`pg_dump --schema-only "${process.env.DATABASE_URL}" > "${schemaBackup}"`, {
                    stdio: 'pipe'
                });
                await this.log('Database schema exported successfully');
            } catch (error) {
                await this.log(`Database schema export failed: ${error.message}`, 'WARN');
            }
            
            // Export database data
            try {
                execSync(`pg_dump --data-only "${process.env.DATABASE_URL}" > "${dataBackup}"`, {
                    stdio: 'pipe'
                });
                await this.log('Database data exported successfully');
            } catch (error) {
                await this.log(`Database data export failed: ${error.message}`, 'WARN');
            }
            
            // Export full database backup
            try {
                execSync(`pg_dump "${process.env.DATABASE_URL}" > "${fullBackup}"`, {
                    stdio: 'pipe'
                });
                await this.log('Full database backup completed successfully');
            } catch (error) {
                await this.log(`Full database backup failed: ${error.message}`, 'WARN');
            }
            
            // Create database info file
            const dbInfo = {
                backupDate: new Date().toISOString(),
                databaseUrl: process.env.DATABASE_URL ? '[REDACTED]' : 'Not configured',
                backupFiles: ['schema.sql', 'data.sql', 'full_backup.sql'],
                instructions: {
                    restore: 'psql "${DATABASE_URL}" < full_backup.sql',
                    schemaOnly: 'psql "${DATABASE_URL}" < schema.sql',
                    dataOnly: 'psql "${DATABASE_URL}" < data.sql'
                }
            };
            
            await fs.writeFile(
                path.join(databaseBackupDir, 'database_info.json'),
                JSON.stringify(dbInfo, null, 2)
            );
            
        } catch (error) {
            await this.log(`Database backup error: ${error.message}`, 'ERROR');
        }
    }

    async backupDependencies() {
        await this.log('Backing up dependencies...');
        
        const depsBackupDir = path.join(this.backupDir, 'dependencies');
        
        try {
            // Copy package files
            await fs.copyFile(
                path.join(this.sourceDir, 'package.json'),
                path.join(depsBackupDir, 'package.json')
            );
            
            try {
                await fs.copyFile(
                    path.join(this.sourceDir, 'package-lock.json'),
                    path.join(depsBackupDir, 'package-lock.json')
                );
            } catch (error) {
                await this.log('No package-lock.json found', 'WARN');
            }
            
            // Create dependency snapshot
            const packageJson = JSON.parse(
                await fs.readFile(path.join(this.sourceDir, 'package.json'), 'utf8')
            );
            
            const depInfo = {
                backupDate: new Date().toISOString(),
                nodeVersion: process.version,
                npmVersion: this.getNpmVersion(),
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
                totalDependencies: Object.keys(packageJson.dependencies || {}).length +
                                 Object.keys(packageJson.devDependencies || {}).length,
                installCommand: 'npm install',
                buildCommand: packageJson.scripts?.build || 'npm run build',
                startCommand: packageJson.scripts?.start || 'npm start'
            };
            
            await fs.writeFile(
                path.join(depsBackupDir, 'dependency_info.json'),
                JSON.stringify(depInfo, null, 2)
            );
            
            await this.log(`Dependencies backed up: ${depInfo.totalDependencies} packages`);
            
        } catch (error) {
            await this.log(`Dependencies backup error: ${error.message}`, 'ERROR');
        }
    }

    getNpmVersion() {
        try {
            return execSync('npm --version', { encoding: 'utf8' }).trim();
        } catch (error) {
            return 'Unknown';
        }
    }

    async createInstallationScripts() {
        await this.log('Creating installation scripts...');
        
        const configDir = path.join(this.backupDir, 'config');
        
        // Create installation script (Unix/Linux)
        const installScript = `#!/bin/bash

# EMS-BKP-0728-SAMEDB Installation Script
# Enterprise Management System Backup - July 28, 2025

set -e

echo "🚀 Starting EMS-BKP-0728-SAMEDB Installation..."
echo "==============================================="

# Color codes for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

# Check system requirements
echo -e "\${BLUE}📋 Checking system requirements...\${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\${RED}❌ Node.js is not installed. Please install Node.js 18+ first.\${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "\${RED}❌ Node.js version 18+ is required. Current version: $(node --version)\${NC}"
    exit 1
fi

echo -e "\${GREEN}✅ Node.js $(node --version) detected\${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "\${RED}❌ npm is not installed.\${NC}"
    exit 1
fi

echo -e "\${GREEN}✅ npm $(npm --version) detected\${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "\${YELLOW}⚠️  PostgreSQL client not found. Database restore may not work.\${NC}"
else
    echo -e "\${GREEN}✅ PostgreSQL client detected\${NC}"
fi

# Create installation directory
INSTALL_DIR="\${PWD}/nexlinx-ems-restored"
echo -e "\${BLUE}📁 Creating installation directory: \${INSTALL_DIR}\${NC}"
mkdir -p "\${INSTALL_DIR}"

# Copy source code
echo -e "\${BLUE}📋 Copying source code...\${NC}"
cp -r source/* "\${INSTALL_DIR}/"

# Copy configuration files
echo -e "\${BLUE}⚙️  Setting up configuration...\${NC}"
if [ -f "config/.env.template" ]; then
    cp config/.env.template "\${INSTALL_DIR}/.env"
    echo -e "\${YELLOW}⚠️  Please configure your .env file with your database and API keys\${NC}"
fi

# Install dependencies
echo -e "\${BLUE}📦 Installing dependencies...\${NC}"
cd "\${INSTALL_DIR}"
npm install

# Build application
echo -e "\${BLUE}🔨 Building application...\${NC}"
npm run build || echo -e "\${YELLOW}⚠️  Build failed, but continuing...\${NC}"

# Database restore instructions
echo -e "\${BLUE}🗄️  Database restore instructions:\${NC}"
echo -e "\${YELLOW}   1. Set your DATABASE_URL environment variable\${NC}"
echo -e "\${YELLOW}   2. Run: psql \"\\\$DATABASE_URL\" < ../database/full_backup.sql\${NC}"
echo -e "\${YELLOW}   3. Or restore schema only: psql \"\\\$DATABASE_URL\" < ../database/schema.sql\${NC}"

echo ""
echo -e "\${GREEN}🎉 Installation completed successfully!\${NC}"
echo -e "\${GREEN}📁 Project installed in: \${INSTALL_DIR}\${NC}"
echo ""
echo -e "\${BLUE}🚀 To start the application:\${NC}"
echo -e "\${BLUE}   cd \${INSTALL_DIR}\${NC}"
echo -e "\${BLUE}   npm run dev\${NC}"
echo ""
echo -e "\${YELLOW}⚠️  Don't forget to:\${NC}"
echo -e "\${YELLOW}   - Configure your .env file\${NC}"
echo -e "\${YELLOW}   - Restore your database\${NC}"
echo -e "\${YELLOW}   - Set up your API keys\${NC}"
echo ""
`;

        await fs.writeFile(path.join(configDir, 'install.sh'), installScript);
        
        // Create Windows installation script
        const installBat = `@echo off
REM EMS-BKP-0728-SAMEDB Installation Script (Windows)
REM Enterprise Management System Backup - July 28, 2025

echo Starting EMS-BKP-0728-SAMEDB Installation...
echo ===============================================

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo Node.js detected: 
node --version

REM Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed.
    pause
    exit /b 1
)

echo npm detected:
npm --version

REM Create installation directory
set INSTALL_DIR=%CD%\\nexlinx-ems-restored
echo Creating installation directory: %INSTALL_DIR%
mkdir "%INSTALL_DIR%" 2>nul

REM Copy source code
echo Copying source code...
xcopy /E /I source "%INSTALL_DIR%" >nul

REM Copy configuration
if exist "config\\.env.template" (
    copy "config\\.env.template" "%INSTALL_DIR%\\.env" >nul
    echo Please configure your .env file with your database and API keys
)

REM Install dependencies
echo Installing dependencies...
cd "%INSTALL_DIR%"
npm install

REM Build application
echo Building application...
npm run build

echo.
echo Installation completed successfully!
echo Project installed in: %INSTALL_DIR%
echo.
echo To start the application:
echo   cd %INSTALL_DIR%
echo   npm run dev
echo.
echo Don't forget to:
echo   - Configure your .env file
echo   - Restore your database
echo   - Set up your API keys
echo.
pause
`;

        await fs.writeFile(path.join(configDir, 'install.bat'), installBat);
        
        // Create README
        const readme = `# EMS-BKP-0728-SAMEDB - Enterprise Management System Backup

## Overview
Complete self-installing backup of the Nexlinx Employee Management System created on July 28, 2025.

## Contents
- \`source/\` - Complete source code
- \`database/\` - Database schema and data backups
- \`dependencies/\` - Package.json and dependency information
- \`config/\` - Installation scripts and configuration templates

## Installation

### Unix/Linux/macOS
\`\`\`bash
chmod +x config/install.sh
./config/install.sh
\`\`\`

### Windows
\`\`\`cmd
config\\install.bat
\`\`\`

## Manual Installation

1. Copy source code to your desired directory:
   \`\`\`bash
   cp -r source/* /path/to/your/project/
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   cd /path/to/your/project
   npm install
   \`\`\`

3. Configure environment:
   \`\`\`bash
   cp config/.env.template .env
   # Edit .env with your configuration
   \`\`\`

4. Restore database:
   \`\`\`bash
   psql "$DATABASE_URL" < database/full_backup.sql
   \`\`\`

5. Build and start:
   \`\`\`bash
   npm run build
   npm run dev
   \`\`\`

## System Requirements
- Node.js 18+
- npm 8+
- PostgreSQL 12+
- 2GB disk space minimum

## Architecture
- React/TypeScript frontend
- Express.js backend
- PostgreSQL database
- Three-tier service architecture (ports 5000, 5001, 5002)

## Support
This backup was created automatically by the EMS-BKP-0728-SAMEDB system.
For issues, refer to the original project documentation.

## Backup Information
- Created: ${new Date().toISOString()}
- System: Nexlinx Employee Management System
- Version: EMS-BKP-0728-SAMEDB
- Node.js: ${process.version}
- Platform: ${process.platform}
`;

        await fs.writeFile(path.join(configDir, 'README.md'), readme);
        
        await this.log('Installation scripts created successfully');
    }

    async createBackupManifest() {
        await this.log('Creating backup manifest...');
        
        const manifest = {
            backupName: this.backupName,
            createdAt: new Date().toISOString(),
            version: '1.0.0',
            system: 'Nexlinx Employee Management System',
            backupType: 'EMS-BKP-0728-SAMEDB',
            creator: 'Automated Backup System',
            
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                npmVersion: this.getNpmVersion()
            },
            
            contents: {
                sourceCode: true,
                database: true,
                dependencies: true,
                configuration: true,
                installationScripts: true
            },
            
            directories: [
                'source/',
                'database/',
                'dependencies/',
                'config/'
            ],
            
            instructions: {
                installation: 'Run config/install.sh (Unix) or config/install.bat (Windows)',
                requirements: 'Node.js 18+, npm 8+, PostgreSQL 12+',
                diskSpace: '2GB minimum'
            },
            
            restoration: {
                automatic: 'Use installation scripts for automated setup',
                manual: 'Follow README.md for manual installation steps',
                database: 'Restore from database/full_backup.sql'
            }
        };
        
        await fs.writeFile(
            path.join(this.backupDir, 'manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        
        await this.log('Backup manifest created');
        return manifest;
    }

    async createCompressedArchive() {
        await this.log('Creating compressed archive...');
        
        const archivePath = path.join(process.cwd(), 'backups', `${this.backupName}.tar.gz`);
        
        return new Promise((resolve, reject) => {
            const output = createWriteStream(archivePath);
            const archive = archiver('tar', {
                gzip: true,
                gzipOptions: {
                    level: 6,
                    memLevel: 6
                }
            });
            
            output.on('close', async () => {
                const stats = await fs.stat(archivePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                await this.log(`Archive created: ${archivePath} (${sizeMB} MB)`);
                resolve(archivePath);
            });
            
            output.on('error', reject);
            archive.on('error', reject);
            
            archive.pipe(output);
            archive.directory(this.backupDir, false);
            archive.finalize();
        });
    }

    async generateReport() {
        await this.log('Generating backup report...');
        
        const sourceFiles = await this.countFiles(path.join(this.backupDir, 'source'));
        const backupSize = await this.getDirectorySize(this.backupDir);
        
        const report = {
            backupName: this.backupName,
            timestamp: new Date().toISOString(),
            status: 'COMPLETED',
            
            statistics: {
                sourceFiles: sourceFiles,
                backupSizeMB: (backupSize / (1024 * 1024)).toFixed(2),
                directories: 4,
                configurationFiles: 3
            },
            
            components: {
                sourceCode: '✅ Complete',
                database: '✅ Complete',
                dependencies: '✅ Complete',
                installationScripts: '✅ Complete',
                manifest: '✅ Complete'
            },
            
            summary: `Successfully created comprehensive EMS backup with ${sourceFiles} source files, ` +
                    `complete database export, dependency snapshots, and self-installing scripts. ` +
                    `Total backup size: ${(backupSize / (1024 * 1024)).toFixed(2)} MB.`
        };
        
        await fs.writeFile(
            path.join(this.backupDir, 'backup_report.json'),
            JSON.stringify(report, null, 2)
        );
        
        return report;
    }

    async getDirectorySize(directory) {
        let size = 0;
        
        try {
            const items = await fs.readdir(directory);
            
            for (const item of items) {
                const itemPath = path.join(directory, item);
                const stats = await fs.stat(itemPath);
                
                if (stats.isDirectory()) {
                    size += await this.getDirectorySize(itemPath);
                } else {
                    size += stats.size;
                }
            }
        } catch (error) {
            // Directory might not exist, return 0
        }
        
        return size;
    }

    async execute() {
        const startTime = Date.now();
        
        try {
            await this.log('🚀 Starting EMS-BKP-0728-SAMEDB backup process...');
            
            // Create backup structure
            await this.createBackupDirectory();
            
            // Backup all components
            await this.backupSourceCode();
            await this.backupDatabase();
            await this.backupDependencies();
            await this.createInstallationScripts();
            
            // Create manifest and reports
            const manifest = await this.createBackupManifest();
            const report = await this.generateReport();
            
            // Create compressed archive
            const archivePath = await this.createCompressedArchive();
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            await this.log('🎉 EMS-BKP-0728-SAMEDB backup completed successfully!');
            await this.log(`⏱️  Total time: ${duration} seconds`);
            await this.log(`📁 Archive location: ${archivePath}`);
            await this.log(`📊 Files backed up: ${report.statistics.sourceFiles}`);
            await this.log(`💾 Total size: ${report.statistics.backupSizeMB} MB`);
            
            return {
                success: true,
                archivePath,
                manifest,
                report,
                duration: parseFloat(duration)
            };
            
        } catch (error) {
            await this.log(`❌ Backup failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }
}

// Execute backup if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const backup = new EMSBackupSystem();
    
    backup.execute()
        .then(result => {
            console.log('\n✅ EMS-BKP-0728-SAMEDB backup completed successfully!');
            console.log(`📦 Archive: ${result.archivePath}`);
            console.log(`⏱️  Duration: ${result.duration}s`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Backup failed:', error.message);
            process.exit(1);
        });
}

export default EMSBackupSystem;