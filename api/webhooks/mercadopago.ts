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
