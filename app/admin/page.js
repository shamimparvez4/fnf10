"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US");
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [form, setForm] = useState({ name: "", loginId: "", password: "" });
  const [formMsg, setFormMsg] = useState("");

  const loadAll = useCallback(async () => {
    const [s, m, d, w] = await Promise.all([
      fetch("/api/summary").then((r) => r.json()),
      fetch("/api/admin/members").then((r) => r.json()),
      fetch("/api/deposits").then((r) => r.json()),
      fetch("/api/withdrawals").then((r) => r.json()),
    ]);
    setSummary(s);
    setMembers(m);
    setDeposits(d);
    setWithdrawals(w);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function addMember(e) {
    e.preventDefault();
    setFormMsg("");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormMsg(data.error || "Could not create member.");
      return;
    }
    setForm({ name: "", loginId: "", password: "" });
    setShowAddMember(false);
    loadAll();
  }

  async function decideDeposit(id, action) {
    await fetch(`/api/deposits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadAll();
  }

  async function decideWithdrawal(id, action) {
    const res = await fetch(`/api/withdrawals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    if (!res.ok) alert(d.error);
    loadAll();
  }

  const pendingDeposits = deposits.filter((d) => d.status === "PENDING");
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING");
  const decidedWithdrawals = withdrawals.filter((w) => w.status !== "PENDING");

  const chartData = members.map((m) => ({ name: m.name.split(" ")[0], Paid: m.totalPaid, Due: m.totalDue }));

  return (
    <div>
      <div className="session-bar no-print">
        <span>Signed in as <b className="tag-admin">Admin</b> ({session?.user?.loginId})</span>
        <button className="btn-logout" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</button>
      </div>

      <div className="wrap">
        <div className="title-row">
          <h1>FNF Fund — Admin Dashboard</h1>
          <button className="btn-primary" onClick={() => setShowAddMember((v) => !v)}>
            {showAddMember ? "Cancel" : "+ Add Member"}
          </button>
        </div>

        {showAddMember && (
          <form className="card" style={{ marginBottom: 24 }} onSubmit={addMember}>
            <h3>Create a new member account</h3>
            <label>Full name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label>Login ID (phone number or email)</label>
            <input required value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} />
            <label>Initial password</label>
            <input required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {formMsg && <p className="error-text">{formMsg}</p>}
            <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Create member</button>
          </form>
        )}

        {summary && (
          <div className="kpi-grid">
            <div className="kpi"><div className="label">Total Paid</div><div className="value paid">৳{fmt(summary.totalPaid)}</div></div>
            <div className="kpi"><div className="label">Total Due</div><div className="value due">৳{fmt(summary.totalDue)}</div></div>
            <div className="kpi"><div className="label">Fund Balance</div><div className="value gold">৳{fmt(summary.fundBalance)}</div></div>
            <div className="kpi"><div className="label">Members</div><div className="value">{summary.memberCount}</div></div>
            <div className="kpi"><div className="label">Fully Cleared</div><div className="value">{summary.cleared}/{summary.memberCount}</div></div>
          </div>
        )}

        {chartData.length > 0 && (
          <div className="card section">
            <h3>Paid vs Due by Member</h3>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3350" />
                  <XAxis dataKey="name" stroke="#93a0c0" fontSize={12} />
                  <YAxis stroke="#93a0c0" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#161d2e", border: "1px solid #2a3350" }} />
                  <Legend />
                  <Bar dataKey="Paid" fill="#3fbf7f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Due" fill="#e5636b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="card section">
          <h3>Members</h3>
          <table>
            <thead>
              <tr><th>Name</th><th>Login ID</th><th>Paid</th><th>Due</th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.loginId}</td>
                  <td className="chip paid" style={{ background: "none", padding: 0 }}>৳{fmt(m.totalPaid)}</td>
                  <td className="chip due" style={{ background: "none", padding: 0 }}>৳{fmt(m.totalDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid-2 section">
          <div className="card">
            <h3>Pending Deposits ({pendingDeposits.length})</h3>
            {pendingDeposits.length === 0 && <p className="empty-note">No pending deposit submissions right now.</p>}
            {pendingDeposits.map((p) => (
              <div key={p.id} className="pending-item">
                <span><b>{p.user.name}</b> — {p.monthLabel} {p.year} · ৳{fmt(p.amount)}</span>
                <span>
                  <button className="btn-approve" onClick={() => decideDeposit(p.id, "approve")}>Approve</button>
                  <button className="btn-reject" onClick={() => decideDeposit(p.id, "reject")}>Reject</button>
                </span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Pending Withdrawals ({pendingWithdrawals.length})</h3>
            {pendingWithdrawals.length === 0 && <p className="empty-note">No pending withdrawal requests right now.</p>}
            {pendingWithdrawals.map((w) => (
              <div key={w.id} className="pending-item">
                <span><b>{w.user.name}</b> — ৳{fmt(w.amount)} · {w.reason}</span>
                <span>
                  <button className="btn-approve" onClick={() => decideWithdrawal(w.id, "approve")}>Approve</button>
                  <button className="btn-reject" onClick={() => decideWithdrawal(w.id, "reject")}>Reject</button>
                </span>
              </div>
            ))}

            {decidedWithdrawals.length > 0 && (
              <>
                <h3 style={{ marginTop: 20 }}>History</h3>
                {decidedWithdrawals.map((w) => (
                  <div key={w.id} className="pending-item">
                    <span>
                      <span className={w.status === "APPROVED" ? "badge-approved" : "badge-rejected"}>{w.status}</span>
                      {" "}<b>{w.user.name}</b> — ৳{fmt(w.amount)} · {w.reason}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
