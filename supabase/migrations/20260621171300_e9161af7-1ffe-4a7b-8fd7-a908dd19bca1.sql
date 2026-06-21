ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS retention_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.notification_settings
DROP CONSTRAINT IF EXISTS notification_settings_retention_days_check;

ALTER TABLE public.notification_settings
ADD CONSTRAINT notification_settings_retention_days_check CHECK (retention_days > 0 AND retention_days <= 365);