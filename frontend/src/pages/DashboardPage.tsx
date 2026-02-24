import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchDashboard } from "../store/analyticsSlice";
import SalesChart from "../components/SalesChart";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const dashboard = useAppSelector((s) => s.analytics.dashboard);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  return (
    <div>
      <h2>Dashboard</h2>
      <div style={{ display: "flex", gap: "1rem" }}>
        <div>Toplam Satış: {dashboard?.totalSales ?? 0}</div>
        <div>Sipariş Sayısı: {dashboard?.totalOrders ?? 0}</div>
        <div>Top Ürün: {dashboard?.topProductId ?? "-"}</div>
      </div>
      <SalesChart />
    </div>
  );
}
