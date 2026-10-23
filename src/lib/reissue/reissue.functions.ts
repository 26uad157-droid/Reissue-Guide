import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { type Payload, planReissue, validateInput, canExecute, checkOtp, OTP_TTL_MS, describeObservedStatus, validateMockPayment, type Plan } from "./agent";
import { searchReissueSources, availableSlots, type StateId, type DocTypeId } from "./portal";

const db = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const j = (v: unknown) => v as Json;

const caseInput = z.object({
  docType: z.string().min(1),
  state: z.string().min(1),
  proofs: z.array(z.string()),
  applicantName: z.string().trim().min(1).max(80).default("Demo Applicant"),
});

async function createCaseImpl(input: z.infer<typeof caseInput>) {
  const errs = validateInput(input);
  if (errs.length) throw new Error(errs.join("; "));
  const sb = await db();
  const caseCode = `CASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const { data: c, error } = await sb
    .from("cases")
    .insert({ case_code: caseCode, doc_type: input.docType, state: input.state, proofs: input.proofs, applicant_name: input.applicantName })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Find information + plan
  const results = searchReissueSources(input.docType as DocTypeId, input.state as StateId);
  const { plan, decisions, evidence } = planReissue(input, results);
  const retrievedAt = new Date().toISOString();
  const e1 = await sb.from("source_evidence").insert(
    evidence.map((e) => ({ case_id: c.id, source_id: e.sourceId, url: e.url, title: e.title, is_official: e.isOfficial, used: e.used, reason: e.reason, extracted: j(e.extracted), retrieved_at: retrievedAt })),
  );
  if (e1.error) throw new Error(e1.error.message);
  const e2 = await sb.from("decisions").insert(decisions.map((d) => ({ case_id: c.id, rule: d.rule, inputs: j(d.inputs), outcome: d.outcome, reason: d.reason })));
  if (e2.error) throw new Error(e2.error.message);

  let status = plan.status === "ready" ? "planned" : "uncertain";
  if (plan.status === "ready") {
    // Pre-fill request; it waits for human approval.
    const proposed = {
      serviceId: plan.serviceId,
      formId: plan.formId,
      applicant: input.applicantName,
      docType: input.docType,
      state: input.state,
      attachedProofs: input.proofs,
      fee: plan.fee,
      slotOptions: availableSlots(input.state as StateId),
    };
    const a = await sb.from("actions").insert({
      case_id: c.id,
      idempotency_key: `${c.id}:submit`,
      destination: `https://services.${input.state.toLowerCase()}.gov.mock/reissue/${plan.serviceId}/submit`,
      proposed: j(proposed),
    });
    if (a.error) throw new Error(a.error.message);
    status = "awaiting_approval";
  }
  await sb.from("cases").update({ plan: j(plan), status }).eq("id", c.id);
  return { id: c.id as string };
}

export const createCase = createServerFn({ method: "POST" })
  .inputValidator((d) => caseInput.parse(d))
  .handler(({ data }) => createCaseImpl(data));

export const listCases = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data, error } = await sb.from("cases").select("id, case_code, doc_type, state, status, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return data;
});

export const getCase = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const [c, ev, dec, act, ver] = await Promise.all([
      sb.from("cases").select("*").eq("id", data.id).single(),
      sb.from("source_evidence").select("*").eq("case_id", data.id).order("is_official", { ascending: false }),
      sb.from("decisions").select("*").eq("case_id", data.id).order("rule"),
      sb.from("actions").select("*").eq("case_id", data.id).order("created_at"),
      sb.from("verifications").select("*").eq("case_id", data.id).order("checked_at", { ascending: false }),
    ]);
    if (c.error) throw new Error(c.error.message);
    const actionIds = (act.data ?? []).map((a) => a.id);
    const { data: pays } = actionIds.length
      ? await sb.from("payments").select("*").in("action_id", actionIds).order("paid_at", { ascending: false })
      : { data: [] };
    return {
      case: { ...c.data, plan: c.data.plan as unknown as Plan | null },
      evidence: ev.data ?? [],
      decisions: dec.data ?? [],
      actions: act.data ?? [],
      verifications: ver.data ?? [],
      payments: pays ?? [],
    };
  });

async function decideImpl(actionId: string, approve: boolean, slot?: string) {
  const sb = await db();
  const { data: a, error } = await sb.from("actions").select("*").eq("id", actionId).single();
  if (error) throw new Error(error.message);
  if (a.status !== "awaiting_approval") return { status: a.status };
  if (!approve) {
    await sb.from("actions").update({ status: "rejected" }).eq("id", actionId);
    await sb.from("cases").update({ status: "rejected" }).eq("id", a.case_id);
    return { status: "rejected" };
  }
  const proposed = a.proposed as Payload;
  const options = (proposed.slotOptions as string[]) ?? [];
  if (!slot || !options.includes(slot)) throw new Error("Pick one of the offered slots");
  const approved = { ...proposed, slot, slotOptions: undefined, approvedFee: proposed.fee };
  await sb.from("actions").update({ status: "approved", approved_payload: j(approved), approved_at: new Date().toISOString() }).eq("id", actionId).eq("status", "awaiting_approval");
  await sb.from("cases").update({ status: "approved" }).eq("id", a.case_id);
  return { status: "approved" };
}

export const decideAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ actionId: z.string().uuid(), approve: z.boolean(), slot: z.string().optional() }).parse(d))
  .handler(({ data }) => decideImpl(data.actionId, data.approve, data.slot));

async function hashOtp(actionId: string, code: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${actionId}:${code}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendOtpImpl(actionId: string) {
  const sb = await db();
  const { data: a, error } = await sb.from("actions").select("*").eq("id", actionId).single();
  if (error) throw new Error(error.message);
  if (a.status !== "approved") throw new Error("Approve the fee and slot first");
  if (a.otp_verified_at) return { sent: false };
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  const code = String((n[0] ?? 0) % 1000000).padStart(6, "0");
  await sb.from("otp_challenges").update({ verified_at: null, attempts: 99 }).eq("action_id", actionId).is("verified_at", null);
  const ins = await sb.from("otp_challenges").insert({ action_id: actionId, code_hash: await hashOtp(actionId, code), expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() });
  if (ins.error) throw new Error(ins.error.message);
  await sb.from("mock_sms_inbox").insert({ case_id: a.case_id, body: `Gov portal: your OTP to submit request ${String((a.approved_payload as Payload)?.formId ?? "")} is ${code}. Valid 5 minutes. Do not share it.` });
  return { sent: true };
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ actionId: z.string().uuid() }).parse(d))
  .handler(({ data }) => sendOtpImpl(data.actionId));

async function verifyOtpImpl(actionId: string, code: string) {
  const sb = await db();
  const { data: ch } = await sb.from("otp_challenges").select("*").eq("action_id", actionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const r = checkOtp(ch, await hashOtp(actionId, code), Date.now());
  if (!r.ok) {
    if (ch && r.reason === "Wrong OTP.") await sb.from("otp_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);
    throw new Error(r.reason);
  }
  const now = new Date().toISOString();
  await sb.from("otp_challenges").update({ verified_at: now }).eq("id", ch!.id);
  await sb.from("actions").update({ otp_verified_at: now }).eq("id", actionId);
  return { verified: true };
}

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ actionId: z.string().uuid(), code: z.string().regex(/^\d{6}$/, "OTP is 6 digits") }).parse(d))
  .handler(({ data }) => verifyOtpImpl(data.actionId, data.code));

const cardInput = z.object({
  actionId: z.string().uuid(),
  number: z.string().min(12).max(23),
  name: z.string().max(80),
  expiry: z.string().max(5),
  cvv: z.string().max(4),
});

async function payFeeImpl(input: z.infer<typeof cardInput>) {
  const sb = await db();
  const { data: a, error } = await sb.from("actions").select("*").eq("id", input.actionId).single();
  if (error) throw new Error(error.message);
  if (a.paid_at) {
    const { data: existing } = await sb.from("payments").select("*").eq("action_id", a.id).order("paid_at", { ascending: false }).limit(1).maybeSingle();
    return { paid: true, duplicate: true, payment: existing };
  }
  if (a.status !== "approved" || !a.approved_payload) throw new Error("Human approval required before paying");
  if (!a.otp_verified_at) throw new Error("Enter the OTP sent to your phone before paying");
  const check = validateMockPayment(input);
  if (!check.ok) throw new Error(check.reason);
  const fee = Number((a.approved_payload as Payload).approvedFee);
  const digits = input.number.replace(/\D/g, "");
  const ref = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const ins = await sb.from("payments").insert({
    action_id: a.id,
    amount: fee,
    method: "card",
    card_last4: digits.slice(-4),
    status: "success",
    transaction_ref: ref,
  });
  if (ins.error) throw new Error(ins.error.message);
  await sb.from("actions").update({ paid_at: new Date().toISOString() }).eq("id", a.id).is("paid_at", null);
  return { paid: true, duplicate: false, payment: { transaction_ref: ref, amount: fee, card_last4: digits.slice(-4) } };
}

export const payFee = createServerFn({ method: "POST" })
  .inputValidator((d) => cardInput.parse(d))
  .handler(({ data }) => payFeeImpl(data));

export const getSmsInbox = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ caseId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: m } = await sb.from("mock_sms_inbox").select("*").eq("case_id", data.caseId).order("sent_at", { ascending: false }).limit(5);
    return m ?? [];
  });

async function executeImpl(actionId: string) {
  const sb = await db();
  const { data: a, error } = await sb.from("actions").select("*").eq("id", actionId).single();
  if (error) throw new Error(error.message);
  const check = canExecute(a);
  if (!check.ok) {
    if (check.reason === "already_executed") return { requestNumber: a.request_number, duplicate: true };
    throw new Error(check.reason);
  }
  // Atomic claim prevents duplicate execution on retries.
  const claim = await sb.from("actions").update({ status: "executing" }).eq("id", actionId).eq("status", "approved").select().maybeSingle();
  if (!claim.data) return { requestNumber: a.request_number, duplicate: true };
  const p = a.approved_payload as Payload;
  const requestNumber = `REQ-${String(p.state)}-${Date.now().toString().slice(-7)}`;
  const ins = await sb.from("portal_requests").insert({
    request_number: requestNumber,
    service_id: String(p.serviceId),
    payload: j(p),
    slot: String(p.slot),
    fee_paid: Number(p.approvedFee),
  });
  if (ins.error) {
    await sb.from("actions").update({ status: "approved" }).eq("id", actionId);
    throw new Error(ins.error.message);
  }
  await sb.from("actions").update({ status: "executed", request_number: requestNumber, slot: String(p.slot), executed_at: new Date().toISOString() }).eq("id", actionId);
  await sb.from("cases").update({ status: "submitted" }).eq("id", a.case_id);
  return { requestNumber, duplicate: false };
}

export const executeAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ actionId: z.string().uuid() }).parse(d))
  .handler(({ data }) => executeImpl(data.actionId));

async function verifyImpl(actionId: string) {
  const sb = await db();
  const { data: a } = await sb.from("actions").select("*").eq("id", actionId).single();
  if (!a) throw new Error("Action not found");
  const intended = { requestNumber: a.request_number, slot: a.slot, fee: (a.approved_payload as Payload | null)?.approvedFee ?? null };
  let observed: { found: boolean; status?: string; [k: string]: unknown } = { found: false };
  let result = "pending";
  let note = "No request number yet – action not executed.";
  if (a.request_number) {
    const { data: r } = await sb.from("portal_requests").select("*").eq("request_number", a.request_number).maybeSingle();
    if (!r) {
      result = "failed";
      note = "Portal has no record of this request number.";
    } else {
      const s = describeObservedStatus(r.status);
      observed = { found: true, requestNumber: r.request_number, status: r.status, slot: r.slot, feePaid: r.fee_paid };
      const match = r.slot === intended.slot && r.fee_paid === intended.fee;
      result = match ? "confirmed" : "mismatch";
      note = match ? `Request number confirmed on portal. ${s.label}.` : "Portal record differs from the approved request.";
    }
  }
  await sb.from("verifications").insert({ case_id: a.case_id, action_id: a.id, intended: j(intended), observed: j(observed), result, note });
  if (result === "confirmed") await sb.from("cases").update({ status: "request_received" }).eq("id", a.case_id);
  return { result, note, observed: j(observed), observedStatus: observed.status ?? null };
}

export const verifyAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ actionId: z.string().uuid() }).parse(d))
  .handler(({ data }) => verifyImpl(data.actionId));

// ---------- Official test cases ----------
export const runScenarios = createServerFn({ method: "POST" }).handler(async () => {
  const sb = await db();
  const base = { docType: "birth_certificate", state: "MH", proofs: ["fir_copy", "id_proof", "affidavit"], applicantName: "Test Applicant" };
  const runs: { tc: string; scenario: string; input: Json; expected: string; actual: string; passed: boolean; evidence: Json; explanation: string }[] = [];

  // TC1
  const { id } = await createCaseImpl(base);
  const { data: c1 } = await sb.from("cases").select("plan").eq("id", id).single();
  const plan = c1?.plan as unknown as Plan;
  const tc1 = plan?.formId === "FORM-BC-7";
  runs.push({ tc: "TC1", scenario: "Lost certificate", input: j(base), expected: "correct official reissue form found", actual: `Form ${plan?.formId} – ${plan?.title}`, passed: tc1, evidence: j({ caseId: id, plan }), explanation: tc1 ? "Official Form BC-7 selected from the .gov.mock portal." : "Selected form does not match catalogue." });

  // TC2
  const { data: ev } = await sb.from("source_evidence").select("url, is_official, used, reason").eq("case_id", id);
  const unofficialUsed = (ev ?? []).some((e) => !e.is_official && e.used);
  const sawAgent = (ev ?? []).some((e) => e.url.includes("agents"));
  runs.push({ tc: "TC2", scenario: "Unofficial agent website in results", input: j(base), expected: "avoided", actual: unofficialUsed ? "Unofficial source used" : sawAgent ? "Agent site present in results and rejected" : "No agent site in results", passed: sawAgent && !unofficialUsed, evidence: j({ caseId: id, sources: ev }), explanation: "Only https URLs on the .gov.mock domain are accepted." });

  // TC3
  const { data: act } = await sb.from("actions").select("*").eq("case_id", id).single();
  let blocked = false;
  try { await executeImpl(act!.id); } catch { blocked = true; }
  const { count: before } = await sb.from("portal_requests").select("*", { count: "exact", head: true }).eq("payload->>serviceId", "SVC-BC-DUP").gte("created_at", act!.created_at);
  const slot = ((act!.proposed as Payload).slotOptions as string[])[0];
  await decideImpl(act!.id, true, slot);
  let otpBlocked = false;
  try { await executeImpl(act!.id); } catch { otpBlocked = true; }
  let payBeforeOtpBlocked = false;
  try { await payFeeImpl({ actionId: act!.id, number: "4242424242424242", name: "Test Applicant", expiry: "12/29", cvv: "123" }); } catch { payBeforeOtpBlocked = true; }
  await sendOtpImpl(act!.id);
  const { data: sms } = await sb.from("mock_sms_inbox").select("body").eq("case_id", id).order("sent_at", { ascending: false }).limit(1).single();
  await verifyOtpImpl(act!.id, /(\d{6})/.exec(sms!.body)?.[1] ?? "");
  let unpaidBlocked = false;
  try { await executeImpl(act!.id); } catch { unpaidBlocked = true; }
  const pay = await payFeeImpl({ actionId: act!.id, number: "4242424242424242", name: "Test Applicant", expiry: "12/29", cvv: "123" });
  const payAgain = await payFeeImpl({ actionId: act!.id, number: "4242424242424242", name: "Test Applicant", expiry: "12/29", cvv: "123" });
  const exec = await executeImpl(act!.id);
  const again = await executeImpl(act!.id);
  const { data: act2 } = await sb.from("actions").select("*").eq("id", act!.id).single();
  const tc3 = blocked && otpBlocked && payBeforeOtpBlocked && unpaidBlocked && before === 0 && !!act2?.approved_at && !!act2?.paid_at && payAgain.duplicate && again.duplicate;
  runs.push({ tc: "TC3", scenario: "Reissue fee", input: j({ ...base, fee: plan?.fee ?? null }), expected: "approved before payment", actual: `Execute before approval ${blocked ? "blocked" : "NOT blocked"}; before OTP ${otpBlocked ? "blocked" : "NOT blocked"}; pay before OTP ${payBeforeOtpBlocked ? "blocked" : "NOT blocked"}; execute before payment ${unpaidBlocked ? "blocked" : "NOT blocked"}; paid ${act2?.paid_at} (${String((pay.payment as { transaction_ref?: string } | null)?.transaction_ref)}); duplicate payment=${payAgain.duplicate}; retry duplicate=${again.duplicate}`, passed: tc3, evidence: j({ actionId: act!.id, approvedPayload: act2?.approved_payload ?? null }), explanation: "Execution requires a stored approved version, an OTP entered by the human, and a successful fee payment; retries reuse the same payment and request number." });

  // TC4
  const v = await verifyImpl(act!.id);
  const reportedIssued = String(v.note).toLowerCase().startsWith("issued");
  const tc4 = v.result === "confirmed" && v.observedStatus !== "issued" && !reportedIssued;
  runs.push({ tc: "TC4", scenario: "Request number received", input: j({ requestNumber: exec.requestNumber }), expected: "not reported as issued", actual: v.note, passed: tc4, evidence: j({ observed: v.observed }), explanation: "Portal status 'received' is shown as received, never as issued." });

  const ins = await sb.from("test_runs").insert(runs);
  if (ins.error) throw new Error(ins.error.message);
  return runs;
});

export const listTestRuns = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data } = await sb.from("test_runs").select("*").order("ran_at", { ascending: false }).limit(40);
  return data ?? [];
});

export const listPortalRequests = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await db();
  const { data } = await sb.from("portal_requests").select("*").order("created_at", { ascending: false }).limit(50);
  return data ?? [];
});
