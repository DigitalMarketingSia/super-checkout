export default async function handler(req, res) {
    // 1. Handle CORS
    // We set these headers for ALL responses, including errors
    res.setHeader('Access-Control-Allow-Credentials', 'true');
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
        // 3. Extract Endpoint
        const { endpoint } = req.query;

        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).json({ error: 'Missing endpoint parameter' });
        }

        const targetUrl = `https://api.mercadopago.com${endpoint}`;
        console.log(`[Proxy] Forwarding ${req.method} to ${targetUrl}`);

        // 4. Forward Request
        // Using global fetch (Node 18+)
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || '',
                'X-Idempotency-Key': req.headers['x-idempotency-key'] || ''
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });

        // 5. Return Response
        const data = await response.json();

        // Forward the status code from upstream
        return res.status(response.status).json(data);

    } catch (error) {
        console.error('[Proxy] Internal Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Proxy Error' });
    }
}
