// api/admin/members.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!supabaseServiceKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing Service Key' });
    }

    try {
        if (req.method === 'POST') {
            const { action, ...data } = req.body;

            // --- CREATE MEMBER ---
            if (action === 'create') {
                const { email, name, productIds } = data;

                if (!email) return res.status(400).json({ error: 'Email is required' });

                // 1. Create User
                // Generate a temporary password
                const tempPassword = Math.random().toString(36).slice(-12) + "A1!";

                console.log(`[Admin] Creating user ${email}`);

                const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email,
                    password: tempPassword,
                    email_confirm: true,
                    user_metadata: { name: name || email.split('@')[0] }
                });

                if (createError) {
                    console.error('Error creating user:', createError);
                    return res.status(400).json({ error: createError.message });
                }

                const userId = userData.user.id;

                // 2. Grant Access to Products
                if (productIds && productIds.length > 0) {
                    // Fetch product contents first to be thorough? 
                    // Or just insert into access_grants if we are linking to products directly?
                    // Currently `access_grants` links to `product_id`.

                    const grants = productIds.map((pid: string) => ({
                        user_id: userId,
                        product_id: pid,
                        status: 'active',
                        granted_at: new Date().toISOString()
                    }));

                    const { error: grantError } = await supabaseAdmin
                        .from('access_grants')
                        .insert(grants);

                    if (grantError) {
                        console.error('Error granting access:', grantError);
                        // Don't fail the whole request, but warn
                    }
                }

                // 3. Send Welcome Email
                // Using our send-email Edge Function or direct here if we had transport.
                // We'll verify if the 'send-email' function is available or just mock it.
                // Ideally, we call specific email logic.

                try {
                    const welcomeHtml = `
                        <h1>Bem-vindo!</h1>
                        <p>Sua conta foi criada manualmente por nossa equipe.</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Senha Temporária:</strong> ${tempPassword}</p>
                        <p>Recomendamos que altere sua senha após o primeiro acesso.</p>
                    `;

                    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseServiceKey}`
                        },
                        body: JSON.stringify({
                            to: email,
                            subject: 'Acesso Liberado - Boas vindas!',
                            html: welcomeHtml
                        })
                    });
                } catch (emailErr) {
                    // Fallback for development/missing Edge Function
                    console.warn('[Admin API] Email service unreachable or failed. Logging email content instead:');
                    console.log(`To: ${email}\nTemp Password: ${tempPassword}`);
                    // We continue despite email error to ensure user is created
                }

                return res.status(200).json({ success: true, userId });
            }

            // --- SUSPEND / BLOCK ---
            if (action === 'suspend') {
                const { userId } = data;
                if (!userId) return res.status(400).json({ error: 'UserId required' });

                // Update Profile status
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({ status: 'suspended' })
                    .eq('id', userId);

                if (error) throw error;

                // Also potentially ban in Auth?
                await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' }); // Ban for 100 years

                return res.status(200).json({ success: true });
            }

            // --- ACTIVATE ---
            if (action === 'activate') {
                const { userId } = data;

                // Update Profile
                await supabaseAdmin
                    .from('profiles')
                    .update({ status: 'active' })
                    .eq('id', userId);

                // Unban in Auth
                await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '0' });

                return res.status(200).json({ success: true });
            }

            // --- RESEND EMAIL ---
            if (action === 'resend_email') {
                const { userId, type } = data;
                // Type: 'welcome', 'reset_password', 'magic_link'

                const { data: user, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
                if (uErr || !user) return res.status(404).json({ error: 'User not found' });
                const email = user.user.email;

                if (type === 'reset_password') {
                    const { error } = await supabaseAdmin.auth.admin.generateLink({
                        type: 'recovery',
                        email: email!
                    });
                    // Note: generateLink returns a link, doesn't send email automatically unless configured?
                    // Actually `resetPasswordForEmail` sends it.
                    await supabaseAdmin.auth.resetPasswordForEmail(email!);
                }
                else if (type === 'magic_link') {
                    await supabaseAdmin.auth.signInWithOtp({ email: email! });
                }

                return res.status(200).json({ success: true, message: `Email ${type} triggered` });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Admin Member API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
