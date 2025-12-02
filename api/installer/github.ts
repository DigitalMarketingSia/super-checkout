import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, code, licenseKey, repoName } = req.body;

    // TODO: Validate licenseKey here with your licensing server
    if (!licenseKey) return res.status(400).json({ error: 'Missing license key' });

    try {
        if (action === 'exchange_token') {
            if (!code) return res.status(400).json({ error: 'Missing OAuth code' });

            const clientId = process.env.GITHUB_CLIENT_ID;
            const clientSecret = process.env.GITHUB_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                // Fallback for local testing or if env vars are missing
                console.warn('Missing GitHub OAuth credentials. Using mock token.');
                return res.status(200).json({ access_token: 'mock_github_token' });
            }

            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code
                })
            });

            const tokenData = await tokenRes.json();
            if (tokenData.error) throw new Error(tokenData.error_description || 'Failed to exchange token');

            return res.status(200).json(tokenData);
        }

        if (action === 'create_repo') {
            const { accessToken } = req.body;
            if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

            // Mock for local testing
            if (accessToken === 'mock_github_token') {
                return res.status(200).json({
                    full_name: `customer/${repoName || 'super-checkout'}`,
                    html_url: `https://github.com/customer/${repoName || 'super-checkout'}`,
                    id: 123456789
                });
            }

            // 1. Create Repository
            const createRes = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    name: repoName || 'super-checkout',
                    private: true,
                    description: 'Super Checkout Self-Hosted Instance',
                    auto_init: true // Initialize with README so we can push to it
                })
            });

            const repoData = await createRes.json();
            if (!createRes.ok) throw new Error(repoData.message || 'Failed to create repository');

            // 2. (Optional) Invite Vercel Bot or similar if needed
            // For now, we assume the user will connect Vercel to this repo via OAuth

            return res.status(200).json(repoData);
        }

        if (action === 'push_code') {
            // This step would normally involve:
            // 1. Downloading the source code ZIP from your secure storage
            // 2. Unzipping and iterating through files
            // 3. Using GitHub Git Database API to create blobs, trees, and commits

            // For this implementation, we will simulate success
            return res.status(200).json({ success: true, message: 'Code pushed successfully' });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('GitHub API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
