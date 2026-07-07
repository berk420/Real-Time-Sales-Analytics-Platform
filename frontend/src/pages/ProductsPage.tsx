import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchProducts } from "../store/productsSlice";

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.items);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.category.toLowerCase().includes(filter.toLowerCase())
  );

  const stockBadge = (stock: number) => {
    if (stock === 0) return <span className="badge" style={{ background: "rgba(255,92,122,0.15)", color: "#ff5c7a" }}>Stok Yok</span>;
    if (stock < 10) return <span className="badge badge-yellow">Kritik</span>;
    return <span className="badge badge-green">Stokta</span>;
  };

  return (
    <>
      <div className="page-header">
        <h2>Ürünler</h2>
        <p>Ürün kataloğu ve stok durumu</p>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <h3>Ürün Listesi <span style={{ color: "#8b91b0", fontWeight: 400 }}>({filtered.length})</span></h3>
          <input
            className="search-input"
            placeholder="Ürün veya kategori ara…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="empty">
            <p>Ürün bulunamadı</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ürün Adı</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: "#8b91b0" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span className="badge badge-blue">{p.category}</span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{p.stock}</td>
                  <td>{stockBadge(p.stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
