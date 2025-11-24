import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Load env vars from .env.local if possible, or expect them in environment
// Note: User might need to run this with `node --env-file=.env.local` or similar if using Node 20+
// Or we just assume they have them set or we hardcode for the test script (bad practice).
// Better: Use a simple fetch approach or ask user to set vars.

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus(orderId) {
    console.log(`Checking status for Order ID: ${orderId}`);

    try {
        // 1. Fetch Order and Payment
        const { data: orders, error: orderError } = await supabase
            .from('orders')
            .select('*,payments(*)')
            .eq('id', orderId);

        if (orderError) throw orderError;
        if (!orders || orders.length === 0) throw new Error('Order not found');

        const order = orders[0];
        console.log(`Order found. Current Status: ${order.status}`);

        const payment = order.payments?.[0];
        if (!payment) throw new Error('No payment record found for this order');

        console.log(`Payment record found: ${payment.id}, Transaction ID: ${payment.transaction_id}`);

        // 2. Fetch Gateway
        const { data: gateways, error: gatewayError } = await supabase
            .from('gateways')
            .select('*')
            .eq('id', payment.gateway_id);

        if (gatewayError) throw gatewayError;
        const gateway = gateways?.[0];

        if (!gateway || !gateway.private_key) throw new Error('Gateway credentials missing');

        console.log(`Gateway found: ${gateway.name}`);

        // 3. Check Mercado Pago
        console.log('Fetching status from Mercado Pago...');
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment.transaction_id}`, {
            headers: {
                'Authorization': `Bearer ${gateway.private_key}`
            }
        });

        if (!mpRes.ok) {
            const errText = await mpRes.text();
            throw new Error(`MP API Error: ${mpRes.status} - ${errText}`);
        }

        const mpData = await mpRes.json();
        console.log(`Mercado Pago Status: ${mpData.status}`);

        // 4. Simulate Update Logic
        let newStatus = 'pending';
        if (mpData.status === 'approved') newStatus = 'paid';
        else if (mpData.status === 'rejected' || mpData.status === 'cancelled') newStatus = 'failed';
        else if (mpData.status === 'refunded') newStatus = 'refunded';

        console.log(`Mapped Status: ${newStatus}`);

        if (newStatus !== order.status) {
            console.log('Status mismatch! The API would update this.');
        } else {
            console.log('Status matches. No update needed.');
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

// Get orderId from args
const orderId = process.argv[2];
if (!orderId) {
    console.log('Usage: node scripts/test-check-status.js <order_id>');
} else {
    checkStatus(orderId);
}
