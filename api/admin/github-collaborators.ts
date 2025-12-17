import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, githubUsername, licenseKey } = req.body;

    // Admin authentication - use a secure token
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    const validAdminToken = process.env.ADMIN_TOKEN || 'your-secure-admin-token';

    if (adminToken !== validAdminToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // GitHub Personal Access Token (needs admin:org permission)
    const githubToken = process.env.GITHUB_ADMIN_TOKEN;
    if (!githubToken) {
        return res.status(500).json({ error: 'GitHub admin token not configured' });
    }

    const repoOwner = 'DigitalMarketingSia';
    const repoName = 'super-checkout';

    try {
        if (action === 'add_collaborator') {
            if (!githubUsername) {
                return res.status(400).json({ error: 'Missing GitHub username' });
            }

            console.log(`[ADMIN] Adding collaborator: ${githubUsername}`);

            // Add user as collaborator with pull permission (read-only)
            const addRes = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/collaborators/${githubUsername}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        permission: 'pull' // Read-only access
                    })
                }
            );

            if (!addRes.ok) {
                const errorData = await addRes.json();
                throw new Error(errorData.message || 'Failed to add collaborator');
            }

            console.log(`[ADMIN] Collaborator added successfully: ${githubUsername}`);

            return res.status(200).json({
                success: true,
                message: `User ${githubUsername} added as collaborator`,
                username: githubUsername
            });
        }

        if (action === 'remove_collaborator') {
            if (!githubUsername) {
                return res.status(400).json({ error: 'Missing GitHub username' });
            }

            console.log(`[ADMIN] Removing collaborator: ${githubUsername}`);

            // Remove user as collaborator
            const removeRes = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/collaborators/${githubUsername}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!removeRes.ok && removeRes.status !== 204) {
                const errorData = await removeRes.json();
                throw new Error(errorData.message || 'Failed to remove collaborator');
            }

            console.log(`[ADMIN] Collaborator removed successfully: ${githubUsername}`);

            return res.status(200).json({
                success: true,
                message: `User ${githubUsername} removed as collaborator`,
                username: githubUsername
            });
        }

        if (action === 'list_collaborators') {
            console.log(`[ADMIN] Listing collaborators`);

            const listRes = await fetch(
                `https://api.github.com/repos/${repoOwner}/${repoName}/collaborators`,
                {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!listRes.ok) {
                const errorData = await listRes.json();
                throw new Error(errorData.message || 'Failed to list collaborators');
            }

            const collaborators = await listRes.json();

            return res.status(200).json({
                success: true,
                collaborators: collaborators.map((c: any) => ({
                    username: c.login,
                    permissions: c.permissions
                }))
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('[ADMIN] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
