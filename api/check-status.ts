import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define types locally since we are in a serverless function structure that might not share types easily with frontend
interface Order {
    id: string;
    status: string;
    payment_method: string;
    checkout_id: string;
    customer_email: string;
    customer_name: string;
    customer_user_id?: string;
    items?: any[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { orderId } = req.query;

    if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
        console.error('Missing Supabase Key');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Fetch Order
        const orderRes = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });

        if (!orderRes.ok) throw new Error('Failed to fetch order');

        const orders = await orderRes.json();
        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order: Order = orders[0];

        // If already paid, return immediately
        if (order.status === 'paid' || order.status === 'approved') {
            return res.status(200).json({ status: 'paid' });
        }

        // 2. Fetch Payment Record to get Transaction ID and Gateway
        const paymentRes = await fetch(`${supabaseUrl}/rest/v1/payments?order_id=eq.${orderId}&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });

        const payments = await paymentRes.json();

        if (!payments || payments.length === 0) {
            // No payment record yet? Maybe it's being created.
            return res.status(200).json({ status: order.status || 'pending' });
        }

        // Sort by created_at desc to get latest attempt
        const payment = payments.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (!payment.transaction_id) {
            return res.status(200).json({ status: order.status || 'pending' });
        }

        // 3. Fetch Gateway Credentials
        // We assume Mercado Pago for now as it's the context, or we check gateway_id
        const gatewayRes = await fetch(`${supabaseUrl}/rest/v1/gateways?id=eq.${payment.gateway_id}&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const gateways = await gatewayRes.json();

        if (!gateways || gateways.length === 0) {
            // Can't check, just return current status
            return res.status(200).json({ status: order.status });
        }

        const gateway = gateways[0];
        // Only support Mercado Pago active checks for now
        if (gateway.name !== 'Mercado Pago' && gateway.name !== 'mercado_pago') {
            return res.status(200).json({ status: order.status });
        }

        const accessToken = gateway.private_key;

        // 4. Check Status with Mercado Pago
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.transaction_id}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!mpRes.ok) {
            // If MP fails, just return current knowledge
            console.warn('MP API check failed', await mpRes.text());
            return res.status(200).json({ status: order.status });
        }

        const mpData = await mpRes.json();
        const mpStatus = mpData.status; // approved, pending, etc.

        // Map MP status to our types
        let newStatus = 'pending';
        if (mpStatus === 'approved') newStatus = 'paid';
        else if (mpStatus === 'rejected' || mpStatus === 'cancelled') newStatus = 'failed';
        else if (mpStatus === 'in_process' || mpStatus === 'pending') newStatus = 'pending';
        else if (mpStatus === 'refunded') newStatus = 'refunded';

        // 5. Update if changed
        // We compare strict 'paid' vs 'pending' etc.
        // Note: order.status might be 'PENDING' (uppercase) in some legacy, so normalize
        const currentStatusNorm = order.status.toLowerCase();

        if (newStatus !== currentStatusNorm && newStatus !== 'pending') {
            // Status changed to something final (paid, failed, refunded)
            // OR status changed from failed back to pending (unlikely)

            console.log(`[CheckStatus] Updating Order ${orderId}: ${currentStatusNorm} -> ${newStatus}`);

            // Update Order
            await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ status: newStatus })
            });

            // Update Payment
            await fetch(`${supabaseUrl}/rest/v1/payments?id=eq.${payment.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    status: newStatus,
                    raw_response: JSON.stringify(mpData)
                })
            });

            // If Paid, trigger email and access grant (call webhook handler logic manually or rely on webhook?)
            // Ideally we should call the same logic as the webhook.
            // For now, to keep it simple and safe, we just update the status. 
            // The webhook usually fires anyway. 
            // BUT if the webhook failed, this ensures the UI unblocks.
            // We will rely on the UI redirection to "Thank You" page.
            // Does the Thank You page/logic handle access granting? 
            // Usually access grant happens on webhook. 
            // If we update status here, we might miss access grant if we don't trigger it.

            // CRITICAL: We need to ensure access is granted.
            // We can replicate the grant logic here or trigger the webhook endpoint ourselves?
            // Let's replicate the basic grant logic if it's PAID.


            // Trigger Webhook Logic for Side Effects (Email, Access Grant)
            // If the webhook failed or wasn't delivered, this ensures the system processes the sale
            if (newStatus === 'paid') {
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const host = req.headers.host;
                const webhookUrl = `${protocol}://${host}/api/webhooks/mercadopago`;

                console.log(`[CheckStatus] Triggering webhook manually at ${webhookUrl}`);

                // Fire and await to ensure it runs
                try {
                    await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'payment.updated',
                            data: { id: payment.transaction_id }
                        })
                    });
                } catch (whErr) {
                    console.error('Failed to trigger webhook from check-status:', whErr);
                }
            }
        }

        return res.status(200).json({ status: newStatus });

    } catch (error: any) {
        console.error('Check Status Error:', error);
        // Do not fail the request to the client, just return pending so they keep polling
        return res.status(200).json({ status: 'pending', error: error.message });
    }
}
