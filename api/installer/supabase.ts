import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Buffer } from 'node:buffer';
import pg from 'pg';

const { Client } = pg;

// Schema SQL embedded directly to avoid bundling/import issues
const schemaSql = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text default 'member' check (role in ('admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create profiles policies
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Create products table
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null,
  currency text default 'BRL',
  image_url text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on products
alter table public.products enable row level security;

-- Create products policies
create policy "Products are viewable by everyone."
  on public.products for select
  using ( true );

create policy "Only admins can insert products."
  on public.products for insert
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

create policy "Only admins can update products."
  on public.products for update
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

create policy "Only admins can delete products."
  on public.products for delete
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

-- Create checkouts table
create table if not exists public.checkouts (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  theme jsonb default '{}'::jsonb,
  settings jsonb default '{}'::jsonb,
  active boolean default true,
  views integer default 0,
  sales integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on checkouts
alter table public.checkouts enable row level security;

-- Create checkouts policies
create policy "Checkouts are viewable by everyone."
  on public.checkouts for select
  using ( true );

create policy "Only admins can insert checkouts."
  on public.checkouts for insert
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

create policy "Only admins can update checkouts."
  on public.checkouts for update
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

create policy "Only admins can delete checkouts."
  on public.checkouts for delete
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

-- Create orders table
create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  checkout_id uuid references public.checkouts(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  customer_email text not null,
  customer_name text,
  customer_phone text,
  amount decimal(10,2) not null,
  currency text default 'BRL',
  status text default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_method text,
  payment_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on orders
alter table public.orders enable row level security;

-- Create orders policies
create policy "Admins can view all orders."
  on public.orders for select
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

create policy "Users can view their own orders."
  on public.orders for select
  using ( customer_email = (select email from auth.users where id = auth.uid()) );

create policy "Public can insert orders (webhook/checkout)."
  on public.orders for insert
  using ( true );

create policy "Only admins can update orders."
  on public.orders for update
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

-- Create licenses table (for self-hosted validation)
create table if not exists public.licenses (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  status text default 'active' check (status in ('active', 'inactive', 'suspended')),
  plan text default 'pro',
  valid_until timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on licenses
alter table public.licenses enable row level security;

-- Create licenses policies
create policy "Only admins can view licenses."
  on public.licenses for select
  using ( exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' ) );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'member');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, code, licenseKey, projectRef, dbPass } = req.body;

    // 0. Initialize Supabase (Admin Context)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase Environment Variables');
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase keys' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Validate License
    if (!licenseKey) return res.status(400).json({ error: 'Missing license key' });

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', licenseKey)
      .single();

    if (licenseError || !license || license.status !== 'active') {
      return res.status(403).json({ error: 'Invalid or inactive license' });
    }

    try {
      if (action === 'create_project') {
        if (!code) return res.status(400).json({ error: 'Missing OAuth code' });

        const clientId = process.env.SUPABASE_CLIENT_ID;
        const clientSecret = process.env.SUPABASE_CLIENT_SECRET;
        const redirectUri = `${req.headers.origin}/installer`;

        if (!clientId || !clientSecret) {
          throw new Error('Missing Supabase OAuth credentials on server');
        }

        // 2. Exchange Code for Access Token
        const tokenRes = await fetch('https://api.supabase.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
          })
        });

        // Safe JSON parsing
        const contentType = tokenRes.headers.get('content-type');
        let tokenData: any;
        if (contentType && contentType.includes('application/json')) {
          tokenData = await tokenRes.json();
        } else {
          const textError = await tokenRes.text();
          throw new Error(`OAuth token exchange failed (${tokenRes.status}): ${textError.substring(0, 200)}`);
        }
        if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Failed to exchange token');

        const accessToken = tokenData.access_token;

        // 3. Create Project
        const dbPass = generateStrongPassword();
        const createRes = await fetch('https://api.supabase.com/v1/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Super Checkout ${Math.floor(Math.random() * 10000)}`,
            organization_id: tokenData.organization_id,
            db_pass: dbPass,
            region: 'us-east-1',
            plan: 'free'
          })
        });

        // Safe JSON parsing
        const createContentType = createRes.headers.get('content-type');
        let projectData: any;
        if (createContentType && createContentType.includes('application/json')) {
          projectData = await createRes.json();
        } else {
          const textError = await createRes.text();
          throw new Error(`Project creation failed (${createRes.status}): ${textError.substring(0, 200)}`);
        }

        if (!createRes.ok) {
          // If org_id missing, try to fetch it
          if (projectData.message?.includes('organization_id') || projectData.message?.includes('Organization not found')) {
            // Fetch orgs
            const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            // Safe JSON parsing for orgs
            const orgsContentType = orgsRes.headers.get('content-type');
            let orgs: any;
            if (orgsContentType && orgsContentType.includes('application/json')) {
              orgs = await orgsRes.json();
            } else {
              throw new Error('Failed to fetch organizations');
            }

            if (orgs.length > 0) {
              // Retry with first org
              const dbPassRetry = generateStrongPassword();
              const retryRes = await fetch('https://api.supabase.com/v1/projects', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  name: `Super Checkout ${Math.floor(Math.random() * 10000)}`,
                  organization_id: orgs[0].id,
                  db_pass: dbPassRetry,
                  region: 'us-east-1',
                  plan: 'free'
                })
              });

              // Safe JSON parsing for retry
              const retryContentType = retryRes.headers.get('content-type');
              let retryData: any;
              if (retryContentType && retryContentType.includes('application/json')) {
                retryData = await retryRes.json();
              } else {
                const textError = await retryRes.text();
                throw new Error(`Project creation retry failed (${retryRes.status}): ${textError.substring(0, 200)}`);
              }

              if (!retryRes.ok) throw new Error(retryData.message || 'Failed to create project');

              // SUCCESS - Return without fetching keys
              return res.status(200).json({
                success: true,
                projectRef: retryData.id,
                dbPass: dbPassRetry,
                accessToken // Return token for migrations (not used for keys anymore)
              });
            }
          }
          throw new Error(projectData.message || 'Failed to create project');
        }

        // SUCCESS - Return without fetching keys
        return res.status(200).json({
          success: true,
          projectRef: projectData.id,
          dbPass: dbPass,
          accessToken // Return token for migrations (not used for keys anymore)
        });
      }

      if (action === 'run_migrations') {
        if (!projectRef || !dbPass) {
          return res.status(400).json({ error: 'Missing projectRef or dbPass' });
        }
      }
    } catch (error: any) {
      console.error('Supabase API Critical Error:', error);
      return res.status(500).json({ error: error.message || 'Critical Server Error' });
    }
  } catch (outerError: any) {
    console.error('Handler Critical Error:', outerError);
    return res.status(500).json({ error: outerError.message || 'Internal Server Error' });
  }
}

function generateStrongPassword() {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';
}
