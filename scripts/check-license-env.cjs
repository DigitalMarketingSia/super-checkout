const fs = require('fs');
const path = require('path');

console.log('--- Environment Variable Check ---');

const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
    console.log('Found .env.local');
    const content = fs.readFileSync(envLocalPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
        if (line.startsWith('VITE_LICENSE_KEY=')) {
            console.log('VITE_LICENSE_KEY is set');
        }
        if (line.startsWith('VITE_LICENSING_SERVER_URL=')) {
            console.log(`VITE_LICENSING_SERVER_URL=${line.split('=')[1]}`);
        }
    });
} else {
    console.log('.env.local NOT found');
}

console.log('----------------------------------');
