-- Fix RLS policies for admin access to all orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

-- Create better RLS policies for orders
CREATE POLICY "Users can view own orders or admins can view all" ON public.orders
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Users can update own orders or admins can update all" ON public.orders
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create public activity/recent history table
CREATE TABLE IF NOT EXISTS public.public_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL, -- 'order_created', 'order_completed', 'token_added', etc.
  title TEXT NOT NULL,
  description TEXT,
  token_symbol TEXT,
  amount DECIMAL(18,8),
  amount_idr DECIMAL(15,2),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for public activities
ALTER TABLE public.public_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy for public activities (everyone can read public ones)
CREATE POLICY "Anyone can view public activities" ON public.public_activities
  FOR SELECT USING (is_public = true);

CREATE POLICY "Only admins can manage public activities" ON public.public_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to create public activity when order is created
CREATE OR REPLACE FUNCTION create_public_activity_for_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create public activity for completed orders to protect privacy
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO public.public_activities (
      activity_type,
      title,
      description,
      token_symbol,
      amount,
      amount_idr
    )
    SELECT 
      'order_completed',
      CASE 
        WHEN NEW.type = 'buy' THEN 'Crypto Purchase Completed'
        ELSE 'Crypto Sale Completed'
      END,
      CASE 
        WHEN NEW.type = 'buy' THEN 'Someone bought ' || NEW.quantity || ' ' || t.symbol
        ELSE 'Someone sold ' || NEW.quantity || ' ' || t.symbol
      END,
      t.symbol,
      NEW.quantity,
      NEW.total_price
    FROM tokens t
    WHERE t.id = NEW.token_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for public activities
DROP TRIGGER IF EXISTS public_activity_trigger ON public.orders;
CREATE TRIGGER public_activity_trigger
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_public_activity_for_order();

-- Function to get order statistics for admin
CREATE OR REPLACE FUNCTION get_order_statistics()
RETURNS TABLE(
  total_orders BIGINT,
  pending_orders BIGINT,
  confirmed_orders BIGINT,
  completed_orders BIGINT,
  failed_orders BIGINT,
  total_volume DECIMAL(15,2),
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_orders,
    COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_volume,
    (SELECT COUNT(DISTINCT id) FROM public.users) as total_users
  FROM public.orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample public activities for demo
INSERT INTO public.public_activities (activity_type, title, description, token_symbol, amount, amount_idr) VALUES
('platform_launch', 'Platform Launched', 'Crypto trading platform is now live!', NULL, NULL, NULL),
('token_added', 'New Token Added', 'USDT (TRC-20) is now available for trading', 'USDT', NULL, NULL),
('token_added', 'New Token Added', 'ETH (ERC-20) is now available for trading', 'ETH', NULL, NULL);
