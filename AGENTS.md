<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Reissue Guide decision rules live as pure functions in src/lib/reissue/agent.ts (tested in agent.test.ts); server functions in reissue.functions.ts persist cases, evidence, decisions, actions and verifications via the admin client — keeps rules testable and DB tables locked behind RLS.
- The mock government portal (catalogue + requests) is src/lib/reissue/portal.ts plus the portal_requests table; only https *.gov.mock URLs count as official.
- Submission requires a human-entered OTP: codes are stored only as hashes (otp_challenges), delivered to the mock_sms_inbox demo phone, and canExecute checks actions.otp_verified_at — the agent never auto-fills OTPs.
