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
        if (!supabaseKey) {
            console.warn('[Webhook] No Supabase Key available for logging');
            return;
        }
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
        } catch (e: any) {
            console.error('Failed to log to Supabase:', e.message);
        }
    };

    try {
        console.log('[Webhook] Received POST request');
        const payload = req.body;

        // 1. Log Raw Receipt
        await logToSupabase('webhook.received', { headers: req.headers, body: payload }, false);

        const paymentId = payload.data?.id || payload.id;
        const action = payload.action || payload.type;

        if (!paymentId) {
            await logToSupabase('webhook.ignored', { reason: 'No payment ID found', payload }, false);
            return res.status(200).json({ message: 'Ignored: No payment ID' });
        }

        // 2. Fetch Payment Info from Mercado Pago

        // A. Find the payment record to get the gateway_id
        let paymentRecord = null;
        if (supabaseKey) {
            try {
                console.log(`[Webhook] Fetching payment record for transaction ${paymentId}`);
                const paymentRes = await fetch(`${supabaseUrl}/rest/v1/payments?transaction_id=eq.${paymentId}&select=*`, {
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                });

                if (!paymentRes.ok) {
                    throw new Error(`Supabase Payment Fetch Error: ${paymentRes.status} ${paymentRes.statusText}`);
                }

                const payments = await paymentRes.json();
                if (payments && payments.length > 0) {
                    paymentRecord = payments[0];
                    console.log(`[Webhook] Found payment record: ${paymentRecord.id}`);
                } else {
                    console.warn(`[Webhook] No payment record found for transaction ${paymentId}`);
                }
            } catch (fetchError: any) {
                console.error('[Webhook] Error fetching payment:', fetchError);
                await logToSupabase('webhook.error_fetching_payment', { error: fetchError.message }, false);
            }
        }

        // B. Get Gateway Credentials
        let accessToken = '';

        if (supabaseKey) {
            try {
                console.log('[Webhook] Fetching gateway credentials');
                // FIX: Database name is 'mercado_pago', not 'mercadopago'
                const gatewayRes = await fetch(`${supabaseUrl}/rest/v1/gateways?name=eq.mercado_pago&active=eq.true&select=*`, {
                    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
                });

                if (!gatewayRes.ok) {
                    throw new Error(`Supabase Gateway Fetch Error: ${gatewayRes.status} ${gatewayRes.statusText}`);
                }

                const gateways = await gatewayRes.json();
                if (gateways && gateways.length > 0) {
                    // Use the one from the payment record if available, otherwise the first active one
                    // This fallback is CRITICAL if the payment record wasn't found (e.g. race condition)
                    const gateway = (paymentRecord && gateways.find((g: any) => g.id === paymentRecord.gateway_id)) || gateways[0];

                    accessToken = gateway.private_key;
                    console.log(`[Webhook] Using gateway: ${gateway.id}`);
                } else {
                    console.error('[Webhook] No active Mercado Pago gateways found');
                }
            } catch (fetchError: any) {
                console.error('[Webhook] Error fetching gateways:', fetchError);
                await logToSupabase('webhook.error_fetching_gateway', { error: fetchError.message }, false);
            }
        }

        if (!accessToken) {
            await logToSupabase('webhook.error_no_token', { message: 'No active Mercado Pago gateway found' }, false);
            throw new Error('No active Mercado Pago gateway found');
        }

        // 4. Fetch latest status from Mercado Pago API
        console.log(`[Webhook] Fetching status from MP for payment ${paymentId}`);
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!mpRes.ok) {
            const errorText = await mpRes.text();
            await logToSupabase('webhook.error_mp_api', { status: mpRes.status, body: errorText }, false);
            throw new Error(`Failed to fetch payment from MP: ${mpRes.statusText}`);
        }

        const paymentData = await mpRes.json();
        const status = paymentData.status; // approved, pending, rejected, etc.
        console.log(`[Webhook] MP Status: ${status}`);

        // 5. Update Payment and Order in Supabase
        // Map MP status to our OrderStatus
        let orderStatus = 'pending';
        if (status === 'approved') orderStatus = 'paid';
        else if (status === 'rejected' || status === 'cancelled') orderStatus = 'failed';
        else if (status === 'in_process' || status === 'pending') orderStatus = 'pending';
        else if (status === 'refunded' || status === 'charged_back') orderStatus = 'refunded';

        if (paymentRecord && supabaseKey) {
            try {
                console.log(`[Webhook] Updating Payment ${paymentRecord.id} and Order ${paymentRecord.order_id}`);

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
            } catch (updateError: any) {
                console.error('[Webhook] Error updating records:', updateError);
                await logToSupabase('webhook.error_updating_records', { error: updateError.message }, false);
            }
        }
    } else {
        // If we don't have a payment record, we can't update the order directly.
        // But we should log this as a warning. In a more advanced system, we might want to create the record.
        await logToSupabase('webhook.warning', {
            message: 'Payment record not found, cannot update order',
            paymentId,
            mpStatus: status
        }, false);
    }

    // 6. Send Email if Payment is Approved

    if (orderStatus === 'paid' && paymentRecord && supabaseKey) {
        try {
            console.log(`[Webhook] Attempting to send approval email for Order ${paymentRecord.order_id}`);

            // Fetch full order details
            const orderRes = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${paymentRecord.order_id}&select=*`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });

            if (orderRes.ok) {
                const orders = await orderRes.json();
                const order = orders[0];

                if (order && order.customer_email) {
                    const productName = order.items?.[0]?.name || 'seu produto';

                    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Acesso Liberado!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6;">
<center style="width: 100%; background-color: #f6f6f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px 0; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff; text-align: center;">
                    <p style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-top: 0; margin-bottom: 20px;">
                        Olá, ${order.customer_name}!
                    </p>
                    <p style="font-size: 16px; line-height: 1.5; color: #555555; margin-bottom: 30px;">
                        Seu pagamento para o produto <strong>${productName}</strong> foi aprovado com sucesso!
                        <br>Você já pode acessar seu produto e começar agora mesmo.
                    </p>
                    <div style="margin: 0 auto 40px auto; display: block;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: auto;">
                            <tr>
                                <td style="border-radius: 6px; background: #007bff; text-align: center;">
                                    <a href="#" target="_blank" 
                                       style="background: #007bff; border: 1px solid #007bff; padding: 12px 25px; color: #ffffff; display: inline-block; 
                                              font-family: Arial, sans-serif; font-size: 17px; font-weight: bold; text-decoration: none; border-radius: 6px;">
                                        ACESSAR ÁREA DE MEMBROS
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <p style="font-size: 14px; line-height: 1.5; color: #555555; margin-top: 0; margin-bottom: 20px;">
                        Conte com nosso time de suporte se precisar de qualquer ajuda.<br>
                        Atenciosamente,<br>
                        <strong>Super Checkout</strong>
                    </p>
                </td>
            </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #AAAAAA; text-align: center; border-top: 1px solid #eeeeee; margin-top: 30px;">
                    Este é um e-mail automático transacional e não deve ser respondido.<br>
                    Seu ${productName} é um lançamento da Super Checkout.
                </td>
            </tr>
        </table>
    </div>
</center>
</body>
</html>
                    `;

                    // Call Edge Function to send email
                    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({
                            to: order.customer_email,
                            subject: `Pagamento Aprovado - Acesso Liberado!`,
                            html
                        })
                    });

                    if (emailRes.ok) {
                        console.log(`[Webhook] Email sent successfully to ${order.customer_email}`);
                        await logToSupabase('webhook.email_sent', { orderId: order.id, email: order.customer_email }, true, paymentRecord.gateway_id);
                    } else {
                        const errText = await emailRes.text();
                        console.error(`[Webhook] Failed to send email: ${errText}`);
                        await logToSupabase('webhook.error_sending_email', { error: errText }, false);
                    }
                }
            }
        } catch (emailError: any) {
            console.error('[Webhook] Error in email sending flow:', emailError);
            await logToSupabase('webhook.error_email_flow', { error: emailError.message }, false);
        }
    }


    return res.status(200).json({ success: true });

} catch (error: any) {
    console.error('[Webhook] Critical Error:', error);
    // Try to log the critical error if possible
    try {
        // Re-define logToSupabase locally if needed or just use the one in scope if valid
        // Assuming logToSupabase is available in scope
    } catch (e) { }

    return res.status(500).json({ error: error.message });
}
}
