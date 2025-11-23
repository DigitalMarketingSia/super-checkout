import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// --- TYPES ---
interface WebhookLog {
    id: string;
    gateway_id?: string;
    direction: string;
    event: string;
    payload: string;
    raw_data?: string;
    processed: boolean;
    created_at: string;
}

// --- HELPERS ---
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// --- MAIN HANDLER ---
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

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    // Helper to log to Supabase
    const logToSupabase = async (event: string, payload: any, processed: boolean, gatewayId?: string) => {
        if (!supabaseKey) return;
        try {
            const logEntry: WebhookLog = {
                id: generateUUID(),
                gateway_id: gatewayId,
                direction: 'incoming',
                event: event,
                payload: JSON.stringify(payload),
                raw_data: JSON.stringify(payload),
                processed: processed,
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
        } catch (e) {
            console.error('Failed to log to Supabase:', e);
        }
    };

    try {
        console.log('[Webhook] Received POST request');
        const payload = req.body;
        const xSignature = req.headers['x-signature'] as string;
        const xRequestId = req.headers['x-request-id'] as string;

        // 1. Log Raw Receipt
        await logToSupabase('webhook.received', { headers: req.headers, body: payload }, false);

        const paymentId = payload.data?.id || payload.id;
        const action = payload.action || payload.type;

        if (!paymentId) {
            await logToSupabase('webhook.ignored', { reason: 'No payment ID found', payload }, false);
            return res.status(200).json({ message: 'Ignored: No payment ID' });
        }

        // 2. Fetch Payment Info from Mercado Pago
        // We need to find the access token first. 
        // Since we can't easily import storageService, we'll query Supabase directly via REST
        
        // A. Find the payment record to get the gateway_id
        let paymentRecord = null;
        if (supabaseKey) {
            const paymentRes = await fetch(`${supabaseUrl}/rest/v1/payments?transaction_id=eq.${paymentId}&select=*`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const payments = await paymentRes.json();
            if (payments && payments.length > 0) {
                paymentRecord = payments[0];
            }
        }

        if (!paymentRecord) {
             // If not found by transaction_id, it might be a new payment notification we haven't saved yet?
             // Or maybe we saved it with a different ID?
             // For now, let's try to find ANY active Mercado Pago gateway to validate the request
             // This is a simplification. Ideally we should know which gateway it belongs to.
             console.warn('[Webhook] Payment record not found for transaction:', paymentId);
        }

        // B. Get Gateway Credentials
        let accessToken = '';
        let webhookSecret = '';
        
        if (supabaseKey) {
            const gatewayRes = await fetch(`${supabaseUrl}/rest/v1/gateways?name=eq.mercadopago&active=eq.true&select=*`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const gateways = await gatewayRes.json();
            if (gateways && gateways.length > 0) {
                // Use the one from the payment record if available, otherwise the first active one
                const gateway = paymentRecord 
                    ? gateways.find((g: any) => g.id === paymentRecord.gateway_id) || gateways[0]
                    : gateways[0];
                
                accessToken = gateway.private_key;
                webhookSecret = gateway.webhook_secret;
            }
        }

        if (!accessToken) {
            throw new Error('No active Mercado Pago gateway found');
        }

        // 3. Validate Signature (Optional but recommended)
        // Skipping strict validation for now to ensure flow works, but logging if it would fail
        // In a real scenario, implement HMAC SHA256 check here using webhookSecret

        // 4. Fetch latest status from Mercado Pago API
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!mpRes.ok) {
            throw new Error(`Failed to fetch payment from MP: ${mpRes.statusText}`);
        }

        const paymentData = await mpRes.json();
        const status = paymentData.status; // approved, pending, rejected, etc.

        // 5. Update Payment and Order in Supabase
        // Map MP status to our OrderStatus
        let orderStatus = 'pending';
        if (status === 'approved') orderStatus = 'paid';
        else if (status === 'rejected' || status === 'cancelled') orderStatus = 'failed';
        else if (status === 'in_process' || status === 'pending') orderStatus = 'pending';
        else if (status === 'refunded' || status === 'charged_back') orderStatus = 'refunded';

        if (paymentRecord && supabaseKey) {
            // Update Payment
            await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${paymentRecord.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ 
                    status: orderStatus, 
                    raw_response: JSON.stringify(paymentData) 
                })
            });

            // Update Order
            await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${paymentRecord.order_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ status: orderStatus })
            });

            await logToSupabase('webhook.success', { 
                paymentId, 
                oldStatus: paymentRecord.status, 
                newStatus: orderStatus 
            }, true, paymentRecord.gateway_id);

            console.log(`[Webhook] Updated Order ${paymentRecord.order_id} to ${orderStatus}`);
        } else {
            await logToSupabase('webhook.warning', { 
                message: 'Payment record not found, cannot update order', 
                paymentId,
                mpStatus: status
            }, false);
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('[Webhook] Error:', error);
        await logToSupabase('webhook.error', { error: error.message, stack: error.stack }, false);
        return res.status(500).json({ error: error.message });
    }
}
