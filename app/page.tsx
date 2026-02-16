"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/lib/useMediaQuery";

type Row = {
  participant_id: string;
  name: string;
  monthly_fee: number;
  charge_id: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  paid_at: string | null;
};

function firstDayOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function isoDateLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eur(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

export default function HomePage() {
  const r = useRouter();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [sessionReady, setSessionReady] = useState(false);

  const [month, setMonth] = useState(() => isoDateLocal(firstDayOfMonth()));
  const [rows, setRows] = useState<Row[]>([]);
  const [onlyDue, setOnlyDue] = useState(false);
  const [loading, setLoading] = useState(true);

  const monthLabel = useMemo(() => {
    const d = new Date(month);
    return d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }, [month]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) r.push("/login");
      else setSessionReady(true);
    })();
  }, [r]);

  async function ensureMonthCharges() {
    // crea (se mancano) le righe charges per tutti i partecipanti per il mese selezionato
    const { data: participants, error: pErr } = await supabase
      .from("participants")
      .select("id, monthly_fee");
    if (pErr) throw pErr;

    // prendi charges esistenti
    const { data: charges, error: cErr } = await supabase
      .from("charges")
      .select("participant_id")
      .eq("month", month);
    if (cErr) throw cErr;

    const existing = new Set((charges ?? []).map((c) => c.participant_id));
    const toInsert = (participants ?? [])
      .filter((p) => !existing.has(p.id))
      .map((p) => ({
        participant_id: p.id,
        month,
        amount_due: Number(p.monthly_fee ?? 0),
        amount_paid: 0,
      }));

    if (toInsert.length) {
      const { error } = await supabase.from("charges").insert(toInsert);
      if (error) throw error;
    }
  }

  async function load() {
    setLoading(true);

    // participants + left join charges del mese
    // (Query in 2 step per semplicità)
    const { data: participants, error: pErr } = await supabase
      .from("participants")
      .select("id, name, monthly_fee")
      .order("name");
    if (pErr) throw pErr;

    const { data: charges, error: cErr } = await supabase
      .from("charges")
      .select("id, participant_id, amount_due, amount_paid, paid_at")
      .eq("month", month);
    if (cErr) throw cErr;

    const byPid = new Map((charges ?? []).map((c) => [c.participant_id, c]));
    const merged: Row[] = (participants ?? []).map((p) => {
      const c = byPid.get(p.id) ?? null;
      return {
        participant_id: p.id,
        name: p.name,
        monthly_fee: Number(p.monthly_fee ?? 0),
        charge_id: c?.id ?? null,
        amount_due: c?.amount_due ?? null,
        amount_paid: c?.amount_paid ?? null,
        paid_at: c?.paid_at ?? null,
      };
    });

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    if (!sessionReady) return;
    (async () => {
      try {
        await ensureMonthCharges();
        await load();
      } catch (e: any) {
        console.error(e);
        alert(e.message ?? "Errore");
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, month]);

  async function setPaid(row: Row, amountPaid: number) {
    if (!row.charge_id) return;
    const due = Number(row.amount_due ?? row.monthly_fee);
    const paid_at = amountPaid >= due ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("charges")
      .update({ amount_paid: amountPaid, amount_due: due, paid_at })
      .eq("id", row.charge_id);

    if (error) alert(error.message);
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    r.push("/login");
  }

  const filtered = rows.filter((x) => {
    const due = Number(x.amount_due ?? x.monthly_fee);
    const paid = Number(x.amount_paid ?? 0);
    const missing = Math.max(0, due - paid);
    return onlyDue ? missing > 0.001 : true;
  });

  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          gap: 12,
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Pagamenti Spotify</h1>
          <div style={{ opacity: 0.8 }}>
            Mese: <b>{monthLabel}</b>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <input
            type="month"
            value={month.slice(0, 7)}
            onChange={(e) => setMonth(`${e.target.value}-01`)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #333", width: isMobile ? "100%" : 220 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => r.push("/participants")} style={btn(isMobile)}>Partecipanti</button>
            <button onClick={() => r.push("/reports")} style={btn(isMobile)}>Report</button>
            <button onClick={logout} style={btn(isMobile)}>Esci</button>
          </div>
        </div>
      </header>

      <section style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
          Mostra solo chi deve pagare
        </label>
      </section>

      {isMobile ? (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {filtered.map((x) => {
            const due = Number(x.amount_due ?? x.monthly_fee);
            const paid = Number(x.amount_paid ?? 0);
            const missing = due - paid;
            const status = missing <= 0.001 ? "✅ Pagato" : paid > 0 ? "🟧 Parziale" : "❌ Non pagato";

            return (
              <div key={x.participant_id} style={mobileCard()}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{x.name}</div>
                    <div style={{ opacity: 0.8, marginTop: 2 }}>{status}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Manca</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{eur(Math.max(0, missing))}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                  <div><div style={miniLabel()}>Dovuto</div><div style={miniVal()}>{eur(due)}</div></div>
                  <div><div style={miniLabel()}>Pagato</div><div style={miniVal()}>{eur(paid)}</div></div>
                  <div><div style={miniLabel()}>Residuo</div><div style={miniVal()}>{eur(Math.max(0, missing))}</div></div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => setPaid(x, due)} style={btn(true)}>✅ Pagato</button>
                  <button
                    onClick={() => {
                      const v = prompt("Quanto ha pagato? (es. 1.50)", String(paid));
                      if (v == null) return;
                      const n = Number(String(v).replace(",", "."));
                      if (Number.isNaN(n)) return alert("Numero non valido");
                      setPaid(x, n);
                    }}
                    style={btn(true)}
                  >
                    🟧 Parziale
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 16, border: "1px solid #222", borderRadius: 14, overflow: "hidden" }}>
          {/* qui lasci la tua tabella desktop com'è */}
        </div>
      )}

    </main>
  );
  function btn(isMobile: boolean): React.CSSProperties {
  return {
    padding: isMobile ? 12 : 10,
    borderRadius: 12,
    border: "1px solid #333",
    background: "#121216",
    color: "#f2f2f2",
    cursor: "pointer",
    flex: 1,
    minHeight: isMobile ? 44 : 36,
  };
}

  function mobileCard(): React.CSSProperties {
    return { border: "1px solid #222", borderRadius: 16, padding: 12, background: "#0f0f12" };
  }
  function miniLabel(): React.CSSProperties {
    return { fontSize: 11, opacity: 0.75 };
  }
  function miniVal(): React.CSSProperties {
    return { fontWeight: 800, marginTop: 2 };
  }

}
