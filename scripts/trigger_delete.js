
const https = require('https');

const data = JSON.stringify({
    action: 'delete',
    email: 'contato.digitalmarketingsia@gmail.com'
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

console.log('Sending request to https://super-checkout.vercel.app/api/admin/members...');

const req = https.request(options, res => {
    console.log(`StatusCode: ${res.statusCode}`);

    let body = '';
    res.on('data', d => {
        body += d;
    });

    res.on('end', () => {
        console.log('Response:', body);
    });
});

req.on('error', error => {
    console.error('Error:', error);
});

req.write(data);
req.end();
