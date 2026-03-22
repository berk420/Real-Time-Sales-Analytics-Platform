import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchProducts } from "../store/productsSlice";
import KafkaPipelinePanel from "../components/KafkaPipelinePanel";
import api from "../api/client";

interface PlacedOrder {
  id: string;
  productName: string;
  quantity: number;
  totalAmount: number;
}

export default function PlaceOrderPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.items);

  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [history, setHistory] = useState<PlacedOrder[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const selectedProduct = products.find((p) => p.id === selectedId);
  const unitPrice = (selectedProduct as any)?.price ?? 0;
  const total = unitPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError("");
    setLoading(true);
    setCurrentOrderId(null);

    try {
      const res = await api.post("/orders", {
        customerName: "Kullanıcı",
        productId: selectedProduct.id,
        quantity,
        totalAmount: total,
      });

      const orderId: string = res.data.id;
      setCurrentOrderId(orderId);
      setHistory((h) => [
        {
          id: orderId,
          productName: selectedProduct.name,
          quantity,
          totalAmount: total,
        },
        ...h.slice(0, 4),
      ]);
      setQuantity(1);
    } catch {
      setError("Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Sipariş Ver</h2>
        <p>Sipariş oluştur ve Kafka pipeline'ını gerçek zamanlı izle</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left: form + history */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Order form */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Yeni Sipariş</div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Ürün Seç
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  required
                  style={{
                    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "var(--text)", padding: "9px 12px",
                    fontSize: 13, outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="">-- Ürün seçin --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={(p as any).stock === 0}>
                      {p.name} — ₺{((p as any).price ?? 0).toLocaleString("tr-TR")}
                      {(p as any).stock === 0 ? " (Stok Yok)" : ` (${(p as any).stock} stok)`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Adet
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedProduct ? (selectedProduct as any).stock || 99 : 99}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="search-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Toplam Tutar
                  </label>
                  <div style={{
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "9px 12px", fontSize: 15,
                    fontWeight: 800, color: "#00c9a7",
                  }}>
                    ₺{total.toLocaleString("tr-TR")}
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(255,92,122,0.12)", border: "1px solid #ff5c7a", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#ff5c7a" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedId || total === 0}
                style={{
                  background: loading ? "var(--surface2)" : "var(--accent)",
                  color: "white", border: "none", borderRadius: 8,
                  padding: "12px 24px", fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                    Gönderiliyor…
                  </>
                ) : (
                  <>🛒 Sipariş Ver</>
                )}
              </button>
            </form>
          </div>

          {/* Order history */}
          {history.length > 0 && (
            <div className="table-card">
              <div className="table-toolbar">
                <h3>Son Siparişlerim</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Sipariş ID</th>
                    <th>Ürün</th>
                    <th>Adet</th>
                    <th>Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((o) => (
                    <tr key={o.id} style={{ opacity: currentOrderId === o.id ? 1 : 0.65 }}>
                      <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                        {o.id.substring(0, 8)}…
                      </td>
                      <td style={{ fontWeight: 600 }}>{o.productName}</td>
                      <td>{o.quantity}</td>
                      <td style={{ fontWeight: 700 }}>₺{o.totalAmount.toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Kafka pipeline panel */}
        <div style={{ position: "sticky", top: 24 }}>
          <KafkaPipelinePanel
            currentOrderId={currentOrderId}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
