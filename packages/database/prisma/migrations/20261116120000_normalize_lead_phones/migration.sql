-- Backfill Lead phone keys to the shared E.164-like rules.
-- Mirrors packages/shared/src/leads/phone-normalization.util.ts; keep in sync.

CREATE OR REPLACE FUNCTION pg_temp.crmpro_normalize_phone(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ascii TEXT;
  has_plus BOOLEAN;
  digits TEXT;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;

  ascii := translate(btrim(raw), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  has_plus := left(ascii, 1) = '+';
  digits := regexp_replace(ascii, '[^0-9]', '', 'g');

  IF digits = '' THEN
    RETURN '';
  END IF;

  IF has_plus THEN
    RETURN '+' || digits;
  END IF;

  IF left(digits, 2) = '00' THEN
    RETURN '+' || substr(digits, 3);
  END IF;

  IF left(digits, 2) = '20' AND length(digits) IN (11, 12) THEN
    RETURN '+' || digits;
  END IF;

  IF left(digits, 1) = '0' THEN
    RETURN '+20' || regexp_replace(digits, '^0+', '');
  END IF;

  IF length(digits) = 10 AND left(digits, 1) = '1' THEN
    RETURN '+20' || digits;
  END IF;

  RETURN digits;
END;
$$;

UPDATE "Lead"
SET
  "primaryPhoneNormalized" = pg_temp.crmpro_normalize_phone("primaryPhone"),
  "secondaryPhoneNormalized" = pg_temp.crmpro_normalize_phone("secondaryPhone")
WHERE
  "primaryPhoneNormalized" IS DISTINCT FROM pg_temp.crmpro_normalize_phone("primaryPhone")
  OR "secondaryPhoneNormalized" IS DISTINCT FROM pg_temp.crmpro_normalize_phone("secondaryPhone");
