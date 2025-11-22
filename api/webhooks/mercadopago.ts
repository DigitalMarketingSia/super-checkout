import type { VercelRequest, VercelResponse } from '@vercel/node';

// Minimal types to avoid import issues
interface WebhookRequest extends VercelRequest {
    body: any;
}

interface WebhookResponse extends VercelResponse {
    // VercelResponse already has status, json, setHeader, end
}

export default async function handler(req: WebhookRequest, res: WebhookResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-signature, x-request-id'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        console.log('[Webhook] DEBUG MODE - Request received');

        // Return success immediately to test if function runs
        return res.status(200).json({
            success: true,
            message: 'Webhook is ALIVE (Debug Mode)',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Webhook] CRITICAL ERROR:', error);
        return res.status(200).json({
            success: false,
            error: 'CRITICAL_HANDLER_ERROR',
            details: error.message
        });
    }
}
