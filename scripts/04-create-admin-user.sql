-- This script sets a specific user as an admin
-- Replace 'user@example.com' with the email of the user you want to make an admin

-- Update the user to be an admin
UPDATE public.users
SET is_admin = true
WHERE email = 'user@example.com';

-- Verify the admin was created
SELECT id, email, username, is_admin FROM public.users WHERE is_admin = true;
