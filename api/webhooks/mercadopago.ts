import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // ULTRA SIMPLE TEST - No imports, no dependencies
    console.log('[Webhook] ULTRA SIMPLE TEST - Function is executing!');
    console.log('[Webhook] Method:', req.method);
    console.log('[Webhook] Headers:', JSON.stringify(req.headers));
    console.log('[Webhook] Body:', JSON.stringify(req.body));

    // FORCE LOG IMMEDIATELY - Before ANY processing
    if (req.method === 'POST') {
        try {
            const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

            if (supabaseKey) {
                // Generate valid UUID
                const generateUUID = () => {
                    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                };

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
    }

    try {
        // Try to connect to Supabase using direct fetch (no imports)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        console.log('[Webhook] Supabase URL:', supabaseUrl);
        console.log('[Webhook] Has Service Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log('[Webhook] Has Anon Key:', !!process.env.VITE_SUPABASE_ANON_KEY);

        if (supabaseKey) {
            // Generate valid UUID
            const generateUUID = () => {
                if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            };

            const logEntry = {
                id: generateUUID(),
                event: 'webhook.ultra_simple_test',
                payload: JSON.stringify({
                    method: req.method,
                    headers: req.headers,
                    body: req.body,
                    env: {
                        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                        has_anon_key: !!process.env.VITE_SUPABASE_ANON_KEY,
                        node_env: process.env.NODE_ENV
                    }
                }),
                processed: false,
                created_at: new Date().toISOString()
            };

            console.log('[Webhook] Attempting to write log:', JSON.stringify(logEntry));

            const response = await fetch(`${supabaseUrl}/rest/v1/webhook_logs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(logEntry)
            });

            console.log('[Webhook] Supabase response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[Webhook] Supabase error:', errorText);
            } else {
                console.log('[Webhook] Log written successfully!');
            }
        } else {
            console.error('[Webhook] No Supabase key available!');
        }

        return res.status(200).json({
            success: true,
            message: 'Ultra simple webhook test executed',
            timestamp: new Date().toISOString(),
            env_check: {
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                has_anon_key: !!process.env.VITE_SUPABASE_ANON_KEY
            }
        });

    } catch (error: any) {
        console.error('[Webhook] CRITICAL ERROR:', error);
        return res.status(200).json({
            success: false,
            error: 'CRITICAL_ERROR',
            message: error.message,
            stack: error.stack
        });
    }
}
