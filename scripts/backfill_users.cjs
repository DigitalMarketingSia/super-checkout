/**
 * Backfill Script: Create users and access grants for existing paid orders
 * Uses manual .env.local parsing like fix_admin_role.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Robust Env Loading (same as fix_admin_role.cjs)
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
    console.log('Available keys:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const DEFAULT_PASSWORD = '123456';

async function backfillUsers() {
    console.log('🚀 Starting user backfill process...\n');

    try {
        // 1. Find all paid orders without customer_user_id
        console.log('📋 Fetching paid orders without users...');
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'paid')
            .is('customer_user_id', null)
            .not('checkout_id', 'is', null) // Only process orders with valid checkouts
            .order('created_at', { ascending: false })
            .limit(10); // Process only recent orders

        if (ordersError) {
            throw new Error(`Failed to fetch orders: ${ordersError.message}`);
        }

        if (!orders || orders.length === 0) {
            console.log('✅ No orders need processing. All paid orders have users!');
            return;
        }

        console.log(`📦 Found ${orders.length} order(s) to process:\n`);
        orders.forEach((order, idx) => {
            console.log(`   ${idx + 1}. ${order.customer_email} - Order ID: ${order.id}`);
        });
        console.log('');

        // 2. Process each order
        let successCount = 0;
        let errorCount = 0;

        for (const order of orders) {
            console.log(`\n🔄 Processing: ${order.customer_email}`);

            try {
                let userId = null;

                // Try to create the user
                console.log('   Creating user in Supabase Auth...');
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: order.customer_email,
                    password: DEFAULT_PASSWORD,
                    email_confirm: true,
                    user_metadata: {
                        name: order.customer_name
                    }
                });

                if (createError) {
                    // Check if user already exists
                    if (createError.message.includes('already registered') || createError.message.includes('User already registered')) {
                        console.log('   ℹ️  User already exists, looking up ID...');

                        // Find user in profiles table
                        const { data: profiles, error: profileError } = await supabase
                            .from('profiles')
                            .select('id')
                            .eq('email', order.customer_email)
                            .single();

                        if (profileError || !profiles) {
                            throw new Error(`User exists but not found in profiles: ${profileError?.message}`);
                        }

                        userId = profiles.id;
                        console.log(`   ✅ Found existing user: ${userId}`);
                    } else {
                        throw createError;
                    }
                } else {
                    userId = newUser.user.id;
                    console.log(`   ✅ Created new user: ${userId}`);
                }

                // 3. Update order with user_id
                console.log('   Updating order with user_id...');
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ customer_user_id: userId })
                    .eq('id', order.id);

                if (updateError) {
                    throw new Error(`Failed to update order: ${updateError.message}`);
                }
                console.log('   ✅ Order updated');

                // 4. Grant access to products
                console.log('   Granting access to products...');

                // Get checkout to find product
                const { data: checkout, error: checkoutError } = await supabase
                    .from('checkouts')
                    .select('product_id')
                    .eq('id', order.checkout_id)
                    .single();

                if (checkoutError || !checkout) {
                    console.log('   ⚠️  Could not find checkout, skipping access grant');
                } else {
                    // Get contents for this product
                    const { data: productContents, error: pcError } = await supabase
                        .from('product_contents')
                        .select('content_id')
                        .eq('product_id', checkout.product_id);

                    if (pcError) {
                        console.log(`   ⚠️  Error fetching product contents: ${pcError.message}`);
                    } else if (!productContents || productContents.length === 0) {
                        console.log('   ℹ️  No content linked to this product');
                    } else {
                        // Create access grants
                        let grantCount = 0;
                        for (const pc of productContents) {
                            const { error: grantError } = await supabase
                                .from('access_grants')
                                .insert({
                                    user_id: userId,
                                    content_id: pc.content_id,
                                    product_id: checkout.product_id,
                                    status: 'active',
                                    granted_at: new Date().toISOString()
                                });

                            if (grantError) {
                                // Ignore duplicate errors (grant already exists)
                                if (!grantError.message.includes('duplicate')) {
                                    console.log(`   ⚠️  Failed to create grant: ${grantError.message}`);
                                }
                            } else {
                                grantCount++;
                            }
                        }
                        console.log(`   ✅ Created ${grantCount} access grant(s)`);
                    }
                }

                successCount++;
                console.log(`   ✅ Successfully processed ${order.customer_email}`);

            } catch (error) {
                errorCount++;
                console.error(`   ❌ Error processing ${order.customer_email}:`, error.message);
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 BACKFILL SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total orders processed: ${orders.length}`);
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log('='.repeat(60));

        if (successCount > 0) {
            console.log('\n💡 Users can now login with:');
            console.log(`   Email: [their email]`);
            console.log(`   Password: ${DEFAULT_PASSWORD}`);
            console.log('\n⚠️  Recommend users change their password after first login.');
        }

    } catch (error) {
        console.error('\n❌ Critical error:', error.message);
        process.exit(1);
    }
}

// Run the script
backfillUsers()
    .then(() => {
        console.log('\n✅ Backfill complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Backfill failed:', error);
        process.exit(1);
    });
