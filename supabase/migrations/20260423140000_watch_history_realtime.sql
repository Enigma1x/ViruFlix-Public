-- Continuar viendo / sync multi-cliente: Realtime solo sobre la tabla base.
-- No publicar vistas (p. ej. continue_watching): Postgres no permite
-- ALTER PUBLICATION ... ADD TABLE para VIEW.

-- Filas UPDATE completas en payloads de Realtime (útil con RLS).
ALTER TABLE public.watch_history REPLICA IDENTITY FULL;

-- Publicar cambios de historial (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication p
    JOIN pg_publication_rel pr ON p.oid = pr.prpubid
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'watch_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_history;
  END IF;
END $$;

-- Upsert atómico desde el cliente (onConflict user_id,content_id,content_type).
-- Si falla por filas duplicadas previas, limpia duplicados manualmente y vuelve a ejecutar.
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_content_type_uidx
  ON public.watch_history (user_id, content_id, content_type);
