import { describe, expect, it } from "vitest";
import { canExecute, describeObservedStatus, isOfficialUrl, planReissue } from "./agent";
import { searchReissueSources } from "./portal";

const input = { docType: "birth_certificate", state: "MH", proofs: ["fir_copy", "id_proof", "affidavit"] };

describe("reissue rules", () => {
  it("TC1 picks the official birth certificate form", () => {
    const { plan } = planReissue(input, searchReissueSources("birth_certificate", "MH"));
    expect(plan.formId).toBe("FORM-BC-7");
    expect(plan.fee).toBe(50);
  });
  it("TC2 never uses the agent website", () => {
    const { evidence } = planReissue(input, searchReissueSources("birth_certificate", "MH"));
    expect(evidence.filter((e) => e.used).every((e) => isOfficialUrl(e.url))).toBe(true);
    expect(isOfficialUrl("https://fast-reissue-agents.com/x")).toBe(false);
  });
  it("TC3 refuses execution without approval", () => {
    expect(canExecute({ status: "awaiting_approval", approved_payload: null }).ok).toBe(false);
    expect(canExecute({ status: "approved", approved_payload: { fee: 50 }, otp_verified_at: "2026-01-01", paid_at: "2026-01-01" }).ok).toBe(true);
  });
  it("TC4 a received request is not reported as issued", () => {
    expect(describeObservedStatus("received").isIssued).toBe(false);
  });
  it("missing proofs make the plan uncertain", () => {
    const { plan } = planReissue({ ...input, proofs: ["id_proof"] }, searchReissueSources("birth_certificate", "MH"));
    expect(plan.status).toBe("uncertain");
  });
});

import { checkOtp as _checkOtp, canExecute as _canExecute } from "./agent";
describe("OTP human step", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const ch = { code_hash: "h", expires_at: "2026-01-01T00:05:00Z", attempts: 0, verified_at: null };
  it("blocks submission until OTP verified", () => {
    expect(_canExecute({ status: "approved", approved_payload: {}, otp_verified_at: null }).ok).toBe(false);
    expect(_canExecute({ status: "approved", approved_payload: {}, otp_verified_at: "x", paid_at: "x" }).ok).toBe(true);
  });
  it("accepts correct code", () => expect(_checkOtp(ch, "h", now).ok).toBe(true));
  it("rejects wrong code", () => expect(_checkOtp(ch, "x", now).ok).toBe(false));
  it("rejects after 5 minutes", () => expect(_checkOtp(ch, "h", now + 5 * 60 * 1000 + 1).ok).toBe(false));
  it("locks after 3 wrong tries", () => expect(_checkOtp({ ...ch, attempts: 3 }, "h", now).ok).toBe(false));
  it("cannot reuse a code", () => expect(_checkOtp({ ...ch, verified_at: "x" }, "h", now).ok).toBe(false));
});

import { validateMockPayment } from "./agent";
describe("mock payment gateway", () => {
  const ok = { number: "4242 4242 4242 4242", name: "Test Applicant", expiry: "12/29", cvv: "123" };
  it("blocks submission until the fee is paid", () => {
    expect(_canExecute({ status: "approved", approved_payload: {}, otp_verified_at: "x", paid_at: null }).ok).toBe(false);
  });
  it("accepts a valid demo card", () => expect(validateMockPayment(ok).ok).toBe(true));
  it("declines the demo decline card", () => expect(validateMockPayment({ ...ok, number: "4000000000000002" }).ok).toBe(false));
  it("rejects a bad card number", () => expect(validateMockPayment({ ...ok, number: "1234" }).ok).toBe(false));
  it("rejects a bad expiry", () => expect(validateMockPayment({ ...ok, expiry: "13/99" }).ok).toBe(false));
});
