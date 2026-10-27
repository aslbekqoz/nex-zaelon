-- Accounts can be deleted by their owner. Audit entries they made keep actor_id = NULL
-- (ON DELETE SET NULL); this flag tells those apart from system actions.
ALTER TABLE audit_log ADD COLUMN actor_deleted BOOLEAN NOT NULL DEFAULT false;
