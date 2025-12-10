
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembers() {
    console.log('Checking members for email: contato.digitalmarketingsia@gmail.com');

    // Check Profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, email, status')
        .ilike('email', '%contato.digitalmarketingsia@gmail.com%');

    console.log('Profiles found:', profiles);
    if (pError) console.error('Profile Error:', pError);

    // Check View
    const { data: viewMembers, error: vError } = await supabase
        .from('admin_members_view')
        .select('user_id, email, status')
        .ilike('email', '%contato.digitalmarketingsia@gmail.com%');

    console.log('View Members found:', viewMembers);
    if (vError) console.error('View Error:', vError);
}

checkMembers();
