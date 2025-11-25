
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ error: 'Domain required' });

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
    const TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN || !PROJECT_ID) {
        return res.status(500).json({ error: 'Missing config' });
    }

    try {
        // Try v9
        const url = `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`;
        const response = await fetch(url, {
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        });
        const data = await response.json();

        // Try config
        const configUrl = `https://api.vercel.com/v6/domains/${domain}/config${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`;
        const configRes = await fetch(configUrl, {
            headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        });
        const config = await configRes.json();

        return res.json({
            env: {
                hasToken: !!VERCEL_TOKEN,
                projectId: PROJECT_ID,
                teamId: TEAM_ID
            },
            domainData: data,
            configData: config
        });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
}
