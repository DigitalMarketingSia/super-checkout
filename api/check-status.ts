import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { orderId } = req.query;

    if (!orderId) {
        return res.status(400).json({ error: 'Missing orderId' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseKey) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Fetch Order and Payment
        const orderRes = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${orderId}&select=*,payments(*)`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });

        if (!orderRes.ok) throw new Error('Failed to fetch order');
        const orders = await orderRes.json();
        const order = orders[0];

        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Find the latest payment
        const payment = order.payments?.[0]; // Assuming one payment or taking the first one
        if (!payment) return res.status(404).json({ error: 'No payment record found' });

        // 2. Fetch Gateway Credentials
        const gatewayRes = await fetch(`${supabaseUrl}/rest/v1/gateways?id=eq.${payment.gateway_id}&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });

        if (!gatewayRes.ok) throw new Error('Failed to fetch gateway');
        const gateways = await gatewayRes.json();
        const gateway = gateways[0];

        if (!gateway || !gateway.private_key) {
            return res.status(500).json({ error: 'Gateway credentials missing' });
        }

        // 3. Fetch Status from Mercado Pago
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.transaction_id}`, {
            headers: {
                'Authorization': `Bearer ${gateway.private_key}`
            }
        });

        if (!mpRes.ok) {
            return res.status(500).json({ error: 'Failed to fetch status from Mercado Pago' });
        }

        const mpData = await mpRes.json();
        const mpStatus = mpData.status;

        // Map Status
        let newStatus = 'pending';
        if (mpStatus === 'approved') newStatus = 'paid';
        else if (mpStatus === 'rejected' || mpStatus === 'cancelled') newStatus = 'failed';
        else if (mpStatus === 'refunded') newStatus = 'refunded';

        // 4. Update if changed
        if (newStatus !== order.status) {
            console.log(`[CheckStatus] Updating Order ${orderId}: ${order.status} -> ${newStatus}`);

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

            // 5. Send Email if PAID
            if (newStatus === 'paid') {
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

                // Trigger email sending via Edge Function
                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
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
            }
        }

        return res.status(200).json({
            status: newStatus,
            mpStatus: mpStatus
        });

    } catch (error: any) {
        console.error('[CheckStatus] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
