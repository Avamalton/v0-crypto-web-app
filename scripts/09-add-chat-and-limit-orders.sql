-- Add chat system for orders
CREATE TABLE IF NOT EXISTS order_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    attachment_url TEXT,
    attachment_type VARCHAR(50), -- 'image', 'document', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_chats_order_id ON order_chats(order_id);
CREATE INDEX IF NOT EXISTS idx_order_chats_created_at ON order_chats(created_at);

-- Add payment proof image URL to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_image_url TEXT;

-- Create limit orders table
CREATE TABLE IF NOT EXISTS limit_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL CHECK (quantity > 0),
    target_price DECIMAL(15, 2) NOT NULL CHECK (target_price > 0),
    total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
    filled_quantity DECIMAL(20, 8) DEFAULT 0 CHECK (filled_quantity >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'partially_filled', 'filled', 'cancelled', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for limit orders
CREATE INDEX IF NOT EXISTS idx_limit_orders_user_id ON limit_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_limit_orders_token_id ON limit_orders(token_id);
CREATE INDEX IF NOT EXISTS idx_limit_orders_type ON limit_orders(type);
CREATE INDEX IF NOT EXISTS idx_limit_orders_status ON limit_orders(status);
CREATE INDEX IF NOT EXISTS idx_limit_orders_target_price ON limit_orders(target_price);

-- Create limit order matches table for P2P trading
CREATE TABLE IF NOT EXISTS limit_order_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buy_order_id UUID NOT NULL REFERENCES limit_orders(id) ON DELETE CASCADE,
    sell_order_id UUID NOT NULL REFERENCES limit_orders(id) ON DELETE CASCADE,
    matched_quantity DECIMAL(20, 8) NOT NULL CHECK (matched_quantity > 0),
    matched_price DECIMAL(15, 2) NOT NULL CHECK (matched_price > 0),
    total_amount DECIMAL(15, 2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'failed')),
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    admin_approved BOOLEAN DEFAULT FALSE,
    escrow_order_id UUID REFERENCES orders(id), -- Link to escrow order managed by admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for matches
CREATE INDEX IF NOT EXISTS idx_limit_order_matches_buy_order ON limit_order_matches(buy_order_id);
CREATE INDEX IF NOT EXISTS idx_limit_order_matches_sell_order ON limit_order_matches(sell_order_id);
CREATE INDEX IF NOT EXISTS idx_limit_order_matches_status ON limit_order_matches(status);

-- RLS Policies for order_chats
ALTER TABLE order_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chats for their orders" ON order_chats
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_chats.order_id 
            AND orders.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

CREATE POLICY "Users can insert chats for their orders" ON order_chats
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND (
            EXISTS (
                SELECT 1 FROM orders 
                WHERE orders.id = order_chats.order_id 
                AND orders.user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.is_admin = true
            )
        )
    );

-- RLS Policies for limit_orders
ALTER TABLE limit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all active limit orders" ON limit_orders
    FOR SELECT USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can insert their own limit orders" ON limit_orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own limit orders" ON limit_orders
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for limit_order_matches
ALTER TABLE limit_order_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order matches" ON limit_order_matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM limit_orders 
            WHERE (limit_orders.id = limit_order_matches.buy_order_id OR limit_orders.id = limit_order_matches.sell_order_id)
            AND limit_orders.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Function to automatically match limit orders
CREATE OR REPLACE FUNCTION match_limit_orders()
RETURNS TRIGGER AS $$
BEGIN
    -- Match buy orders with sell orders
    IF NEW.type = 'buy' AND NEW.status = 'active' THEN
        INSERT INTO limit_order_matches (buy_order_id, sell_order_id, matched_quantity, matched_price, total_amount)
        SELECT 
            NEW.id,
            sell_orders.id,
            LEAST(NEW.quantity - NEW.filled_quantity, sell_orders.quantity - sell_orders.filled_quantity),
            sell_orders.target_price,
            LEAST(NEW.quantity - NEW.filled_quantity, sell_orders.quantity - sell_orders.filled_quantity) * sell_orders.target_price
        FROM limit_orders sell_orders
        WHERE sell_orders.type = 'sell'
            AND sell_orders.status = 'active'
            AND sell_orders.token_id = NEW.token_id
            AND sell_orders.target_price <= NEW.target_price
            AND sell_orders.user_id != NEW.user_id
            AND (sell_orders.quantity - sell_orders.filled_quantity) > 0
        ORDER BY sell_orders.target_price ASC, sell_orders.created_at ASC
        LIMIT 1;
    END IF;
    
    -- Match sell orders with buy orders
    IF NEW.type = 'sell' AND NEW.status = 'active' THEN
        INSERT INTO limit_order_matches (buy_order_id, sell_order_id, matched_quantity, matched_price, total_amount)
        SELECT 
            buy_orders.id,
            NEW.id,
            LEAST(buy_orders.quantity - buy_orders.filled_quantity, NEW.quantity - NEW.filled_quantity),
            NEW.target_price,
            LEAST(buy_orders.quantity - buy_orders.filled_quantity, NEW.quantity - NEW.filled_quantity) * NEW.target_price
        FROM limit_orders buy_orders
        WHERE buy_orders.type = 'buy'
            AND buy_orders.status = 'active'
            AND buy_orders.token_id = NEW.token_id
            AND buy_orders.target_price >= NEW.target_price
            AND buy_orders.user_id != NEW.user_id
            AND (buy_orders.quantity - buy_orders.filled_quantity) > 0
        ORDER BY buy_orders.target_price DESC, buy_orders.created_at ASC
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic matching
DROP TRIGGER IF EXISTS trigger_match_limit_orders ON limit_orders;
CREATE TRIGGER trigger_match_limit_orders
    AFTER INSERT ON limit_orders
    FOR EACH ROW
    EXECUTE FUNCTION match_limit_orders();

-- Function to get order statistics including limit orders
CREATE OR REPLACE FUNCTION get_enhanced_order_statistics()
RETURNS TABLE (
    total_orders BIGINT,
    pending_orders BIGINT,
    confirmed_orders BIGINT,
    completed_orders BIGINT,
    failed_orders BIGINT,
    total_volume NUMERIC,
    total_users BIGINT,
    active_limit_orders BIGINT,
    total_matches BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'confirmed') as confirmed_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'completed') as completed_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'failed') as failed_orders,
        (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status IN ('completed', 'confirmed')) as total_volume,
        (SELECT COUNT(DISTINCT id) FROM users) as total_users,
        (SELECT COUNT(*) FROM limit_orders WHERE status = 'active') as active_limit_orders,
        (SELECT COUNT(*) FROM limit_order_matches) as total_matches;
END;
$$ LANGUAGE plpgsql;
