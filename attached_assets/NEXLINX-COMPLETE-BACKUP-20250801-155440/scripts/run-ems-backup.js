#!/usr/bin/env node

/**
 * EMS-BKP-0728-SAMEDB Backup Runner
 * Simple runner script for the comprehensive backup system
 */

import EMSBackupSystem from './create-ems-backup.js';

async function runBackup() {
    console.log('🚀 Starting EMS-BKP-0728-SAMEDB Backup System...');
    console.log('===============================================');
    
    const backup = new EMSBackupSystem();
    
    try {
        const result = await backup.execute();
        
        console.log('\n✅ Backup completed successfully!');
        console.log(`📦 Archive: ${result.archivePath}`);
        console.log(`📊 Files: ${result.report.statistics.sourceFiles}`);
        console.log(`💾 Size: ${result.report.statistics.backupSizeMB} MB`);
        console.log(`⏱️  Duration: ${result.duration}s`);
        
        return result;
        
    } catch (error) {
        console.error('\n❌ Backup failed:',error.message);
        console.error(error.stack);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBackup()
        .then(() => {
            console.log('\n🎉 EMS-BKP-0728-SAMEDB backup process completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Fatal error:', error.message);
            process.exit(1);
        });
}

export default runBackup;