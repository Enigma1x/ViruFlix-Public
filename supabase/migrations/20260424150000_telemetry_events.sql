-- Observabilidad remota Viruflix (fase 2).
--
-- Dos tablas:
--   * telemetry_events  : stream de eventos crudos enviados desde el cliente
--                         (error, request_error, page_metric, playback_metric, history_sync).
--   * telemetry_alerts  : alertas automaticas disparadas por reglas locales cuando
--                         cruzan umbrales (error rate, sync success, etc).
--
-- Modelo de permisos:
--   * Insert permitido a rol anon y authenticated (la app manda con su anon key).
--   * Select solo al owner (user_id = auth.uid()). Sin rol publico.
--   * Sin UPDATE/DELETE: se purga con service_role via pg_cron o dashboard.
--
-- Nota: aceptar inserts con anon expone la tabla a spam. Mitigaciones:
--   - tamano meta limitado a 16 KB (CHECK jsonb_object_length).
--   - rate-limit cliente (ver src/utils/telemetryRemote.js).
--   - TTL recomendado 30 dias via job externo.

-- -------------------- telemetry_events --------------------

CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    text NOT NULL,
  event_id      text,
  type          text NOT NULL,
  ts_client     timestamptz NOT NULL,
  page          text,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_version   text,
  platform      text CHECK (platform IN ('web', 'electron', 'unknown')),
  inserted_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telemetry_events_meta_size CHECK (
    octet_length(meta::text) <= 16384
  ),
  CONSTRAINT telemetry_events_type_check CHECK (
    type IN ('error', 'request_error', 'page_metric', 'playback_metric', 'history_sync', 'alert')
  )
);

CREATE INDEX IF NOT EXISTS telemetry_events_type_inserted_idx
  ON public.telemetry_events (type, inserted_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_events_user_inserted_idx
  ON public.telemetry_events (user_id, inserted_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_events_session_idx
  ON public.telemetry_events (session_id);

ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_events_insert_any ON public.telemetry_events;
CREATE POLICY telemetry_events_insert_any
  ON public.telemetry_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS telemetry_events_select_own ON public.telemetry_events;
CREATE POLICY telemetry_events_select_own
  ON public.telemetry_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- -------------------- telemetry_alerts --------------------

CREATE TABLE IF NOT EXISTS public.telemetry_alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule            text NOT NULL,
  severity        text NOT NULL CHECK (severity IN ('info', 'warn', 'critical')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id      text NOT NULL,
  app_version     text,
  platform        text CHECK (platform IN ('web', 'electron', 'unknown')),
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  acknowledged    boolean NOT NULL DEFAULT false,
  acknowledged_at timestamptz,
  CONSTRAINT telemetry_alerts_payload_size CHECK (
    octet_length(payload::text) <= 8192
  )
);

CREATE INDEX IF NOT EXISTS telemetry_alerts_rule_idx
  ON public.telemetry_alerts (rule, triggered_at DESC);

CREATE INDEX IF NOT EXISTS telemetry_alerts_open_idx
  ON public.telemetry_alerts (acknowledged, triggered_at DESC)
  WHERE acknowledged = false;

ALTER TABLE public.telemetry_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_alerts_insert_any ON public.telemetry_alerts;
CREATE POLICY telemetry_alerts_insert_any
  ON public.telemetry_alerts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS telemetry_alerts_select_own ON public.telemetry_alerts;
CREATE POLICY telemetry_alerts_select_own
  ON public.telemetry_alerts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
