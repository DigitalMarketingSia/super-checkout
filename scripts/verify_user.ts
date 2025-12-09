
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from parent directory (since this script might be in ./scripts or root)
// Assuming we run with ts-node from project root
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required in .env');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TARGET_EMAIL = 'contato.tiktoy@gmail.com';

async function verifyUser() {
    console.log(`Checking user: ${TARGET_EMAIL}...`);

    // 1. Check Auth Users (requires admin/service role)
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
        console.error('Error fetching auth users:', authError);
        return;
    }

    const authUser = users.find(u => u.email === TARGET_EMAIL);

    if (!authUser) {
        console.log('❌ User NOT FOUND in auth.users');
    } else {
        console.log('✅ User FOUND in auth.users');
        console.log('   ID:', authUser.id);
        console.log('   Created At:', authUser.created_at);
        console.log('   Metadata:', authUser.user_metadata);
    }

    if (!authUser) return;

    // 2. Check Public Profiles
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

    if (profileError || !profile) {
        console.log('❌ User NOT FOUND in public.profiles (This is likely the issue)');
    } else {
        console.log('✅ User FOUND in public.profiles');
        console.log('   Status:', profile.status);
    }

    // 3. Check Access Grants
    const { data: grants } = await supabaseAdmin
        .from('access_grants')
        .select('*')
        .eq('user_id', authUser.id);

    console.log(`ℹ️ Access Grants found: ${grants?.length || 0}`);
    if (grants && grants.length > 0) {
        console.log(grants);
    }
}

verifyUser().catch(console.error);
