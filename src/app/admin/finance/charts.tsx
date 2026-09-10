"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#ff5a1f", "#14151a", "#3f4453", "#f59e0b", "#0ea5e9"];

export function RevenueChart({ data }: { data: { month: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--dg-slate)]">No revenue data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e6eb" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#3f4453" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#3f4453" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value: any) => [`£${Number(value).toFixed(2)}`, "Revenue"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e6eb", fontSize: 12 }}
        />
        <Bar dataKey="total" fill="#ff5a1f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentMethodChart({ data }: { data: { method: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--dg-slate)]">No payments recorded yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="method" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any, name: any) => [`£${Number(value).toFixed(2)}`, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
