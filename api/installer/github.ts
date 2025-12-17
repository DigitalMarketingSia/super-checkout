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

            // Use GitHub template generation API (works with private templates)
            const sourceOwner = 'DigitalMarketingSia';
            const sourceRepo = 'super-checkout';

            console.log(`[DEBUG] Generating repository from template ${sourceOwner}/${sourceRepo}`);

            // Generate repository from template
            const templateRes = await fetch(`https://api.github.com/repos/${sourceOwner}/${sourceRepo}/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github+json'
                },
                body: JSON.stringify({
                    name: repoName || 'super-checkout',
                    description: 'Super Checkout Self-Hosted Instance',
                    private: true,
                    include_all_branches: false
                })
            });

            const templateData = await templateRes.json();

            if (!templateRes.ok) {
                console.error('[ERROR] Template generation failed:', templateData);
                throw new Error(templateData.message || 'Failed to generate repository from template');
            }

            console.log('[DEBUG] Repository generated successfully:', templateData.full_name);

            return res.status(200).json(templateData);
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('GitHub API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
