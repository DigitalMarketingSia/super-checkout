const fs = require('fs');

const pathCorrectSQL = 'c:/Users/Jean/Desktop/super-checkout/installer_sql_CORRECTED.sql';
const pathSavedWiz = 'c:/Users/Jean/Desktop/super-checkout/saved_installer_utf8.tsx';
const pathTargetWiz = 'c:/Users/Jean/Desktop/super-checkout/pages/installer/InstallerWizard.tsx';

// Read correct SQL
const sqlContent = fs.readFileSync(pathCorrectSQL, 'utf8');

// Read saved Wizard (with correct structure)
let wizContent = fs.readFileSync(pathSavedWiz, 'utf8');

// Find SQL_SCHEMA markers in saved file
const startMarker = 'const SQL_SCHEMA = `';
const endMarker = '`;';

const startIdx = wizContent.indexOf(startMarker);
if (startIdx === -1) {
    console.error('Could not find SQL_SCHEMA start in saved file');
    process.exit(1);
}

// Ensure we find the closure of that backtick string
// Since we used `view_file` on saved_installer_utf8.tsx, we saw it starts around line 6 and ends around line 713
// But indexOf searches linearly.
// The SQL string ends with `NOTIFY pgrst, 'reload schema';` followed by newline and backtick and semicolon.

const endIdx = wizContent.indexOf(endMarker, startIdx + startMarker.length);
if (endIdx === -1) {
    console.error('Could not find SQL_SCHEMA end in saved file');
    process.exit(1);
}

// Replace content
const before = wizContent.substring(0, startIdx + startMarker.length);
const after = wizContent.substring(endIdx);

// Note: sqlContent does NOT have backticks inside it, only dollar quotes $$ which are safe in template literal
const newWizContent = before + sqlContent + after;

fs.writeFileSync(pathTargetWiz, newWizContent);
console.log('Successfully restored InstallerWizard.tsx with correct SQL');
