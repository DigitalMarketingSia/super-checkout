-- ==========================================
-- FIX RLS SCRIPT - ENABLE PUBLIC ORDER CREATION
-- ==========================================
-- Este script permite que usuários públicos (deslogados) criem pedidos e pagamentos.

DO $$
BEGIN
    -- 1. Orders RLS
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing restrictive policy if exists (to avoid conflict or redundancy)
    -- DROP POLICY IF EXISTS "Public can create orders" ON orders; 

    -- Create policy to allow public INSERT
    -- (Necessário para checkout público criar o pedido)
    BEGIN
        CREATE POLICY "Public can create orders" ON orders FOR INSERT WITH CHECK (true);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

    -- 1.5 Ensure Payments Table Exists (Missing in some installs)
    CREATE TABLE IF NOT EXISTS payments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      order_id UUID REFERENCES orders(id) NOT NULL,
      gateway_id UUID REFERENCES gateways(id) NOT NULL,
      status TEXT NOT NULL,
      transaction_id TEXT,
      raw_response JSONB,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 2. Payments RLS
    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow public INSERT
    -- (Necessário para salvar o pagamento retornado pelo gateway)
    BEGIN
        CREATE POLICY "Public can create payments" ON payments FOR INSERT WITH CHECK (true);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

     -- 3. Payments Select (Optional but helpful for status check)
    -- Allow public to view payments linked to their order (simplified: linked to nothing if anon?)
    -- Actually, for now, let's keep it simple. Only INSERT is critical for creation.
    -- Read access is handled by "Customers can view their own orders" usually.
    
    RAISE NOTICE 'RLS corrigido: Permissão de criação pública de Pedidos e Pagamentos ativada.';
END $$;
