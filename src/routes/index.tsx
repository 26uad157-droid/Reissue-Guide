import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DOC_TYPES, PROOFS, STATES } from "@/lib/reissue/portal";
import { createCase } from "@/lib/reissue/reissue.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reissue Guide – Recover a lost certificate or ID" },
      { name: "description", content: "Get guided through the official reissue process for a lost certificate or ID card." },
      { property: "og:title", content: "Reissue Guide – Recover a lost certificate or ID" },
      { property: "og:description", content: "Official process, fee and documents needed — with your approval before anything is submitted." },
    ],
  }),
  component: Index,
});

const steps = ["Collect the details", "Plan the next steps", "Find the information", "Take action (your approval)"];

function Index() {
  const nav = useNavigate();
  const [docType, setDocType] = useState<string>(DOC_TYPES[0].id);
  const [state, setState] = useState<string>(STATES[0].id);
  const [proofs, setProofs] = useState<string[]>(["fir_copy", "id_proof"]);
  const [name, setName] = useState("Demo Applicant");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await createCase({ data: { docType, state, proofs, applicantName: name } });
      nav({ to: "/cases/$id", params: { id: r.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <section>
          <p className="text-sm font-medium uppercase tracking-widest text-accent-foreground/70">Lost document?</p>
          <h1 className="mt-2 text-4xl leading-tight md:text-5xl">We'll find the official way to get it reissued.</h1>
          <p className="mt-4 text-muted-foreground">Only official government sources are used. Nothing is submitted or paid until you approve it.</p>
          <ol className="mt-8 space-y-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-primary text-xs font-medium text-primary">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-2xl">Your details</h2>
          <div className="mt-5 space-y-5">
            <div>
              <Label htmlFor="name">Applicant name (use a demo name)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Document type</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DOC_TYPES.map((d) => (
                  <button key={d.id} type="button" onClick={() => setDocType(d.id)} className={`rounded-md border px-3 py-2 text-left text-sm ${docType === d.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>State</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATES.map((s) => (
                  <button key={s.id} type="button" onClick={() => setState(s.id)} className={`rounded-full border px-3 py-1 text-sm ${state === s.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Proofs you have</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {PROOFS.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={proofs.includes(p.id)} onCheckedChange={(v) => setProofs((cur) => (v ? [...cur, p.id] : cur.filter((x) => x !== p.id)))} />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={submit} disabled={busy || !name.trim()} className="w-full" size="lg">
              {busy ? "Checking official sources…" : "Find my reissue process"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
