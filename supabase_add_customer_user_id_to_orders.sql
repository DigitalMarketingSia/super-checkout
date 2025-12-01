-- Add customer_user_id column to orders table to link purchases to registered users
ALTER TABLE public.orders 
ADD COLUMN customer_user_id UUID REFERENCES auth.users(id);

-- Add comment
COMMENT ON COLUMN public.orders.customer_user_id IS 'ID of the registered user who made the purchase (for access grants)';
