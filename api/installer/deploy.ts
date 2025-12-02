import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // This endpoint could be used to track the overall status of an installation
    // stored in the Central DB, so if the user refreshes, they pick up where they left off.

    if (req.method === 'GET') {
        const { licenseKey } = req.query;
        // Check installation status for this license
        return res.status(200).json({ status: 'idle', step: 0 });
    }

    if (req.method === 'POST') {
        const { licenseKey, step, data } = req.body;
        // Update status
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
