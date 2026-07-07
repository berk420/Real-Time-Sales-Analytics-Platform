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

  const totalSales = dashboard?.totalSales ?? 0;
  const totalOrders = dashboard?.totalOrders ?? 0;
  const topProduct = dashboard?.topProductId ?? "-";
  const avgOrder = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : "0.00";

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Gerçek zamanlı satış özeti</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Toplam Satış</div>
          <div className="stat-value">₺{Number(totalSales).toLocaleString("tr-TR")}</div>
          <div className="stat-sub">Tüm zamanlar</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sipariş Sayısı</div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-sub">Toplam işlem</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">En Çok Satan</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{topProduct}</div>
          <div className="stat-sub">Top ürün ID</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ortalama Sipariş</div>
          <div className="stat-value">₺{Number(avgOrder).toLocaleString("tr-TR")}</div>
          <div className="stat-sub">Sipariş başına</div>
        </div>
      </div>

      <div className="chart-card">
        <h3>Haftalık Satış Trendi</h3>
        <SalesChart />
      </div>
    </>
  );
}
