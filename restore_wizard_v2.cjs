const fs = require('fs');
const path = require('path');

const pathCorrectSQL = 'c:/Users/Jean/Desktop/super-checkout/installer_sql_CORRECTED.sql';
const pathSavedWiz = 'c:/Users/Jean/Desktop/super-checkout/saved_installer_utf8.tsx';
const pathTargetWiz = 'c:/Users/Jean/Desktop/super-checkout/pages/installer/InstallerWizard.tsx';

try {
    if (!fs.existsSync(pathCorrectSQL)) throw new Error('SQL file not found');
    if (!fs.existsSync(pathSavedWiz)) throw new Error('Saved Wizard file not found');

    const sqlContent = fs.readFileSync(pathCorrectSQL, 'utf8');
    const wizContent = fs.readFileSync(pathSavedWiz, 'utf8');

    // Pattern to find SQL_SCHEMA definition
    // It starts with 'const SQL_SCHEMA = `'
    // safely escape backtick for regex if needed, or just use indexOf
    const startMarker = 'const SQL_SCHEMA = `';
    const endMarker = '`;';

    const startIdx = wizContent.indexOf(startMarker);
    if (startIdx === -1) throw new Error('Start marker not found in saved wizard');

    // Find end marker AFTER start marker
    const endIdx = wizContent.indexOf(endMarker, startIdx + startMarker.length);
    if (endIdx === -1) throw new Error('End marker not found in saved wizard');

    const before = wizContent.substring(0, startIdx + startMarker.length);
    const after = wizContent.substring(endIdx);

    const finalContent = before + sqlContent + after;

    fs.writeFileSync(pathTargetWiz, finalContent);
    console.log('Restored InstallerWizard.tsx successfully.');

} catch (err) {
    console.error('Error restoring wizard:', err);
    process.exit(1);
}
