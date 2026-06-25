ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_phone_key;
ALTER TABLE businesses ALTER COLUMN phone DROP NOT NULL;
