import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// This would be your "Central" Supabase instance that manages the installer
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
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

            const clientId = process.env.SUPABASE_CLIENT_ID;
            const clientSecret = process.env.SUPABASE_CLIENT_SECRET;
            const redirectUri = `${req.headers.origin}/installer`;

            if (!clientId || !clientSecret) {
                throw new Error('Missing Supabase OAuth credentials on server');
            }

            // 2. Exchange Code for Access Token
            const tokenRes = await fetch('https://api.supabase.com/v1/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri
                })
            });

            const tokenData = await tokenRes.json();
            if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Failed to exchange token');

            const accessToken = tokenData.access_token;

            // 3. Create Project
            const createRes = await fetch('https://api.supabase.com/v1/projects', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'Super Checkout',
                    organization_id: tokenData.organization_id, // You might need to fetch orgs first if not provided
                    db_pass: generateStrongPassword(),
                    region: 'us-east-1',
                    plan: 'free'
                })
            });

            // Note: If org_id is missing, we might need an extra step to list orgs and pick one.
            // For now, assuming user picks or we pick first.

            const projectData = await createRes.json();
            if (!createRes.ok) {
                // If org_id missing, try to fetch it
                if (projectData.message?.includes('organization_id')) {
                    // Fetch orgs
                    const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    const orgs = await orgsRes.json();
                    if (orgs.length > 0) {
                        // Retry with first org
                        const retryRes = await fetch('https://api.supabase.com/v1/projects', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                name: 'Super Checkout',
                                organization_id: orgs[0].id,
                                db_pass: generateStrongPassword(),
                                region: 'us-east-1',
                                plan: 'free'
                            })
                        });
                        const retryData = await retryRes.json();
                        if (!retryRes.ok) throw new Error(retryData.message || 'Failed to create project');

                        return res.status(200).json({
                            success: true,
                            projectRef: retryData.id,
                            dbPass: retryData.db_pass // In real flow, save this securely!
                        });
                    }
                }
                throw new Error(projectData.message || 'Failed to create project');
            }

            return res.status(200).json({
                success: true,
                projectRef: projectData.id,
                dbPass: projectData.db_pass
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('Supabase API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

function generateStrongPassword() {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';
}
