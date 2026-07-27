import { useState } from "react";
import { login } from "../lib/auth";
import type { AuthUser } from "../types";

export default function Login({ onSuccess }: { onSuccess: (user: AuthUser) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const user = await login(username.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 380, paddingTop: 80 }}>
      <div className="panel">
        <h2>GKYS Solo — Giriş</h2>
        <p className="muted" style={{ marginTop: -8 }}>
          B.R. Levent Plastik · Giriş Kalite Yönetim Sistemi
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label>
            Kullanıcı Adı
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p style={{ color: "var(--ng)", fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
