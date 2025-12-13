/**
 * Simple script to create a single user via Supabase Admin API
 * Run with: node scripts/create_user_onz.cjs
 */

const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Manual env loading
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

Object.assign(process.env, env);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('❌ No Supabase key found');
    process.exit(1);
}

async function createUser() {
    const email = 'onzcreative@gmail.com';
    const password = '123456';
    const name = 'Onz creative';

    console.log(`🔄 Creating user: ${email}`);

    try {
        // Use the signup endpoint to create the user
        const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey
            },
            body: JSON.stringify({
                email,
                password,
                data: {
                    name
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Error:', data);
            if (data.msg && data.msg.includes('already registered')) {
                console.log('ℹ️  User already exists');
            }
        } else {
            console.log('✅ User created successfully!');
            console.log('User ID:', data.user?.id);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createUser();
