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

            // 1. Create Repository (Empty)
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
                    auto_init: false // Create empty to allow import
                })
            });

            const repoData = await createRes.json();
            if (!createRes.ok) throw new Error(repoData.message || 'Failed to create repository');

            return res.status(200).json(repoData);
        }

        if (action === 'push_code') {
            const { accessToken, repoName } = req.body;

            // Mock for local testing
            if (accessToken === 'mock_github_token') {
                return res.status(200).json({ success: true, message: 'Code pushed (mock)' });
            }

            // 2. Import Code from Source
            // We use the GitHub Import API to copy from the source repo
            // Source: DigitalMarketingSia/super-checkout

            // NOTE: If source is private, we need a PAT with repo access. 
            // For now assuming public or provided via env.
            const sourceUrl = 'https://github.com/DigitalMarketingSia/super-checkout.git';

            // Get user (owner) name
            const userRes = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const userData = await userRes.json();
            const owner = userData.login;

            const importRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/import`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    vcs: 'git',
                    vcs_url: sourceUrl
                })
            });

            const importData = await importRes.json();

            // 201 = Started, 200 = Restarted or Already in progress
            if (!importRes.ok) {
                // Check if it's already done (sometimes happens on retries)
                if (importRes.status === 422 && importData.message?.includes('already')) {
                    return res.status(200).json({ success: true, message: 'Import already in progress' });
                }
                throw new Error(importData.message || 'Failed to start import');
            }

            return res.status(200).json({ success: true, message: 'Import started', importUrl: importData.url });
        }

        if (action === 'check_import') {
            const { accessToken, repoName } = req.body;
            // Helper to check if import is done (optional, but good for UI)

            const userRes = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const userData = await userRes.json();
            const owner = userData.login;

            const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/import`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            const checkData = await checkRes.json();
            return res.status(checkRes.status).json(checkData);
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('GitHub API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
