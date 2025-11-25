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
        let currentTeamId = TEAM_ID;
        let configRes = await fetch(
            `https://api.vercel.com/v6/domains/${domain}/config${currentTeamId ? `?teamId=${currentTeamId}` : ''}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );
        let config = await configRes.json();

        // AUTO-DETECT TEAM ID if 403 Forbidden
        if (config.error && config.error.code === 'forbidden' && config.error.message.includes('scope')) {
            try {
                // Extract scope (slug) from error message
                // Message format: "Not authorized: Trying to access resource under scope "SLUG". ..."
                const match = config.error.message.match(/scope "([^"]+)"/);
                if (match && match[1]) {
                    const slug = match[1];
                    // Fetch Team ID by slug
                    const teamsRes = await fetch(`https://api.vercel.com/v2/teams?slug=${slug}`, {
                        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
                    });
                    const teamsData = await teamsRes.json();
                    if (teamsData.teams && teamsData.teams.length > 0) {
                        currentTeamId = teamsData.teams[0].id;

                        // RETRY CONFIG with new Team ID
                        configRes = await fetch(
                            `https://api.vercel.com/v6/domains/${domain}/config?teamId=${currentTeamId}`,
                            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
                        );
                        config = await configRes.json();
                    }
                }
            } catch (e) {
                console.warn('Failed to auto-detect team:', e);
            }
        }

        // 2. Get Domain Status (Verification challenges)
        const domainRes = await fetch(
            `https://api.vercel.com/v10/projects/${PROJECT_ID}/domains/${domain}${currentTeamId ? `?teamId=${currentTeamId}` : ''}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );
        const domainData = await domainRes.json();

        if (domainData.error) {
            if (domainData.error.code === 'not_found') {
                return res.status(404).json({ error: 'Domain not found in project' });
            }
            throw new Error(domainData.error.message);
        }

        // 3. Force Verification Check
        let verificationChallenges = domainData.verification || [];
        let verifyData = null;
        const configFailed = !!config.error;

        // If challenges missing, try POST verify
        if (verificationChallenges.length === 0) {
            try {
                const verifyRes = await fetch(
                    `https://api.vercel.com/v9/projects/${PROJECT_ID}/domains/${domain}/verify${currentTeamId ? `?teamId=${currentTeamId}` : ''}`,
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
                    }
                );
                verifyData = await verifyRes.json();
                if (verifyData.verification) {
                    verificationChallenges = verifyData.verification;
                }
            } catch (e) {
                console.warn('Failed to force verify:', e);
            }
        }

        // Determine misconfigured status
        const isMisconfigured = domainData.misconfigured || config.misconfigured || configFailed;

        return res.status(200).json({
            configured: !isMisconfigured,
            verified: domainData.verified,
            verification: verificationChallenges,
            status: isMisconfigured ? 'pending' : 'active',
            config,
            verificationChallenges: verificationChallenges.length > 0 ? verificationChallenges : (config.verification || []),
            // DEBUG DATA
            debug_domain: domainData,
            debug_verify: verifyData || null,
            debug_config: config,
            detected_team_id: currentTeamId,
            ...domainData,
            misconfigured: isMisconfigured
        });

    } catch (error: any) {
        console.error('Error verifying domain:', error);
        return res.status(500).json({ error: error.message });
    }
}
