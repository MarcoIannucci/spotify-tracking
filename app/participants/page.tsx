"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { exportParticipantPdf } from "@/lib/exportParticipantPdf";

type Participant = {
  id: string;
  name: string;
  monthly_fee: number;
  payment_method: string | null;
  notes: string | null;
};

export default function ParticipantsPage() {
  const r = useRouter();
  const [items, setItems] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("participants")
      .select("id, name, monthly_fee, payment_method, notes")
      .order("name");
    setLoading(false);
    if (error) return alert(error.message);
    setItems((data ?? []) as any);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) r.push("/login");
      else load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    const name = prompt("Nome partecipante?");
    if (!name) return;
    const feeStr = prompt("Quota mensile (es. 2.50)?", "2.50");
    if (feeStr == null) return;
    const monthly_fee = Number(feeStr.replace(",", "."));
    if (Number.isNaN(monthly_fee)) return alert("Numero non valido");

    const { error } = await supabase.from("participants").insert({ name, monthly_fee });
    if (error) return alert(error.message);
    load();
  }

  async function edit(p: Participant) {
    const name = prompt("Nome", p.name);
    if (!name) return;
    const feeStr = prompt("Quota mensile", String(p.monthly_fee));
    if (feeStr == null) return;
    const monthly_fee = Number(feeStr.replace(",", "."));
    if (Number.isNaN(monthly_fee)) return alert("Numero non valido");

    const { error } = await supabase.from("participants").update({ name, monthly_fee }).eq("id", p.id);
    if (error) return alert(error.message);
    load();
  }

  async function del(p: Participant) {
    if (!confirm(`Eliminare ${p.name}?`)) return;
    const { error } = await supabase.from("participants").delete().eq("id", p.id);
    if (error) return alert(error.message);
    load();
  }

  async function handleExportPdf(p: Participant) {
    const { data, error } = await supabase
      .from("charges")
      .select("month, amount_due, amount_paid")
      .eq("participant_id", p.id)
      .order("month", { ascending: true });

    if (error) return alert(error.message);

    exportParticipantPdf(p.name, p.monthly_fee, data ?? []);
  }


  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Partecipanti</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => r.push("/")} style={{ padding: 8, borderRadius: 10, border: "1px solid #333" }}>
            ← Dashboard
          </button>
          <button onClick={add} style={{ padding: 8, borderRadius: 10, border: "1px solid #333" }}>
            + Aggiungi
          </button>
        </div>
      </header>

      <div style={{ marginTop: 16, border: "1px solid #222", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr 0.8fr", background: "#111", padding: 12, fontWeight: 700 }}>
          <div>Nome</div>
          <div>Quota</div>
          <div>Azioni</div>
        </div>

        {loading ? (
          <div style={{ padding: 16, opacity: 0.8 }}>Caricamento...</div>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr 0.8fr", padding: 12, borderTop: "1px solid #222", alignItems: "center" }}
            >
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              <div>{p.monthly_fee.toFixed(2)} €</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => edit(p)}>Modifica</button>
                <button onClick={() => del(p)}>Elimina</button>
                <button onClick={() => handleExportPdf(p)}>PDF</button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
