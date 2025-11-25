
const https = require('https');

const VERCEL_TOKEN = 'mMVSND6jVzwcsuq5gkr2LqAe';

console.log('Testing new token...');

// Fetch User/Teams info
const url = 'https://api.vercel.com/v2/teams';

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
            if (json.teams && json.teams.length > 0) {
                console.log('TEAM_ID=' + json.teams[0].id);
                console.log('TEAM_NAME=' + json.teams[0].name);
            } else {
                console.log('No teams found (Personal Account?)');
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.log('Raw Body:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e);
});

req.end();
