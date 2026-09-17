-- Honeypot anti-bots en el formulario de /status: campo trampa "website".
-- Los humanos lo dejan vacío; los bots lo rellenan y la petición se
-- descarta en silencio (sin insertar, sin error revelador).
CREATE OR REPLACE FUNCTION public.create_request(p_name text, p_email text, p_request_type text, p_message text, p_phone text DEFAULT NULL::text, p_currency text DEFAULT NULL::text, p_investment_range text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb, p_website text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id UUID;
BEGIN
  IF NULLIF(TRIM(COALESCE(p_website, '')), '') IS NOT NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO requests (
    name,
    email,
    request_type,
    message,
    phone,
    currency,
    investment_range,
    metadata,
    status,
    created_at
  )
  VALUES (
    p_name,
    p_email,
    p_request_type,
    p_message,
    NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_currency), ''),
    NULLIF(TRIM(p_investment_range), ''),
    p_metadata,
    'pending',
    NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;