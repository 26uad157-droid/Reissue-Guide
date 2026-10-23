CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_code text NOT NULL UNIQUE,
  doc_type text NOT NULL,
  state text NOT NULL,
  proofs text[] NOT NULL DEFAULT '{}',
  applicant_name text NOT NULL DEFAULT 'Demo Applicant',
  status text NOT NULL DEFAULT 'collected',
  plan jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.source_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  url text NOT NULL,
  title text NOT NULL,
  is_official boolean NOT NULL,
  used boolean NOT NULL,
  reason text NOT NULL,
  extracted jsonb NOT NULL DEFAULT '{}',
  retrieved_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  rule text NOT NULL,
  inputs jsonb NOT NULL,
  outcome text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  destination text NOT NULL,
  proposed jsonb NOT NULL,
  approved_payload jsonb,
  status text NOT NULL DEFAULT 'awaiting_approval',
  request_number text,
  slot text,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  action_id uuid REFERENCES public.actions(id) ON DELETE CASCADE,
  intended jsonb NOT NULL,
  observed jsonb NOT NULL,
  result text NOT NULL,
  note text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.portal_requests (
  request_number text PRIMARY KEY,
  service_id text NOT NULL,
  payload jsonb NOT NULL,
  slot text NOT NULL,
  fee_paid integer NOT NULL,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tc text NOT NULL,
  scenario text NOT NULL,
  input jsonb NOT NULL,
  expected text NOT NULL,
  actual text NOT NULL,
  passed boolean NOT NULL,
  evidence jsonb NOT NULL,
  explanation text NOT NULL,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.cases, public.source_evidence, public.decisions, public.actions, public.verifications, public.portal_requests, public.test_runs TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;