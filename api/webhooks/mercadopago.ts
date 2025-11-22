import { paymentService } from '../../services/paymentService';

/**
 * MERCADO PAGO WEBHOOK ENDPOINT
 * 
 * Receives notifications from Mercado Pago when payment status changes.
 * 
 * Setup Instructions:
 * 1. Deploy this endpoint to production
 * 2. Get your public URL (e.g., https://yourdomain.com)
 * 3. Configure webhook in Mercado Pago Dashboard:
 *    - URL: https://yourdomain.com/api/webhooks/mercadopago
 *    - Events: payment, merchant_order
 * 
 * For local development:
 * 1. Install ngrok: npm install -g ngrok
 * 2. Run: ngrok http 5173
 * 3. Use the ngrok URL in MP dashboard temporarily
 */

interface WebhookRequest {
    method: string;
    headers: {
        'x-signature'?: string;
        'x-request-id'?: string;
    };
    body: any;
}

interface WebhookResponse {
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
            stack: error.stack
        });
    }
}
