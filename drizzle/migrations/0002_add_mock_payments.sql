ALTER TABLE public.actions ADD COLUMN paid_at timestamptz;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'card',
  card_last4 text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  transaction_ref text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;