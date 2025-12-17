import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { key, domain } = req.body;

    if (!key) return res.status(400).json({ valid: false, message: 'License key is required' });

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase Environment Variables');
            return res.status(500).json({ valid: false, message: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: license, error } = await supabase
            .from('licenses')
            .select('*')
            .eq('key', key)
            .single();

        if (error || !license) {
            return res.status(200).json({ valid: false, message: 'Invalid license key' });
        }

        if (license.status !== 'active') {
            return res.status(200).json({ valid: false, message: 'License is not active' });
        }

        // Optional: Update license with domain if not set (bind on first use)
        // Or check if domain matches if already set.
        // For now, just valid.

        return res.status(200).json({ valid: true });

    } catch (error: any) {
        console.error('License Validation Error:', error);
        return res.status(500).json({ valid: false, message: 'Internal Server Error' });
    }
}
