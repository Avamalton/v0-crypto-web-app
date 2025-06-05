-- Create market_ads table for admin advertisements
CREATE TABLE IF NOT EXISTS public.market_ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('buy', 'sell')) NOT NULL,
  token_id UUID REFERENCES public.tokens(id) NOT NULL,
  price_idr DECIMAL(15,2) NOT NULL,
  min_amount DECIMAL(18,8) DEFAULT 0,
  max_amount DECIMAL(18,8),
  payment_methods TEXT[] DEFAULT '{}',
  terms TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for market_ads
ALTER TABLE public.market_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for market_ads
CREATE POLICY "Anyone can view active market ads" ON public.market_ads
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage market ads" ON public.market_ads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create payment_methods table for payment instructions
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'qris', 'bank_transfer', 'ewallet'
  display_name TEXT NOT NULL,
  description TEXT,
  qr_code_url TEXT,
  account_number TEXT,
  account_name TEXT,
  bank_name TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policy for payment_methods
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage payment methods" ON public.payment_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Insert sample payment methods
INSERT INTO public.payment_methods (name, type, display_name, description, qr_code_url, account_number, account_name, bank_name, instructions) VALUES
('qris', 'qris', 'QRIS', 'Scan QR code untuk pembayaran instant', 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020101021226670016COM.NOBUBANK.WWW01189360050300000898240214545454545454540303UMI51440014ID.CO.QRIS.WWW0215ID20232959059530360054031565802ID5925MERCHANT NAME GOES HERE6007JAKARTA61051234562070703A0163044B5D', '081234567890', 'Admin Crypto', 'QRIS', 'Scan QR code menggunakan aplikasi mobile banking atau e-wallet Anda'),
('gopay', 'ewallet', 'GoPay', 'Transfer melalui GoPay', NULL, '081234567890', 'Admin Crypto', 'GoPay', 'Buka aplikasi Gojek/GoPay, pilih Transfer, masukkan nomor 081234567890'),
('dana', 'ewallet', 'DANA', 'Transfer melalui DANA', NULL, '081234567890', 'Admin Crypto', 'DANA', 'Buka aplikasi DANA, pilih Kirim, masukkan nomor 081234567890'),
('ovo', 'ewallet', 'OVO', 'Transfer melalui OVO', NULL, '081234567890', 'Admin Crypto', 'OVO', 'Buka aplikasi OVO, pilih Transfer, masukkan nomor 081234567890'),
('bca', 'bank_transfer', 'Bank BCA', 'Transfer ke rekening BCA', NULL, '1234567890', 'Admin Crypto Trading', 'Bank BCA', 'Transfer ke rekening BCA 1234567890 a.n Admin Crypto Trading'),
('mandiri', 'bank_transfer', 'Bank Mandiri', 'Transfer ke rekening Mandiri', NULL, '1234567890123', 'Admin Crypto Trading', 'Bank Mandiri', 'Transfer ke rekening Mandiri 1234567890123 a.n Admin Crypto Trading'),
('bni', 'bank_transfer', 'Bank BNI', 'Transfer ke rekening BNI', NULL, '1234567890', 'Admin Crypto Trading', 'Bank BNI', 'Transfer ke rekening BNI 1234567890 a.n Admin Crypto Trading');

-- Function to update market_ads updated_at
CREATE OR REPLACE FUNCTION update_market_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for market_ads
CREATE TRIGGER market_ads_updated_at_trigger
  BEFORE UPDATE ON public.market_ads
  FOR EACH ROW
  EXECUTE FUNCTION update_market_ads_updated_at();
