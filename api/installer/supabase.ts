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

                // Safe JSON parsing
                const contentType = tokenRes.headers.get('content-type');
                let tokenData: any;
                if (contentType && contentType.includes('application/json')) {
                    tokenData = await tokenRes.json();
                } else {
                    const textError = await tokenRes.text();
                    throw new Error(`OAuth token exchange failed (${tokenRes.status}): ${textError.substring(0, 200)}`);
                }
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

                // Safe JSON parsing
                const createContentType = createRes.headers.get('content-type');
                let projectData: any;
                if (createContentType && createContentType.includes('application/json')) {
                    projectData = await createRes.json();
                } else {
                    const textError = await createRes.text();
                    throw new Error(`Project creation failed (${createRes.status}): ${textError.substring(0, 200)}`);
                }
                if (!createRes.ok) {
                    // If org_id missing, try to fetch it
                    if (projectData.message?.includes('organization_id')) {
                        // Fetch orgs
                        const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        const orgsContentType = orgsRes.headers.get('content-type');
                        let orgs: any;
                        if (orgsContentType && orgsContentType.includes('application/json')) {
                            orgs = await orgsRes.json();
                        } else {
                            throw new Error('Failed to fetch organizations');
                        }
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
                            const retryContentType = retryRes.headers.get('content-type');
                            let retryData: any;
                            if (retryContentType && retryContentType.includes('application/json')) {
                                retryData = await retryRes.json();
                            } else {
                                const textError = await retryRes.text();
                                throw new Error(`Project creation retry failed (${retryRes.status}): ${textError.substring(0, 200)}`);
                            }
                            if (!retryRes.ok) throw new Error(retryData.message || 'Failed to create project');

                            return res.status(200).json({
                                success: true,
                                projectRef: retryData.id,
                                dbPass: dbPassRetry,
                                accessToken // Return token for migrations
                            });
                        }
                    }
                    throw new Error(projectData.message || 'Failed to create project');
                }

                return res.status(200).json({
                    success: true,
                    projectRef: projectData.id,
                    dbPass: dbPass,
                    accessToken // Return token for migrations
                });
            }

            if (action === 'run_migrations') {
                const { accessToken } = req.body;
                if (!projectRef || !accessToken) {
                    return res.status(400).json({ error: 'Missing projectRef or accessToken' });
                }

                // Load schema dynamically to avoid function size limits
                const fs = await import('fs/promises');
                const path = await import('path');
                const schemaPath = path.join(process.cwd(), 'api', 'installer', 'schema.ts');
                const schemaContent = await fs.readFile(schemaPath, 'utf-8');

                // Extract the SQL string from the TypeScript file
                const match = schemaContent.match(/export const schemaSql = `([\s\S]*?)`;/);
                if (!match) {
                    throw new Error('Failed to extract schema SQL from schema.ts');
                }
                const schemaSql = match[1];

                // Retry logic for API calls (Supabase might be provisioning)
                let retries = 3;
                while (retries > 0) {
                    try {
                        // Run SQL via Supabase Management API
                        // POST https://api.supabase.com/v1/projects/{ref}/query
                        const queryRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ query: schemaSql })
                        });

                        if (!queryRes.ok) {
                            const contentType = queryRes.headers.get('content-type');
                            let errorMessage = 'Failed to execute SQL query';

                            if (contentType && contentType.includes('application/json')) {
                                const errorData = await queryRes.json();
                                errorMessage = errorData.error?.message || errorData.message || errorMessage;
                            } else {
                                const textError = await queryRes.text();
                                errorMessage = `API Error (${queryRes.status}): ${textError.substring(0, 200)}`;
                            }

                            // If 5xx error, throw to trigger retry
                            if (queryRes.status >= 500) {
                                throw new Error(errorMessage);
                            }

                            // If 4xx error, it's likely permanent (e.g. syntax), so stop retrying
                            throw new Error(`Permanent Error: ${errorMessage}`);
                        }

                        return res.status(200).json({ success: true, message: 'Migrations applied successfully' });

                    } catch (dbError: any) {
                        console.error(`Migration Attempt Failed (retries left: ${retries}):`, dbError.message);
                        retries--;
                        if (retries === 0) {
                            throw new Error(`Migration failed after multiple attempts: ${dbError.message}`);
                        }
                        // Wait 2 seconds before retrying
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
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
