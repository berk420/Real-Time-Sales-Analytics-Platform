import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchOrders } from "../store/ordersSlice";

export default function OrdersPage() {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((s) => s.orders.items);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const filtered = orders.filter((o) =>
    o.customerName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h2>Siparişler</h2>
        <p>Tüm sipariş kayıtları</p>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <h3>Sipariş Listesi <span style={{ color: "#8b91b0", fontWeight: 400 }}>({filtered.length})</span></h3>
          <input
            className="search-input"
            placeholder="Müşteri adına göre filtrele…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <p>Sipariş bulunamadı</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Müşteri</th>
                <th>Ürün ID</th>
                <th>Adet</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.id}>
                  <td style={{ color: "#8b91b0" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{o.customerName}</td>
                  <td>
                    <span className="badge badge-blue">{o.productId}</span>
                  </td>
                  <td>{o.quantity}</td>
                  <td style={{ fontWeight: 700, color: "#e8eaf0" }}>
                    ₺{Number(o.totalAmount).toLocaleString("tr-TR")}
                  </td>
                  <td>
                    <span className="badge badge-green">Tamamlandı</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
