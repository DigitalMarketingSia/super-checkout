
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccess() {
    const userId = '1e22629f-4475-4b24-9828-6fc634668623'; // The valid user ID
    console.log(`Checking access for user ${userId}`);

    const { data, error } = await supabase
        .from('access_grants')
        .select('*, product:products(*)')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching grants:', error);
    } else {
        console.log('Grants found:', JSON.stringify(data, null, 2));
    }
}

checkAccess();
