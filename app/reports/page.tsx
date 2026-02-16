"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Monthly = {
  month: string; // "2026-02-01"
  total_due: number;
  total_paid: number;
  total_missing: number;
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
};

type Missing = {
  month: string;
  name: string;
  amount_due: number;
  amount_paid: number;
  missing: number;
};

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}
function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export default function ReportsPage() {
  const r = useRouter();
  const [months, setMonths] = useState<Monthly[]>([]);
  const [missing, setMissing] = useState<Missing[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return r.push("/login");

      setLoading(true);
      const { data: ms, error: e1 } = await supabase.from("monthly_summary").select("*");
      if (e1) alert(e1.message);

      const { data: mm, error: e2 } = await supabase.from("monthly_missing").select("*");
      if (e2) alert(e2.message);

      setMonths((ms ?? []) as any);
      setMissing((mm ?? []) as any);
      setSelectedMonth((ms?.[0]?.month ?? null) as any);
      setLoading(false);
    })();
  }, [r]);

  const missingForSelected = useMemo(() => {
    if (!selectedMonth) return [];
    return missing.filter((x) => x.month === selectedMonth);
  }, [missing, selectedMonth]);

  return (
    <main style={{ maxWidth: 1100, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Report</h1>
          <div style={{ opacity: 0.8 }}>Entrate per mese + quote mancanti</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => r.push("/")} style={btn()}>
            ← Dashboard
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ marginTop: 16, opacity: 0.8 }}>Caricamento...</div>
      ) : (
        <>
          {/* cards veloci */}
          {months[0] && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
              <Card title="Mese più recente" value={monthLabel(months[0].month)} />
              <Card title="Incassato" value={eur(Number(months[0].total_paid))} />
              <Card title="Manca ancora" value={eur(Number(months[0].total_missing))} />
              <Card
                title="Stati"
                value={`${months[0].paid_count} ✅  ${months[0].partial_count} 🟧  ${months[0].unpaid_count} ❌`}
              />
            </section>
          )}

          {/* tabella mesi */}
          <section style={{ marginTop: 16, ...panel() }}>
            <div style={{ padding: 12, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Storico mesi</b>
              <span style={{ opacity: 0.7, fontSize: 12 }}>Clicca un mese per vedere chi manca</span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", opacity: 0.8 }}>
                    <th style={th()}>Mese</th>
                    <th style={th()}>Dovuto</th>
                    <th style={th()}>Incassato</th>
                    <th style={th()}>Manca</th>
                    <th style={th()}>✅</th>
                    <th style={th()}>🟧</th>
                    <th style={th()}>❌</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr
                      key={m.month}
                      onClick={() => setSelectedMonth(m.month)}
                      style={{
                        cursor: "pointer",
                        background: selectedMonth === m.month ? "#141418" : "transparent",
                      }}
                    >
                      <td style={tdStrong()}>{monthLabel(m.month)}</td>
                      <td style={td()}>{eur(Number(m.total_due))}</td>
                      <td style={td()}>{eur(Number(m.total_paid))}</td>
                      <td style={tdStrong()}>{eur(Number(m.total_missing))}</td>
                      <td style={td()}>{m.paid_count}</td>
                      <td style={td()}>{m.partial_count}</td>
                      <td style={td()}>{m.unpaid_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* mancanti nel mese */}
          <section style={{ marginTop: 16, ...panel() }}>
            <div style={{ padding: 12, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Quote mancanti — {selectedMonth ? monthLabel(selectedMonth) : "-"}</b>
              <span style={{ opacity: 0.7, fontSize: 12 }}>
                {missingForSelected.length ? `${missingForSelected.length} persone` : "Nessuna quota mancante 🎉"}
              </span>
            </div>

            {missingForSelected.length === 0 ? (
              <div style={{ padding: 12, opacity: 0.8 }}>Tutto pagato per questo mese.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.8 }}>
                      <th style={th()}>Nome</th>
                      <th style={th()}>Dovuto</th>
                      <th style={th()}>Pagato</th>
                      <th style={th()}>Manca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingForSelected.map((x, i) => (
                      <tr key={`${x.month}-${x.name}-${i}`}>
                        <td style={tdStrong()}>{x.name}</td>
                        <td style={td()}>{eur(Number(x.amount_due))}</td>
                        <td style={td()}>{eur(Number(x.amount_paid))}</td>
                        <td style={tdStrong()}>{eur(Number(x.missing))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function panel(): React.CSSProperties {
  return { border: "1px solid #222", borderRadius: 16, overflow: "hidden", background: "#0f0f12" };
}
function btn(): React.CSSProperties {
  return { padding: 10, borderRadius: 12, border: "1px solid #333", background: "#121216", color: "#f2f2f2", cursor: "pointer" };
}
function th(): React.CSSProperties {
  return { padding: "10px 12px", borderBottom: "1px solid #222", whiteSpace: "nowrap" };
}
function td(): React.CSSProperties {
  return { padding: "10px 12px", borderBottom: "1px solid #1b1b1f", whiteSpace: "nowrap" };
}
function tdStrong(): React.CSSProperties {
  return { ...td(), fontWeight: 700 };
}
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #222", borderRadius: 16, padding: 14, background: "#0f0f12" }}>
      <div style={{ opacity: 0.75, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}
