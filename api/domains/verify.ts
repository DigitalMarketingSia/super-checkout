import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { domain } = req.query;

    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'Domain is required' });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
    const TEAM_ID = process.env.VERCEL_TEAM_ID;

    if (!VERCEL_TOKEN || !PROJECT_ID) {
        console.error('Missing Vercel configuration');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Get Domain Config (Status, Misconfigured, etc)
        const configRes = await fetch(
            `https://api.vercel.com/v6/domains/${domain}/config${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`,
            {
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                },
            }
        );
        const config = await configRes.json();

        // 2. Get Domain Status (Verification challenges)
        // Use v10 to match add.ts
        const domainRes = await fetch(
            `https://api.vercel.com/v10/projects/${PROJECT_ID}/domains/${domain}${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`,
            {
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                },
            }
        );
        const domainData = await domainRes.json();

        if (domainData.error) {
            if (domainData.error.code === 'not_found') {
                return res.status(404).json({ error: 'Domain not found in project' });
            }
            throw new Error(domainData.error.message);
        }

        // 3. Force Verification Check if challenges are missing but domain is not active
        let verificationChallenges = domainData.verification || [];

        if (verificationChallenges.length === 0 && !domainData.verified) {
            try {
                const verifyRes = await fetch(
                    `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}/verify${TEAM_ID ? `?teamId=${TEAM_ID}` : ''}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${VERCEL_TOKEN}`,
                        },
                    }
                );
                const verifyData = await verifyRes.json();
                if (verifyData.verification) {
                    verificationChallenges = verifyData.verification;
                }
            } catch (e) {
                console.warn('Failed to force verify:', e);
            }
        }

        return res.status(200).json({
            configured: !domainData.misconfigured,
            verified: domainData.verified,
            verification: verificationChallenges,
            status: domainData.misconfigured ? 'pending' : 'active',
            config,
            verificationChallenges: verificationChallenges.length > 0 ? verificationChallenges : (config.verification || []),
            ...domainData
        });

    } catch (error: any) {
        console.error('Error verifying domain:', error);
        return res.status(500).json({ error: error.message });
    }
}
