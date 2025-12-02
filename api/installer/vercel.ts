import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'POST') {
        const { action, code, licenseKey } = req.body;

        // Validate License First
        const { data: license, error: licenseError } = await supabase
            .from('licenses')
            .select('*')
            .eq('key', licenseKey)
            .eq('status', 'active')
            .single();

        if (licenseError || !license) {
            return res.status(403).json({ error: 'Invalid or inactive license key' });
        }

        if (action === 'auth') {
            // 1. Exchange OAuth code for Access Token
            // const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', ...)

            return res.status(200).json({
                success: true,
                accessToken: 'v_mock_token_' + Date.now(),
                teamId: null // or team ID if selected
            });
        }

        if (action === 'deploy') {
            // 2. Create Project & Trigger Deploy
            // We would use the Vercel API to create a project and link it to the repo
            // Then set env vars (SUPABASE_URL, etc)

            return res.status(200).json({
                success: true,
                deployment: {
                    id: 'dpl_' + Date.now(),
                    url: 'super-checkout-customer.vercel.app',
                    state: 'BUILDING'
                }
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
