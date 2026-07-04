import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/guard";
import { computeTotals, BN_MONTHS } from "../../../../lib/fund";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const members = await prisma.user.findMany({
    where: { role: "MEMBER" },
    include: { months: true },
    orderBy: { createdAt: "asc" },
  });

  const result = members.map((m) => {
    const { paid, due } = computeTotals(m.months);
    return {
      id: m.id,
      name: m.name,
      loginId: m.loginId,
      active: m.active,
      totalPaid: paid,
      totalDue: due,
    };
  });

  return NextResponse.json(result);
}

// Create a new member. Admin sets an initial password directly (no self sign-up).
// startYear/startMonthIndex marks when the member joined; months before that
// are recorded as NA, months from then through endYear are DUE by default.
export async function POST(req) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { name, loginId, password, startYear, startMonthIndex = 0, endYear } = body;

  if (!name || !loginId || !password) {
    return NextResponse.json({ error: "name, loginId and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) {
    return NextResponse.json({ error: "loginId already in use" }, { status: 409 });
  }

  const currentYear = new Date().getFullYear();
  const from = startYear || currentYear;
  const to = endYear || currentYear + 1;

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      loginId,
      password: hash,
      role: "MEMBER",
      months: {
        create: (() => {
          const rows = [];
          for (let year = from; year <= to; year++) {
            for (let idx = 0; idx < 12; idx++) {
              const isBeforeStart = year === from && idx < startMonthIndex;
              rows.push({
                year,
                monthIndex: idx,
                monthLabel: BN_MONTHS[idx],
                status: isBeforeStart ? "NA" : "DUE",
                amount: 0,
              });
            }
          }
          return rows;
        })(),
      },
    },
  });

  return NextResponse.json({ id: user.id, name: user.name, loginId: user.loginId }, { status: 201 });
}
