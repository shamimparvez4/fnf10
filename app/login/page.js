"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const res = await signIn("credentials", {
      loginId,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setErrorMsg("Invalid ID or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="center-screen">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>FNF Chanda Fund</h1>
        <p style={{ color: "var(--muted)", marginTop: -6, marginBottom: 18 }}>
          Sign in with the ID and password given to you by the admin.
        </p>

        <label>Phone number / Email</label>
        <input
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="e.g. 01900000001"
          autoFocus
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <button type="submit" className="btn-primary" style={{ marginTop: 18, width: "100%" }} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 16 }}>
          There's no self sign-up here — accounts are created by the admin only.
        </p>
      </form>
    </div>
  );
}
