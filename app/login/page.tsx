"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr(error.message);
    r.push("/");
  }

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Spotify Premium Tracker</h1>
      <p style={{ opacity: 0.8 }}>Login admin</p>

      <form onSubmit={onLogin} style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #333" }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #333" }}
        />
        <button
          disabled={loading}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #333", cursor: "pointer" }}
        >
          {loading ? "Accesso..." : "Entra"}
        </button>
        {err && <div style={{ color: "tomato" }}>{err}</div>}
      </form>
    </main>
  );
}
