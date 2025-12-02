import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';

// Supabase client will be initialized inside handler to prevent startup crashes

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // CORS
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

        if (req.method === 'OPTIONS') return res.status(200).end();
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const { action, code, licenseKey, projectRef, dbPass } = req.body;

        // 0. Initialize Supabase (Admin Context)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase Environment Variables');
            return res.status(500).json({ error: 'Server configuration error: Missing Supabase keys' });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
                const dbPass = generateStrongPassword();
                const createRes = await fetch('https://api.supabase.com/v1/projects', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: `Super Checkout ${Math.floor(Math.random() * 10000)}`,
                        organization_id: tokenData.organization_id, // You might need to fetch orgs first if not provided
                        db_pass: dbPass,
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
                            // Retry with first org
                            const dbPassRetry = generateStrongPassword();
                            const retryRes = await fetch('https://api.supabase.com/v1/projects', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    name: `Super Checkout ${Math.floor(Math.random() * 10000)}`,
                                    organization_id: orgs[0].id,
                                    db_pass: dbPassRetry,
                                    region: 'us-east-1',
                                    plan: 'free'
                                })
                            });
                            const retryData = await retryRes.json();
                            if (!retryRes.ok) throw new Error(retryData.message || 'Failed to create project');

                            // Fetch API Keys
                            const keysRes = await fetch(`https://api.supabase.com/v1/projects/${retryData.id}/api-keys`, {
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            const keysData = await keysRes.json();
                            if (!Array.isArray(keysData)) throw new Error('Failed to retrieve API keys: ' + JSON.stringify(keysData));
                            const anonKey = keysData.find((k: any) => k.name === 'anon')?.api_key;
                            const serviceKey = keysData.find((k: any) => k.name === 'service_role')?.api_key;

                            return res.status(200).json({
                                success: true,
                                projectRef: retryData.id,
                                dbPass: dbPassRetry,
                                anonKey,
                                serviceKey
                            });
                        }
                    }
                    throw new Error(projectData.message || 'Failed to create project');
                }

                // Fetch API Keys
                const keysRes = await fetch(`https://api.supabase.com/v1/projects/${projectData.id}/api-keys`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const keysData = await keysRes.json();
                if (!Array.isArray(keysData)) throw new Error('Failed to retrieve API keys: ' + JSON.stringify(keysData));
                const anonKey = keysData.find((k: any) => k.name === 'anon')?.api_key;
                const serviceKey = keysData.find((k: any) => k.name === 'service_role')?.api_key;

                return res.status(200).json({
                    success: true,
                    projectRef: projectData.id,
                    dbPass: dbPass,
                    anonKey,
                    serviceKey
                });
            }

            if (action === 'run_migrations') {
                if (!projectRef || !dbPass) {
                    return res.status(400).json({ error: 'Missing projectRef or dbPass' });
                }

                // Connection string for the NEW project
                // Format: postgres://postgres:[password]@db.[ref].supabase.co:5432/postgres
                const connectionString = `postgres://postgres:${dbPass}@db.${projectRef}.supabase.co:5432/postgres`;

                // Dynamic import to avoid startup crashes if pg is not used or has issues
                const { Client } = await import('pg');

                // Retry logic for DNS propagation
                let retries = 10;
                let client: any;

                while (retries > 0) {
                    try {
                        client = new Client({
                            connectionString,
                            ssl: { rejectUnauthorized: false }
                        });
                        await client.connect();
                        break; // Connected successfully
                    } catch (err: any) {
                        console.log(`Connection failed (retries left: ${retries}):`, err.message);
                        if (client) {
                            await client.end().catch(() => { });
                        }
                        retries--;
                        if (retries === 0) {
                            throw new Error(`Failed to connect to database after multiple attempts: ${err.message}`);
                        }
                        // Wait 5 seconds before retrying
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }

                try {
                    // Dynamic import of schema to prevent startup issues
                    const { schemaSql } = await import('./schema');

                    // Run the schema SQL
                    await client.query(schemaSql);

                    await client.end();

                    return res.status(200).json({ success: true, message: 'Migrations applied successfully' });
                } catch (dbError: any) {
                    console.error('Database Migration Error:', dbError);
                    if (client) {
                        await client.end().catch(() => { }); // Ensure close
                    }
                    throw new Error(`Migration failed: ${dbError.message}`);
                }
            }

            return res.status(400).json({ error: 'Invalid action' });

        } catch (error: any) {
            console.error('Supabase API Error:', error);
            return res.status(500).json({ error: error.message });
        }
    } catch (error: any) {
        console.error('Supabase API Critical Error:', error);
        return res.status(500).json({ error: error.message || 'Critical Server Error' });
    }
}

function generateStrongPassword() {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';
}
