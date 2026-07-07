import { useState } from "react";
import { useAppSelector } from "../hooks";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const orders = useAppSelector((s) => s.orders.items);
  const products = useAppSelector((s) => s.products.items);

  const q = query.toLowerCase().trim();

  const matchedOrders = q
    ? orders.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          o.productId.toLowerCase().includes(q)
      )
    : [];

  const matchedProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : [];

  const total = matchedOrders.length + matchedProducts.length;

  return (
    <>
      <div className="page-header">
        <h2>Arama</h2>
        <p>Sipariş ve ürünlerde anlık arama</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <input
          className="search-input"
          style={{ width: "100%", fontSize: 15, padding: "10px 14px" }}
          placeholder="Müşteri adı, ürün adı veya kategori ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {q && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#8b91b0" }}>
            {total} sonuç bulundu
          </div>
        )}
      </div>

      {!q && (
        <div className="empty">
          <p>Aramak istediğiniz kelimeyi yazın</p>
        </div>
      )}

      {q && matchedOrders.length > 0 && (
        <div className="table-card" style={{ marginBottom: 20 }}>
          <div className="table-toolbar">
            <h3>Siparişler <span style={{ color: "#8b91b0", fontWeight: 400 }}>({matchedOrders.length})</span></h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Ürün ID</th>
                <th>Adet</th>
                <th>Tutar</th>
              </tr>
            </thead>
            <tbody>
              {matchedOrders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{o.customerName}</td>
                  <td><span className="badge badge-blue">{o.productId}</span></td>
                  <td>{o.quantity}</td>
                  <td style={{ fontWeight: 700 }}>₺{Number(o.totalAmount).toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {q && matchedProducts.length > 0 && (
        <div className="table-card">
          <div className="table-toolbar">
            <h3>Ürünler <span style={{ color: "#8b91b0", fontWeight: 400 }}>({matchedProducts.length})</span></h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ürün Adı</th>
                <th>Kategori</th>
                <th>Stok</th>
              </tr>
            </thead>
            <tbody>
              {matchedProducts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td><span className="badge badge-blue">{p.category}</span></td>
                  <td>{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {q && total === 0 && (
        <div className="empty">
          <p>"{query}" için sonuç bulunamadı</p>
        </div>
      )}
    </>
  );
}
