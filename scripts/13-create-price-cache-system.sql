-- Create price cache table
CREATE TABLE IF NOT EXISTS price_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_symbol VARCHAR(10) NOT NULL,
    price_usd DECIMAL(20, 8) NOT NULL,
    price_idr DECIMAL(20, 2) NOT NULL,
    price_change_24h DECIMAL(10, 4),
    volume_24h DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token_symbol)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_price_cache_symbol ON price_cache(token_symbol);
CREATE INDEX IF NOT EXISTS idx_price_cache_last_updated ON price_cache(last_updated);

-- Create price history table for tracking
CREATE TABLE IF NOT EXISTS price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_symbol VARCHAR(10) NOT NULL,
    price_usd DECIMAL(20, 8) NOT NULL,
    price_idr DECIMAL(20, 2) NOT NULL,
    price_change_24h DECIMAL(10, 4),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for price history
CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON price_history(token_symbol, recorded_at);

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_provider VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    tokens_requested TEXT[],
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to get cached price or indicate refresh needed
CREATE OR REPLACE FUNCTION get_cached_prices(token_symbols TEXT[])
RETURNS TABLE (
    symbol TEXT,
    price_usd DECIMAL,
    price_idr DECIMAL,
    price_change_24h DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    needs_refresh BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.token_symbol::TEXT,
        pc.price_usd,
        pc.price_idr,
        pc.price_change_24h,
        pc.last_updated,
        (pc.last_updated < NOW() - INTERVAL '1 hour')::BOOLEAN as needs_refresh
    FROM price_cache pc
    WHERE pc.token_symbol = ANY(token_symbols);
END;
$$ LANGUAGE plpgsql;

-- Create function to update price cache
CREATE OR REPLACE FUNCTION update_price_cache(
    p_symbol TEXT,
    p_price_usd DECIMAL,
    p_price_idr DECIMAL,
    p_change_24h DECIMAL DEFAULT NULL,
    p_volume_24h DECIMAL DEFAULT NULL,
    p_market_cap DECIMAL DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert or update price cache
    INSERT INTO price_cache (
        token_symbol, 
        price_usd, 
        price_idr, 
        price_change_24h,
        volume_24h,
        market_cap,
        last_updated
    )
    VALUES (
        p_symbol, 
        p_price_usd, 
        p_price_idr, 
        p_change_24h,
        p_volume_24h,
        p_market_cap,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (token_symbol) 
    DO UPDATE SET
        price_usd = EXCLUDED.price_usd,
        price_idr = EXCLUDED.price_idr,
        price_change_24h = EXCLUDED.price_change_24h,
        volume_24h = EXCLUDED.volume_24h,
        market_cap = EXCLUDED.market_cap,
        last_updated = CURRENT_TIMESTAMP;

    -- Also insert into price history for tracking
    INSERT INTO price_history (
        token_symbol,
        price_usd,
        price_idr,
        price_change_24h
    )
    VALUES (
        p_symbol,
        p_price_usd,
        p_price_idr,
        p_change_24h
    );

    -- Update tokens table as well
    UPDATE tokens 
    SET 
        price_usd = p_price_usd,
        price_idr = p_price_idr,
        price_change_24h = p_change_24h,
        last_price_update = CURRENT_TIMESTAMP
    WHERE symbol = p_symbol;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON price_cache TO authenticated;
GRANT SELECT ON price_history TO authenticated;
GRANT SELECT ON api_usage_log TO authenticated;

-- Insert initial cache data for existing tokens
INSERT INTO price_cache (token_symbol, price_usd, price_idr, price_change_24h, last_updated)
SELECT 
    symbol,
    COALESCE(price_usd, 0),
    COALESCE(price_idr, 0),
    COALESCE(price_change_24h, 0),
    COALESCE(last_price_update, NOW() - INTERVAL '2 hours') -- Force refresh on first load
FROM tokens 
WHERE is_active = true
ON CONFLICT (token_symbol) DO NOTHING;
