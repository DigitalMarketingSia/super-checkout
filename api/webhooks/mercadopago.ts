import type { VercelRequest, VercelResponse } from '@vercel/node';

// Helper for UUID generation
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    console.log('[Webhook] POST request received');
    console.log('[Webhook] Headers:', JSON.stringify(req.headers));
    console.log('[Webhook] Body:', JSON.stringify(req.body));

    // FORCE LOG IMMEDIATELY
    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseKey) {
            const logEntry = {
                id: generateUUID(),
                event: 'webhook.force_log_post',
                payload: JSON.stringify({
                    method: req.method,
                    body: req.body,
                    timestamp: new Date().toISOString()
                }),
                processed: false,
                created_at: new Date().toISOString()
            };

            await fetch(`${supabaseUrl}/rest/v1/webhook_logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(logEntry)
            });

            console.log('[Webhook] Force log written');
        }
    } catch (logError: any) {
        console.error('[Webhook] Force log failed:', logError.message);
    }

    try {
        // Extract signature headers
        const xSignature = req.headers['x-signature'] as string || null;
        const xRequestId = req.headers['x-request-id'] as string || null;
        const payload = req.body;

        console.log('[Webhook] STEP 1: Extracted headers and payload');

        // DYNAMIC IMPORT: Load paymentService
        console.log('[Webhook] STEP 2: About to import paymentService...');
        const { paymentService } = await import('../../services/paymentService');
        console.log('[Webhook] STEP 3: paymentService imported successfully');

        // Process webhook through payment service
        console.log('[Webhook] STEP 4: About to call handleMercadoPagoWebhook...');
        const result = await paymentService.handleMercadoPagoWebhook(
            payload,
            xSignature,
            xRequestId
        );
        console.log('[Webhook] STEP 5: handleMercadoPagoWebhook completed. Result:', JSON.stringify(result));

        // Log result to database
        try {
            const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

            if (supabaseKey) {
                await fetch(`${supabaseUrl}/rest/v1/webhook_logs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        id: generateUUID(),
                        event: 'webhook.processing_result',
                        payload: JSON.stringify({
                            result: result,
                            payment_data: payload?.data,
                            timestamp: new Date().toISOString()
                        }),
                        processed: result.processed,
                        created_at: new Date().toISOString()
                    })
                });
                console.log('[Webhook] STEP 6: Result logged to database');
            }
        } catch (logError: any) {
            console.error('[Webhook] Failed to log result:', logError.message);
        }

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
        console.error('[Webhook] CRITICAL ERROR at some step:', error);
        console.error('[Webhook] Error stack:', error.stack);

        // Log error to database
        try {
            const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

            if (supabaseKey) {
                await fetch(`${supabaseUrl}/rest/v1/webhook_logs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        id: generateUUID(),
                        event: 'webhook.critical_error',
                        payload: JSON.stringify({
                            error: error.message,
                            stack: error.stack,
                            timestamp: new Date().toISOString()
                        }),
                        processed: false,
                        created_at: new Date().toISOString()
                    })
                });
            }
        } catch (logError) {
            console.error('[Webhook] Failed to log error:', logError);
        }

        // Return 200 with error details
        return res.status(200).json({
            success: false,
            error: 'CRITICAL_HANDLER_ERROR',
            details: error.message,
            stack: error.stack
        });
    }
}
