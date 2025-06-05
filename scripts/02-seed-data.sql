-- Insert sample tokens
INSERT INTO public.tokens (name, symbol, price_idr, network, wallet_address, logo) VALUES
('Tether USD', 'USDT', 15800.00, 'TRC-20', 'TXYZabc123...', '/placeholder.svg?height=32&width=32'),
('Tether USD', 'USDT', 15850.00, 'ERC-20', '0xabc123...', '/placeholder.svg?height=32&width=32'),
('Tether USD', 'USDT', 15820.00, 'BSC', '0xdef456...', '/placeholder.svg?height=32&width=32'),
('Ethereum', 'ETH', 48500000.00, 'ERC-20', '0xeth123...', '/placeholder.svg?height=32&width=32'),
('Binance Coin', 'BNB', 9200000.00, 'BSC', '0xbnb456...', '/placeholder.svg?height=32&width=32');

-- Create admin user (you'll need to register this email first)
-- UPDATE public.users SET is_admin = true WHERE email = 'admin@example.com';
