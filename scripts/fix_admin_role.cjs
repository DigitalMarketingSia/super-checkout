
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Robust Env Loading
let env = {};
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                if (key && value) env[key] = value;
            }
        });
    }
} catch (e) {
    console.log('Error reading env:', e.message);
}

// Merge with process.env
Object.assign(process.env, env);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars.');
    console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    const targetEmail = 'contato.jeandamin@gmail.com';
    console.log(`Fixing admin role for: ${targetEmail}`);

    // 1. Get User ID from Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    const user = users.find(u => u.email && u.email.toLowerCase() === targetEmail.toLowerCase());

    if (!user) {
        console.error('User NOT FOUND in Auth. Cannot promote to admin.');
        return;
    }

    console.log(`Found User ID: ${user.id}`);

    // 2. Upsert Profile
    const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            role: 'admin',
            updated_at: new Date().toISOString()
        });

    if (upsertError) {
        console.error('Error updating profile:', upsertError);
    } else {
        console.log('SUCCESS: Profile updated to ADMIN role.');
    }
}

main();
