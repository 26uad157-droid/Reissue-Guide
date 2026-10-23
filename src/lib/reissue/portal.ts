// Mock government portal catalogue (synthetic data only).
export const OFFICIAL_DOMAIN = ".gov.mock";

export const DOC_TYPES = [
  { id: "birth_certificate", label: "Birth certificate" },
  { id: "class10_marksheet", label: "Class 10 marksheet / certificate" },
  { id: "caste_certificate", label: "Caste certificate" },
  { id: "voter_id", label: "Voter ID card" },
  { id: "driving_licence", label: "Driving licence" },
] as const;

export const STATES = [
  { id: "MH", label: "Maharashtra" },
  { id: "KA", label: "Karnataka" },
  { id: "DL", label: "Delhi" },
  { id: "UP", label: "Uttar Pradesh" },
] as const;

export const PROOFS = [
  { id: "fir_copy", label: "Police FIR / lost report" },
  { id: "id_proof", label: "Photo ID proof" },
  { id: "address_proof", label: "Address proof" },
  { id: "affidavit", label: "Notarised affidavit" },
  { id: "old_copy", label: "Photocopy of lost document" },
  { id: "photo", label: "Passport-size photo" },
] as const;

export type DocTypeId = (typeof DOC_TYPES)[number]["id"];
export type StateId = (typeof STATES)[number]["id"];
export type ProofId = (typeof PROOFS)[number]["id"];

export interface PortalService {
  serviceId: string;
  formId: string;
  docType: DocTypeId;
  title: string;
  authority: string;
  baseFee: number;
  required: ProofId[];
  optional: ProofId[];
  steps: string[];
}

export const SERVICES: PortalService[] = [
  {
    serviceId: "SVC-BC-DUP",
    formId: "FORM-BC-7",
    docType: "birth_certificate",
    title: "Duplicate Birth Certificate",
    authority: "Registrar of Births & Deaths",
    baseFee: 50,
    required: ["fir_copy", "id_proof", "affidavit"],
    optional: ["old_copy"],
    steps: ["File lost report", "Fill Form BC-7", "Pay fee", "Visit registrar for verification", "Collect duplicate"],
  },
  {
    serviceId: "SVC-MS-DUP",
    formId: "FORM-EDU-12",
    docType: "class10_marksheet",
    title: "Duplicate Marksheet / Passing Certificate",
    authority: "State Board of Secondary Education",
    baseFee: 300,
    required: ["fir_copy", "id_proof", "affidavit", "photo"],
    optional: ["old_copy"],
    steps: ["File lost report", "Fill Form EDU-12", "Pay fee", "Attend board office slot", "Receive duplicate by post"],
  },
  {
    serviceId: "SVC-CC-DUP",
    formId: "FORM-REV-3",
    docType: "caste_certificate",
    title: "Reissue of Caste Certificate",
    authority: "Tehsil / Revenue Office",
    baseFee: 30,
    required: ["fir_copy", "id_proof", "address_proof"],
    optional: ["old_copy", "affidavit"],
    steps: ["File lost report", "Fill Form REV-3", "Pay fee", "Tehsil verification slot", "Download signed certificate"],
  },
  {
    serviceId: "SVC-VID-DUP",
    formId: "FORM-EPIC-002",
    docType: "voter_id",
    title: "Replacement Voter ID (EPIC)",
    authority: "State Election Office",
    baseFee: 25,
    required: ["fir_copy", "id_proof", "photo"],
    optional: ["address_proof"],
    steps: ["File lost report", "Fill Form EPIC-002", "Pay fee", "Booth officer verification slot", "Collect EPIC"],
  },
  {
    serviceId: "SVC-DL-DUP",
    formId: "FORM-LLD",
    docType: "driving_licence",
    title: "Duplicate Driving Licence",
    authority: "Regional Transport Office",
    baseFee: 200,
    required: ["fir_copy", "id_proof", "address_proof", "photo"],
    optional: ["old_copy"],
    steps: ["File lost report", "Fill Form LLD", "Pay fee", "RTO biometric slot", "Licence dispatched by post"],
  },
];

const STATE_FEE_FACTOR: Record<StateId, number> = { MH: 1, KA: 1.2, DL: 1.5, UP: 0.8 };

export function officialFee(service: PortalService, state: StateId) {
  return Math.round(service.baseFee * STATE_FEE_FACTOR[state]);
}

export interface SearchResult {
  sourceId: string;
  url: string;
  title: string;
  serviceId: string | null;
  fee: number | null;
  formId: string | null;
}

/** Simulated search on the mock portal + open web. Includes unofficial agent sites on purpose. */
export function searchReissueSources(docType: DocTypeId, state: StateId): SearchResult[] {
  const svc = SERVICES.find((s) => s.docType === docType);
  const results: SearchResult[] = [
    {
      sourceId: `AGENT-${docType}-${state}`,
      url: `https://fast-reissue-agents.com/${docType}?state=${state}`,
      title: `Get your ${docType.replace(/_/g, " ")} in 24h – agent service`,
      serviceId: null,
      fee: svc ? officialFee(svc, state) * 10 : 999,
      formId: "AGENT-FORM",
    },
  ];
  if (svc) {
    results.push({
      sourceId: `${svc.serviceId}-${state}`,
      url: `https://services.${state.toLowerCase()}${OFFICIAL_DOMAIN}/reissue/${svc.serviceId}`,
      title: `${svc.title} – ${svc.authority} (official)`,
      serviceId: svc.serviceId,
      fee: officialFee(svc, state),
      formId: svc.formId,
    });
  }
  results.push({
    sourceId: `BLOG-${docType}`,
    url: `https://govt-help-blog.example/${docType}`,
    title: "How I got my duplicate document (blog)",
    serviceId: null,
    fee: null,
    formId: null,
  });
  return results;
}

export function availableSlots(state: StateId, from = new Date()): string[] {
  const slots: string[] = [];
  for (let d = 2; d <= 4; d++) {
    const day = new Date(from.getTime() + d * 86400000).toISOString().slice(0, 10);
    slots.push(`${day} 10:30 – ${state} office`, `${day} 14:00 – ${state} office`);
  }
  return slots;
}
