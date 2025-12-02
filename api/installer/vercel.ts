import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, code, licenseKey } = req.body;

    // 1. Validate License
    if (!licenseKey) return res.status(400).json({ error: 'Missing license key' });
    const { data: license, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('key', licenseKey)
        .single();

    if (licenseError || !license || license.status !== 'active') {
        return res.status(403).json({ error: 'Invalid or inactive license' });
    }

    try {
        if (action === 'create_project') {
            if (!code) return res.status(400).json({ error: 'Missing OAuth code' });

            const clientId = process.env.VERCEL_CLIENT_ID;
            const clientSecret = process.env.VERCEL_CLIENT_SECRET;
            const redirectUri = `${req.headers.origin}/installer`;

            if (!clientId || !clientSecret) {
                throw new Error('Missing Vercel OAuth credentials on server');
            }

            // 2. Exchange Code for Access Token
            const tokenRes = await fetch('https://api.vercel.com/v2/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code,
                    redirect_uri: redirectUri
                })
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Failed to exchange token');

            const accessToken = tokenData.access_token;
            const teamId = tokenData.team_id; // If installed in a team

            // 3. Create Project
            const createRes = await fetch(`https://api.vercel.com/v9/projects${teamId ? `?teamId=${teamId}` : ''}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'super-checkout-instance',
                    framework: 'vite'
                })
            });

            const projectData = await createRes.json();
            if (!createRes.ok) throw new Error(projectData.error?.message || 'Failed to create project');

            return res.status(200).json({
                success: true,
                projectName: projectData.name,
                projectId: projectData.id,
                projectUrl: projectData.link
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('Vercel API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
