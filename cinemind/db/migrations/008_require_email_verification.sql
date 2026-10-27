-- CineMind AI: email confirmation becomes mandatory for account features.
-- Accounts that existed before this change are treated as confirmed, so nobody already
-- using the site is locked out. New accounts must confirm their address.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;
