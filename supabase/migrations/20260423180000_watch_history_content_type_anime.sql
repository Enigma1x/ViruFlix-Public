-- Permitir content_type 'anime' (el reproductor y el historial ya usan type === 'anime').
-- Sin esto, upsert falla con 23514 watch_history_content_type_check.

ALTER TABLE public.watch_history
  DROP CONSTRAINT IF EXISTS watch_history_content_type_check;

ALTER TABLE public.watch_history
  ADD CONSTRAINT watch_history_content_type_check
  CHECK (content_type IN ('movie', 'tv', 'anime'));
