-- Editors use the Content Studio but not the admin panel; admins can do both.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'editor', 'admin'));
