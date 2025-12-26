const fs = require('fs');
const pathSQL = 'c:/Users/Jean/Desktop/super-checkout/installer_sql_CORRECTED.sql';
const pathWiz = 'c:/Users/Jean/Desktop/super-checkout/pages/installer/InstallerWizard.tsx';
const pathFixed = 'c:/Users/Jean/Desktop/super-checkout/fixed_functions.sql';

if (!fs.existsSync(pathFixed)) {
    console.error('Fixed functions file not found!');
    process.exit(1);
}

const contentSQL = fs.readFileSync(pathSQL, 'utf8');
const linesSQL = contentSQL.split(/\r?\n/);
const contentFixed = fs.readFileSync(pathFixed, 'utf8');
const linesFixed = contentFixed.split(/\r?\n/);

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < linesSQL.length; i++) {
    if (linesSQL[i].includes('-- 4.1 Admin Helper Function')) startIdx = i;
    if (linesSQL[i].includes('-- 5. STORAGE & BUCKETS')) { endIdx = i - 1; break; }
}

if (startIdx !== -1 && endIdx !== -1) {
    while (linesSQL[endIdx].trim() === '') endIdx--;
    linesSQL.splice(startIdx, endIdx - startIdx + 1, ...linesFixed);
    const newSQL = linesSQL.join('\n');
    fs.writeFileSync(pathSQL, newSQL);
    console.log('Fixed installer_sql_CORRECTED.sql');

    let contentWiz = fs.readFileSync(pathWiz, 'utf8');
    // Use unicode escapes for backticks to be super safe
    const startMark = 'const SQL_SCHEMA = \u0060';
    const endMark = '\u0060;';
    const s = contentWiz.indexOf(startMark);
    const e = contentWiz.lastIndexOf(endMark);

    if (s !== -1 && e !== -1) {
        const before = contentWiz.substring(0, s + startMark.length);
        const after = contentWiz.substring(e);
        fs.writeFileSync(pathWiz, before + newSQL + after);
        console.log('Fixed InstallerWizard.tsx');
    } else {
        console.log('Error finding markers in InstallerWizard. Found start:', s, 'Found end:', e);
    }
} else {
    console.log('Could not find start/end markers in SQL file. Start:', startIdx, 'End:', endIdx);
}
