// Pure decision rules for the Lost Document Reissue Guide.
import {
  DOC_TYPES,
  OFFICIAL_DOMAIN,
  PROOFS,
  SERVICES,
  STATES,
  type DocTypeId,
  type ProofId,
  type SearchResult,
  type StateId,
} from "./portal";

export interface CaseInput {
  docType: string;
  state: string;
  proofs: string[];
}

export interface Decision {
  rule: string;
  inputs: Record<string, unknown>;
  outcome: "pass" | "fail" | "uncertain";
  reason: string;
}

export interface EvidenceRow {
  sourceId: string;
  url: string;
  title: string;
  isOfficial: boolean;
  used: boolean;
  reason: string;
  extracted: Record<string, unknown>;
}

export interface Plan {
  status: "ready" | "uncertain";
  serviceId: string | null;
  formId: string | null;
  title: string | null;
  authority: string | null;
  fee: number | null;
  steps: string[];
  documentsNeeded: { id: string; label: string; have: boolean; required: boolean }[];
  missing: string[];
  unresolved: string[];
}

export function validateInput(input: CaseInput): string[] {
  const errs: string[] = [];
  if (!DOC_TYPES.some((d) => d.id === input.docType)) errs.push("Unknown document type");
  if (!STATES.some((s) => s.id === input.state)) errs.push("Unknown state");
  if (!Array.isArray(input.proofs)) errs.push("Proofs must be a list");
  else if (input.proofs.some((p) => !PROOFS.some((x) => x.id === p))) errs.push("Unknown proof type");
  return errs;
}

export function isOfficialUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith(OFFICIAL_DOMAIN) && url.startsWith("https://");
  } catch {
    return false;
  }
}

const proofLabel = (id: string) => PROOFS.find((p) => p.id === id)?.label ?? id;

export function planReissue(input: CaseInput, results: SearchResult[]) {
  const decisions: Decision[] = [];
  const evidence: EvidenceRow[] = results.map((r) => {
    const official = isOfficialUrl(r.url);
    return {
      sourceId: r.sourceId,
      url: r.url,
      title: r.title,
      isOfficial: official,
      used: false,
      reason: official ? "Official government domain" : `Rejected: not on ${OFFICIAL_DOMAIN} (unofficial / agent site)`,
      extracted: { fee: r.fee, formId: r.formId, serviceId: r.serviceId },
    };
  });

  const officialResults = results.filter((r) => isOfficialUrl(r.url) && r.serviceId);
  decisions.push({
    rule: "R1 Source must be official",
    inputs: { candidates: results.map((r) => r.url) },
    outcome: officialResults.length === 1 ? "pass" : "uncertain",
    reason:
      officialResults.length === 1
        ? `Selected ${officialResults[0]!.url}; ignored ${results.length - 1} unofficial/irrelevant result(s)`
        : officialResults.length === 0
          ? "No official portal found – cannot decide"
          : "Multiple official portals found – needs human review",
  });

  const chosen = officialResults.length === 1 ? officialResults[0] : null;
  const service = chosen ? SERVICES.find((s) => s.serviceId === chosen.serviceId) ?? null : null;
  if (chosen) {
    const ev = evidence.find((e) => e.sourceId === chosen.sourceId);
    if (ev) ev.used = true;
  }

  const formOk = !!service && service.docType === (input.docType as DocTypeId) && chosen?.formId === service.formId;
  decisions.push({
    rule: "R2 Correct reissue form",
    inputs: { docType: input.docType, formFromSource: chosen?.formId ?? null },
    outcome: formOk ? "pass" : "uncertain",
    reason: formOk ? `Form ${service!.formId} matches ${service!.title}` : "Form could not be matched to document type",
  });

  const fee = chosen?.fee ?? null;
  decisions.push({
    rule: "R3 Official fee",
    inputs: { feeFromOfficialSource: fee, state: input.state },
    outcome: fee !== null && formOk ? "pass" : "uncertain",
    reason: fee !== null ? `Fee ₹${fee} read from official source (agent sites quoted higher fees and were ignored)` : "Fee missing",
  });

  const have = new Set(input.proofs);
  const required = service?.required ?? [];
  const missing = required.filter((p) => !have.has(p));
  decisions.push({
    rule: "R4 Required proofs present",
    inputs: { have: input.proofs, required },
    outcome: !service ? "uncertain" : missing.length === 0 ? "pass" : "fail",
    reason: missing.length === 0 ? "All mandatory proofs provided" : `Missing: ${missing.map(proofLabel).join(", ")}`,
  });

  const unresolved = decisions.filter((d) => d.outcome !== "pass").map((d) => `${d.rule}: ${d.reason}`);
  const docs = service
    ? [...service.required, ...service.optional].map((id) => ({
        id,
        label: proofLabel(id),
        have: have.has(id as ProofId),
        required: service.required.includes(id),
      }))
    : [];

  const plan: Plan = {
    status: unresolved.length === 0 ? "ready" : "uncertain",
    serviceId: service?.serviceId ?? null,
    formId: service?.formId ?? null,
    title: service?.title ?? null,
    authority: service?.authority ?? null,
    fee,
    steps: service?.steps ?? [],
    documentsNeeded: docs,
    missing: missing.map(proofLabel),
    unresolved,
  };
  return { plan, decisions, evidence };
}

/** The portal only ever reports "received"/"under_review" after submission; issuance happens later offline. */
export function describeObservedStatus(status: string): { label: string; isIssued: boolean } {
  if (status === "issued") return { label: "Issued", isIssued: true };
  return { label: `Request ${status.replace(/_/g, " ")} – document NOT yet issued`, isIssued: false };
}

export function canExecute(action: { status: string; approved_payload: unknown; otp_verified_at?: string | null; paid_at?: string | null }): { ok: boolean; reason: string } {
  if (action.status === "executed") return { ok: false, reason: "already_executed" };
  if (action.status !== "approved" || !action.approved_payload)
    return { ok: false, reason: "Human approval required before submitting or paying" };
  if (!action.otp_verified_at) return { ok: false, reason: "Enter the OTP sent to your phone before submitting" };
  if (!action.paid_at) return { ok: false, reason: "Pay the approved fee before submitting" };
  return { ok: true, reason: "approved" };
}

/** Mock card payment rules for the demo gateway. Card 4000 0000 0000 0002 always declines. */
export function validateMockPayment(card: { number: string; name: string; expiry: string; cvv: string }): { ok: boolean; reason: string } {
  const digits = card.number.replace(/\D/g, "");
  if (digits.length !== 16) return { ok: false, reason: "Card number must be 16 digits" };
  if (!card.name.trim()) return { ok: false, reason: "Enter the name on the card" };
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return { ok: false, reason: "Expiry must be MM/YY" };
  if (!/^\d{3}$/.test(card.cvv)) return { ok: false, reason: "CVV must be 3 digits" };
  if (digits === "4000000000000002") return { ok: false, reason: "Card declined (demo decline card)" };
  return { ok: true, reason: "accepted" };
}

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 3;

/** Decide whether an entered OTP is accepted. Hashes are compared, never raw codes. */
export function checkOtp(
  ch: { code_hash: string; expires_at: string; attempts: number; verified_at: string | null } | null,
  enteredHash: string,
  now: number,
): { ok: boolean; reason: string } {
  if (!ch) return { ok: false, reason: "No OTP has been sent. Request one first." };
  if (ch.verified_at) return { ok: false, reason: "This OTP was already used. Request a new one." };
  if (ch.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "Too many wrong attempts. Request a new OTP." };
  if (now > new Date(ch.expires_at).getTime()) return { ok: false, reason: "OTP expired. Request a new one." };
  if (ch.code_hash !== enteredHash) return { ok: false, reason: "Wrong OTP." };
  return { ok: true, reason: "verified" };
}

export type StateIdT = StateId;

export interface Payload {
  serviceId?: string;
  formId?: string;
  applicant?: string;
  docType?: string;
  state?: string;
  attachedProofs?: string[];
  fee?: number;
  approvedFee?: number;
  slot?: string;
  slotOptions?: string[];
  [k: string]: unknown;
}
