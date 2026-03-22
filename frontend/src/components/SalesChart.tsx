import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { name: "Pzt", sales: 3200 },
  { name: "Sal", sales: 4100 },
  { name: "Çar", sales: 2800 },
  { name: "Per", sales: 5600 },
  { name: "Cum", sales: 4900 },
  { name: "Cmt", sales: 3700 },
  { name: "Paz", sales: 6200 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "#22263a",
        border: "1px solid #2e3249",
        borderRadius: 8,
        padding: "8px 14px",
        fontSize: 13,
        color: "#e8eaf0",
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
        <div style={{ color: "#6c63ff" }}>₺{payload[0].value.toLocaleString("tr-TR")}</div>
      </div>
    );
  }
  return null;
};

export default function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3249" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#8b91b0", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8b91b0", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₺${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="sales"
          stroke="#6c63ff"
          strokeWidth={2.5}
          fill="url(#salesGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#6c63ff", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
