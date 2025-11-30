-- Function to handle new order access
CREATE OR REPLACE FUNCTION handle_new_order_access()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_user_id UUID;
  v_content_record RECORD;
BEGIN
  -- Only proceed if status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- 1. Find the product_id from the checkout
    SELECT product_id INTO v_product_id
    FROM checkouts
    WHERE id = NEW.checkout_id;

    -- 2. Find the user_id from auth.users using the email
    -- Note: This assumes the user is already registered with this email.
    -- If not, no access is granted (logic for guest checkout needs account creation)
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = NEW.customer_email;

    IF v_product_id IS NOT NULL AND v_user_id IS NOT NULL THEN
      
      -- 3. Find all contents linked to this product
      FOR v_content_record IN 
        SELECT content_id 
        FROM product_contents 
        WHERE product_id = v_product_id
      LOOP
        -- 4. Insert access grant if not exists
        INSERT INTO access_grants (user_id, content_id, product_id, granted_at, status)
        VALUES (v_user_id, v_content_record.content_id, v_product_id, NOW(), 'active')
        ON CONFLICT (user_id, content_id) 
        DO UPDATE SET status = 'active', granted_at = NOW();
        
      END LOOP;
      
      -- Also grant access to the product itself (if we track product-level access)
      INSERT INTO access_grants (user_id, product_id, granted_at, status)
      VALUES (v_user_id, v_product_id, NOW(), 'active')
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET status = 'active', granted_at = NOW();

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_order_paid_grant_access ON orders;
CREATE TRIGGER on_order_paid_grant_access
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_order_access();
