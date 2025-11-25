
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env and .env.local manually
const env = {};
['.env', '.env.local'].forEach(file => {
    try {
        const envPath = path.join(__dirname, '../' + file);
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && valueParts.length > 0) {
                    let value = valueParts.join('=').trim();
                    if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    }
                    env[key.trim()] = value;
                }
            });
        }
    } catch (e) { }
});

const VERCEL_TOKEN = env.VERCEL_TOKEN;
const PROJECT_ID = env.VERCEL_PROJECT_ID;
const TEAM_ID = env.VERCEL_TEAM_ID;
// Use the domain the user mentioned
const DOMAIN = 'pay.kitizinho.shop';

console.log('Project ID:', PROJECT_ID ? `${PROJECT_ID.substring(0, 5)}...` : 'MISSING');
console.log('Team ID:', TEAM_ID ? `${TEAM_ID.substring(0, 5)}...` : 'MISSING');
console.log('Token:', VERCEL_TOKEN ? 'PRESENT' : 'MISSING');

if (!VERCEL_TOKEN || !PROJECT_ID) {
    console.error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID in .env.local');
    process.exit(1);
}

// List projects to find the correct ID
const url = `https://api.vercel.com/v9/projects${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`;

console.log(`Listing projects...`);

const req = https.request(url, {
    headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Raw Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.end();
