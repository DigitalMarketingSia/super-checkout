
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env var loading to avoid external dependencies issues
function getEnv(key: string): string | undefined {
    try {
        // Standard path relative to project root
        const envPath = path.resolve(process.cwd(), '.env.local');
        // console.log('Reading env from:', envPath);
        const content = fs.readFileSync(envPath, 'utf-8');
        const match = content.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, 'm'));
        return match ? match[1] : undefined;
    } catch (e) {
        console.error('Error reading .env.local', e);
        return undefined;
    }
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars (Check .env.local in project root)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    console.log('--- STARTING CLEANUP ---');
    const targetEmail = 'contato.digitalmarketingsia@gmail.com';
    console.log(`Target Email: ${targetEmail}`);

    // List all users to verify existence
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error listing users:', error);
        return;
    }

    console.log(`Total users found: ${users.length}`);

    const user = users.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());

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
