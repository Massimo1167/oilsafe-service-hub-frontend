-- Adds optional email columns to store report recipients
ALTER TABLE public.fogli_assistenza
ADD COLUMN email_report_cliente TEXT,
ADD COLUMN email_report_interno TEXT;
