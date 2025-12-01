import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Security: This endpoint should be protected. 
    // For simplicity in this MVP, we'll check for a secret header or assume it's called from a protected frontend context via RLS if we used the client-side auth.
    // BUT, since this is a serverless function using SERVICE_KEY, we MUST implement our own auth check or use the user's session token.

    // Let's use the user's session token passed in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    // Optional: Check if user is "Super Admin" (you)
    // const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    // if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    if (req.method === 'POST') {
        const { client_email, client_name, plan } = req.body;

        const { data, error } = await supabase
            .from('licenses')
            .insert({
                client_email,
                client_name,
                plan: plan || 'lifetime',
                status: 'active'
            })
            .select()
            .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
