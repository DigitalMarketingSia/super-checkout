
const https = require('https');

const email = 'contato.jeandamin@gmail.com';
const data = JSON.stringify({
    action: 'promote_admin',
    email: email
});

const options = {
    hostname: 'super-checkout.vercel.app',
    port: 443,
    path: '/api/admin/members',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Sending promotion request for ${email}...`);

const req = https.request(options, (res) => {
    console.log(`StatusCode: ${res.statusCode}`);

    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Response:', responseData);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
