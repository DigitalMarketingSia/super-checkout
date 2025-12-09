// api/admin/members.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
// Force deploy fix admin role
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

                // 1.5Force Role to 'member' (Safety Check)
                // This prevents the user from accidentally getting 'admin' role if the trigger defaults incorrectly or if they are the first user (though normally only 1st user is admin via manual update).
                const { error: roleError } = await supabaseAdmin
                    .from('profiles')
                    .update({ role: 'member' })
                    .eq('id', userId);

                if (roleError) {
                    console.warn('Failed to enforce member role:', roleError);
                    // We continue, but this is a warning sign.
                }

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

                // 3. Find Context for Email (Member Area Slug)
                let memberAreaSlug = '';
                let memberAreaName = '';

                if (productIds && productIds.length > 0) {
                    try {
                        const firstProductId = productIds[0];
                        // Join: product -> product_contents -> contents -> member_areas
                        // This is complex in Supabase REST. We'll simplify: 
                        // Find a content linked to this product, then get its member_area_id.

                        const { data: pcData } = await supabaseAdmin
                            .from('product_contents')
                            .select('content_id')
                            .eq('product_id', firstProductId)
                            .limit(1)
                            .single();

                        if (pcData) {
                            const { data: contentData } = await supabaseAdmin
                                .from('contents')
                                .select('member_area_id')
                                .eq('id', pcData.content_id)
                                .single();

                            if (contentData) {
                                const { data: maData } = await supabaseAdmin
                                    .from('member_areas')
                                    .select('slug, name')
                                    .eq('id', contentData.member_area_id)
                                    .single();

                                if (maData) {
                                    memberAreaSlug = maData.slug;
                                    memberAreaName = maData.name;
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('Error finding member area context:', err);
                    }
                }

                // 4. Send Welcome Email
                try {
                    const baseUrl = req.headers.origin || 'https://super-checkout.vercel.app'; // Fallback
                    const accessUrl = memberAreaSlug
                        ? `${baseUrl}/app/${memberAreaSlug}/login`
                        : `${baseUrl}/login`; // Fallback to generic if no slug found (shouldn't happen if properly setup)

                    const welcomeHtml = `
                        <h1>Bem-vindo${memberAreaName ? ` ao ${memberAreaName}` : ''}!</h1>
                        <p>Sua conta foi criada manualmente por nossa equipe.</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Senha Temporária:</strong> ${tempPassword}</p>
                        <p>Para acessar seu conteúdo, clique no botão abaixo:</p>
                        <a href="${accessUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Acessar Área de Membros</a>
                        <p style="margin-top: 20px; font-size: 12px; color: #666;">Recomendamos que altere sua senha após o primeiro acesso.</p>
                    `;

                    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseServiceKey}`
                        },
                        body: JSON.stringify({
                            to: email,
                            subject: memberAreaName ? `Acesso Liberado: ${memberAreaName}` : 'Acesso Liberado - Boas vindas!',
                            html: welcomeHtml
                        })
                    });
                } catch (emailErr) {
                    console.warn('[Admin API] Email service unreachable or failed. Logging details:', emailErr);
                }

                // Return success immediately
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

            // --- DELETE USER ---
            if (action === 'delete') {
                const { userId, email } = data;
                let targetId = userId;

                if (!targetId && email) {
                    // Start by looking up by email if no ID
                    const { data: uData } = await supabaseAdmin.from('profiles').select('id').eq('email', email).single();
                    if (uData) {
                        targetId = uData.id;
                    } else {
                        // Profile missing (zombie user). Search in Auth directly.
                        // Note: listUsers is paginated, but for specific lookup we can try.
                        // Better approach if available: getUserById (needs id).
                        // Since we only have email, we must list.
                        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                            page: 1,
                            perPage: 1000 // Reasonable limit to find the user
                        });

                        if (!listError && users) {
                            const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                            if (found) targetId = found.id;
                        }
                    }
                }

                if (!targetId) return res.status(400).json({ error: 'UserId required' });

                // 1. Delete from Auth (Cascade should handle profile? No, usually other way around or manual)
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
                if (deleteError) {
                    console.error('Error deleting auth user:', deleteError);
                    return res.status(400).json({ error: deleteError.message });
                }

                // 2. Delete from Profiles (Manually to be safe if cascade missing)
                await supabaseAdmin.from('profiles').delete().eq('id', targetId);

                return res.status(200).json({ success: true });
            }

            // --- PROMOTE TO ADMIN (FIX) ---
            if (action === 'promote_admin') {
                const { email } = data;
                if (!email) return res.status(400).json({ error: 'Email required' });

                console.log('Promoting user to admin:', email);

                // 1. Find User in Auth
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                    page: 1,
                    perPage: 1000
                });

                if (listError || !users) {
                    console.error('List users error:', listError);
                    return res.status(500).json({ error: 'Failed to find user in auth' });
                }

                const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

                if (!user) return res.status(404).json({ error: 'User not found in Auth system' });

                // 2. Upsert Profile as Admin
                const { error: upsertError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        email: user.email,
                        role: 'admin',
                        updated_at: new Date().toISOString()
                    });

                if (upsertError) {
                    console.error('Upsert profile error:', upsertError);
                    return res.status(500).json({ error: upsertError.message });
                }

                return res.status(200).json({ success: true, userId: user.id });
            }

            return res.status(400).json({ error: 'Invalid action' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error: any) {
        console.error('Admin Member API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
