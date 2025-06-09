-- Add price tracking columns to tokens table
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS price_usd DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS price_change_24h DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cmc_id INTEGER;

-- Update existing tokens with CoinMarketCap IDs
UPDATE tokens SET cmc_id = 1 WHERE symbol = 'BTC';
UPDATE tokens SET cmc_id = 1027 WHERE symbol = 'ETH';
UPDATE tokens SET cmc_id = 825 WHERE symbol = 'USDT';
UPDATE tokens SET cmc_id = 3408 WHERE symbol = 'USDC';
UPDATE tokens SET cmc_id = 1839 WHERE symbol = 'BNB';

-- Create index for faster price queries
CREATE INDEX IF NOT EXISTS idx_tokens_last_price_update ON tokens(last_price_update);
CREATE INDEX IF NOT EXISTS idx_tokens_cmc_id ON tokens(cmc_id);

-- Create a function to automatically update price timestamp
CREATE OR REPLACE FUNCTION update_price_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_price_update = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp when price changes
DROP TRIGGER IF EXISTS trigger_update_price_timestamp ON tokens;
CREATE TRIGGER trigger_update_price_timestamp
    BEFORE UPDATE OF price_idr, price_usd ON tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_price_timestamp();

-- Create a view for price analytics
CREATE OR REPLACE VIEW price_analytics AS
SELECT 
    t.symbol,
    t.name,
    t.price_idr,
    t.price_usd,
    t.price_change_24h,
    t.last_price_update,
    CASE 
        WHEN t.last_price_update > NOW() - INTERVAL '5 minutes' THEN 'fresh'
        WHEN t.last_price_update > NOW() - INTERVAL '1 hour' THEN 'recent'
        ELSE 'stale'
    END as price_freshness,
    COUNT(o.id) as total_orders,
    SUM(CASE WHEN o.created_at > NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END) as orders_24h
FROM tokens t
LEFT JOIN orders o ON t.id = o.token_id
WHERE t.is_active = true
GROUP BY t.id, t.symbol, t.name, t.price_idr, t.price_usd, t.price_change_24h, t.last_price_update;

-- Grant permissions
GRANT SELECT ON price_analytics TO authenticated;
