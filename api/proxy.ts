export default async function handler(req, res) {
    // 1. Set CORS Headers explicitly for EVERY response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Idempotency-Key'
    );

    // 2. Handle Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log(`[Proxy] Incoming ${req.method} request`);

        // 3. Health Check / Debug
        const { endpoint } = req.query;
        if (!endpoint) {
            return res.status(200).json({ status: 'ok', message: 'Proxy is running' });
        }

        const targetUrl = `https://api.mercadopago.com${endpoint}`;
        console.log(`[Proxy] Forwarding to ${targetUrl}`);

        // 4. Prepare Body
        let body;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
        }

        // 5. Forward Request
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || '',
                'X-Idempotency-Key': req.headers['x-idempotency-key'] || ''
            },
            body: body
        });

        // 6. Return Response
        const data = await response.json();
        return res.status(response.status).json(data);

    } catch (error) {
        console.error('[Proxy] Internal Error:', error);
        // Even in error, headers are already set above
        return res.status(500).json({ error: error.message || 'Internal Proxy Error' });
    }
}
