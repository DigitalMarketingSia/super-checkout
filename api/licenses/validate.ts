import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Supabase Client (Admin Context)
// We need SERVICE_ROLE_KEY to bypass RLS and validate licenses globally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
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

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { key, domain } = req.method === 'POST' ? req.body : req.query;

    if (!key || !domain) {
        return res.status(400).json({ valid: false, message: 'Missing key or domain' });
    }

    try {
        // 1. Find License
        const { data: license, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('key', key)
            .single();

        if (error || !license) {
            // Log invalid attempt
            await supabase.from('validation_logs').insert({
                license_key: null, // Invalid key
                domain,
                valid: false,
                ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                user_agent: req.headers['user-agent']
            });

            return res.status(404).json({ valid: false, message: 'License not found' });
        }

        // 2. Check Status
        if (license.status !== 'active') {
            await logValidation(license.key, domain, false, req);
            return res.status(403).json({ valid: false, message: 'License suspended or inactive' });
        }

        // 3. Check Domain (First Activation or Match)
        if (!license.allowed_domain) {
            // First time activation! Bind domain.
            const { error: updateError } = await supabase
                .from('licenses')
                .update({ allowed_domain: domain, activated_at: new Date().toISOString() })
                .eq('key', key);

            if (updateError) {
                console.error('Error activating license:', updateError);
                return res.status(500).json({ valid: false, message: 'Activation failed' });
            }
        } else if (license.allowed_domain !== domain) {
            // Domain mismatch
            // Allow localhost for testing if needed, or strict check
            if (!domain.includes('localhost') && !domain.includes('vercel.app')) { // Optional dev overrides
                await logValidation(license.key, domain, false, req);
                return res.status(403).json({ valid: false, message: 'Domain mismatch' });
            }
        }

        // 4. Success
        await logValidation(license.key, domain, true, req);
        return res.status(200).json({
            valid: true,
            plan: license.plan,
            message: 'License valid'
        });

    } catch (err: any) {
        console.error('Validation error:', err);
        return res.status(500).json({ valid: false, message: 'Internal server error' });
    }
}

async function logValidation(key: string, domain: string, valid: boolean, req: VercelRequest) {
    await supabase.from('validation_logs').insert({
        license_key: key,
        domain,
        valid,
        ip_address: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
    });
}
