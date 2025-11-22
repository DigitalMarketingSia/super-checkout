import type { VercelRequest, VercelResponse } from '@vercel/node';

// Minimal types to avoid import issues
interface WebhookRequest extends VercelRequest {
    body: any;
}

interface WebhookResponse extends VercelResponse {
    status: (code: number) => WebhookResponse;
    json: (data: any) => void;
    setHeader: (key: string, value: string | number | readonly string[]) => WebhookResponse;
    end: () => void;
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

    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Extract signature headers
        const xSignature = req.headers['x-signature'] || null;
        const xRequestId = req.headers['x-request-id'] || null;
        const payload = req.body;

        console.log('[Webhook] Received notification:', {
            signature: xSignature ? 'present' : 'missing',
            requestId: xRequestId,
            action: payload?.action,
            type: payload?.type
        });

        // DYNAMIC IMPORT: Load paymentService here to catch initialization errors
        console.log('[Webhook] Loading paymentService...');
        const { paymentService } = await import('../../services/paymentService');
        const { supabase } = await import('../../services/supabase'); // Import supabase directly to log

        // DEBUG: Immediate Log to DB to verify connectivity
        await supabase.from('webhook_logs').insert({
            id: `debug_${Date.now()}`,
            event: 'webhook.received_debug',
            payload: JSON.stringify({
                headers: req.headers,
                body: payload,
                env_check: {
                    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                    node_env: process.env.NODE_ENV
                }
            }),
            processed: false,
            created_at: new Date().toISOString()
        });

        console.log('[Webhook] paymentService loaded successfully');

        // Process webhook through payment service
        const result = await paymentService.handleMercadoPagoWebhook(
            payload,
            xSignature,
            xRequestId
        );

        if (result.processed) {
            return res.status(200).json({
                success: true,
                message: 'Webhook processed successfully'
            });
        } else {
            return res.status(200).json({
                success: false,
                message: result.message || 'Webhook received but not processed'
            });
        }

    } catch (error: any) {
        console.error('[Webhook] CRITICAL ERROR:', error);

        // Return 200 with error details so we can see it in MP Dashboard
        return res.status(200).json({
            success: false,
            error: 'CRITICAL_HANDLER_ERROR',
            details: error.message,
            stack: error.stack,
            stage: 'execution_or_import'
        });
    }
}
