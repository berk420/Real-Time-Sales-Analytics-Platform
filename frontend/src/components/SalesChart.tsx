import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { name: "Mon", sales: 120 },
  { name: "Tue", sales: 98 },
  { name: "Wed", sales: 150 },
  { name: "Thu", sales: 80 },
  { name: "Fri", sales: 200 },
];

export default function SalesChart() {
  return (
    <LineChart width={600} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="sales" stroke="#8884d8" />
    </LineChart>
  );
}
