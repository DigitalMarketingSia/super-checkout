
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Try loading dotenv if available
try {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
} catch (e) {
    console.log('Dotenv not found or error:', e.message);
}

// Fallback manual verify
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');
        lines.forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) process.env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
        });
    } catch (e) { console.log('Manual read failed', e.message); }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars.');
    console.log('Available SUPABASE keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    console.log('--- STARTING CLEANUP (CJS) ---');
    const targetEmail = 'contato.digitalmarketingsia@gmail.com';
    console.log(`Target Email: ${targetEmail}`);

    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    console.log(`Total users found: ${users.length}`);

    const user = users.find(u => u.email && u.email.toLowerCase() === targetEmail.toLowerCase());

    if (user) {
        console.log(`FOUND User: ID=${user.id} Email=${user.email}`);
        console.log('Deleting...');
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id);
        if (delError) {
            console.error('Error deleting user:', delError);
        } else {
            console.log('SUCCESS: User deleted from Auth.');
        }
    } else {
        console.log(`User NOT FOUND in list. Listing all emails found:`);
        users.forEach(u => console.log(` - ${u.email}`));
    }
}

main();
