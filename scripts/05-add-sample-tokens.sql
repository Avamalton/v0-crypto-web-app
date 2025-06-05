-- Insert sample tokens
INSERT INTO public.tokens (name, symbol, price_idr, network, wallet_address, logo, is_active) VALUES
('Tether USD', 'USDT', 15800.00, 'TRC-20', 'TXYZabc123def456ghi789jkl012mno345pqr678', '/placeholder.svg?height=32&width=32', true),
('Tether USD', 'USDT', 15850.00, 'ERC-20', '0xabc123def456ghi789jkl012mno345pqr678stu', '/placeholder.svg?height=32&width=32', true),
('Tether USD', 'USDT', 15820.00, 'BSC', '0xdef456ghi789jkl012mno345pqr678stu901vwx', '/placeholder.svg?height=32&width=32', true),
('Ethereum', 'ETH', 48500000.00, 'ERC-20', '0xeth123def456ghi789jkl012mno345pqr678stu', '/placeholder.svg?height=32&width=32', true),
('Binance Coin', 'BNB', 9200000.00, 'BSC', '0xbnb456ghi789jkl012mno345pqr678stu901vwx', '/placeholder.svg?height=32&width=32', true);

-- Verify tokens were added
SELECT * FROM public.tokens;
