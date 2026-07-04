"use client";

import { useEffect, useState, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US");
}

export default function MemberPage() {
  const { data: session } = useSession();
  const [statement, setStatement] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [depMsg, setDepMsg] = useState("");
  const [wdAmount, setWdAmount] = useState("");
  const [wdReason, setWdReason] = useState("");
  const [wdMsg, setWdMsg] = useState("");

  const loadAll = useCallback(async () => {
    const [s, d, w] = await Promise.all([
      fetch("/api/statement").then((r) => r.json()),
      fetch("/api/deposits").then((r) => r.json()),
      fetch("/api/withdrawals").then((r) => r.json()),
    ]);
    setStatement(s);
    setDeposits(d);
    setWithdrawals(w);
    const years = Object.keys(s.byYear || {}).sort();
    if (!selectedYear && years.length) setSelectedYear(years[years.length - 1]);
  }, [selectedYear]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const years = statement ? Object.keys(statement.byYear).sort() : [];
  const monthsForYear = selectedYear && statement ? statement.byYear[selectedYear] : [];
  const dueMonths = monthsForYear.filter((m) => m.status === "DUE");

  async function submitDeposit(e) {
    e.preventDefault();
    setDepMsg("");
    if (!selectedMonthId) {
      setDepMsg("No due month selected.");
      return;
    }
    const res = await fetch("/api/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthRecordId: selectedMonthId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDepMsg(data.error || "Could not submit.");
      return;
    }
    setDepMsg("Submitted for admin approval.");
    setSelectedMonthId("");
    loadAll();
  }

  async function submitWithdrawal(e) {
    e.preventDefault();
    setWdMsg("");
    const res = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseInt(wdAmount, 10), reason: wdReason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setWdMsg(data.error || "Could not submit.");
      return;
    }
    setWdMsg("Withdrawal request submitted for admin approval.");
    setWdAmount("");
    setWdReason("");
    loadAll();
  }

  if (!statement) return <div className="wrap">Loading…</div>;

  return (
    <div>
      <div className="session-bar no-print">
        <span>Signed in as <b>{session?.user?.name}</b> (view only)</span>
        <button className="btn-logout" onClick={() => signOut({ callbackUrl: "/login" })}>Log out</button>
      </div>

      <div className="wrap">
        <div className="title-row">
          <h1>{statement.name} — Chanda Statement</h1>
          <button className="btn-secondary no-print" onClick={() => window.print()}>Print statement</button>
        </div>

        <div className="kpi-grid">
          <div className="kpi"><div className="label">Your Total Paid</div><div className="value paid">৳{fmt(statement.totalPaid)}</div></div>
          <div className="kpi"><div className="label">Your Total Due</div><div className="value due">৳{fmt(statement.totalDue)}</div></div>
        </div>

        <div className="card section">
          <h3>Year: {selectedYear}</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }} className="no-print">
            {years.map((y) => (
              <button key={y} className={y === selectedYear ? "btn-primary" : "btn-secondary"} onClick={() => setSelectedYear(y)}>{y}</button>
            ))}
          </div>
          <div className="month-grid">
            {monthsForYear.map((m) => (
              <div key={m.id} className={`month-cell ${m.status}`}>
                <div>{m.monthLabel}</div>
                <div style={{ fontWeight: 700 }}>{m.status === "PAID" ? `৳${fmt(m.amount)}` : m.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2 section no-print">
          <div className="card">
            <h3>Submit a Deposit</h3>
            <form onSubmit={submitDeposit}>
              <label>Year</label>
              <select value={selectedYear || ""} onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonthId(""); }}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <label>Month</label>
              <select value={selectedMonthId} onChange={(e) => setSelectedMonthId(e.target.value)}>
                <option value="">{dueMonths.length ? "Select a due month" : "No due months in this year"}</option>
                {dueMonths.map((m) => <option key={m.id} value={m.id}>{m.monthLabel}</option>)}
              </select>
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Submit for approval</button>
              {depMsg && <p className={depMsg.includes("Submitted") ? "ok-text" : "error-text"}>{depMsg}</p>}
            </form>

            <h3 style={{ marginTop: 20 }}>Your pending deposits</h3>
            {deposits.filter((d) => d.status === "PENDING").length === 0 && <p className="empty-note">No pending submissions.</p>}
            {deposits.filter((d) => d.status === "PENDING").map((d) => (
              <div key={d.id} className="pending-item">
                <span><span className="badge-pending">PENDING</span> {d.monthLabel} {d.year} — ৳{fmt(d.amount)}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3>Request a Withdrawal</h3>
            <form onSubmit={submitWithdrawal}>
              <label>Amount (৳)</label>
              <input type="number" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} min="1" />
              <label>Reason</label>
              <textarea rows={3} value={wdReason} onChange={(e) => setWdReason(e.target.value)} />
              <button type="submit" className="btn-primary" style={{ marginTop: 14 }}>Submit request</button>
              {wdMsg && <p className={wdMsg.includes("submitted") ? "ok-text" : "error-text"}>{wdMsg}</p>}
            </form>

            <h3 style={{ marginTop: 20 }}>Your withdrawal requests</h3>
            {withdrawals.length === 0 && <p className="empty-note">No withdrawal requests yet.</p>}
            {withdrawals.map((w) => (
              <div key={w.id} className="pending-item">
                <span>
                  <span className={w.status === "PENDING" ? "badge-pending" : w.status === "APPROVED" ? "badge-approved" : "badge-rejected"}>{w.status}</span>
                  {" "}৳{fmt(w.amount)} — {w.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
