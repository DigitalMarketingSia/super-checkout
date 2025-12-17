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

        if (action === 'fork_repo') {
            const { accessToken } = req.body;
            if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

            // Mock for local testing
            if (accessToken === 'mock_github_token') {
                return res.status(200).json({
                    full_name: `customer/${repoName || 'super-checkout'}`,
                    html_url: `https://github.com/customer/${repoName || 'super-checkout'}`,
                    clone_url: `https://github.com/customer/${repoName || 'super-checkout'}.git`,
                    id: 123456789
                });
            }

            // Fork the main repository
            const sourceOwner = 'DigitalMarketingSia';
            const sourceRepo = 'super-checkout';

            console.log(`[DEBUG] Creating fork of ${sourceOwner}/${sourceRepo}`);

            const forkRes = await fetch(`https://api.github.com/repos/${sourceOwner}/${sourceRepo}/forks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    name: repoName || 'super-checkout',
                    default_branch_only: true
                })
            });

            const forkData = await forkRes.json();

            if (!forkRes.ok) {
                console.error('[ERROR] Fork creation failed:', forkData);
                throw new Error(forkData.message || 'Failed to fork repository');
            }

            console.log('[DEBUG] Fork created successfully:', forkData.full_name);

            return res.status(200).json(forkData);
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('GitHub API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
