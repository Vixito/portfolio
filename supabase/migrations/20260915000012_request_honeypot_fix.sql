-- La 0011 añadió p_website con DEFAULT, lo que creó una sobrecarga y dejó
-- ambiguas las llamadas sin ese parámetro (PGRST203). Se elimina la firma
-- vieja de 8 parámetros; queda solo la de 9 (compatible hacia atrás).
DROP FUNCTION IF EXISTS public.create_request(text, text, text, text, text, text, text, jsonb);