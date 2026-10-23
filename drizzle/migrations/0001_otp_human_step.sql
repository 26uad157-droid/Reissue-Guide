ALTER TABLE public.actions ADD COLUMN otp_verified_at timestamptz;

CREATE TABLE public.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.otp_challenges TO service_role;
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

-- The applicant's mock phone: where the portal "sends" the OTP SMS.
CREATE TABLE public.mock_sms_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.mock_sms_inbox TO service_role;
ALTER TABLE public.mock_sms_inbox ENABLE ROW LEVEL SECURITY;