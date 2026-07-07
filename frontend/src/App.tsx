import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import SearchPage from "./pages/SearchPage";
import PlaceOrderPage from "./pages/PlaceOrderPage";
import SimulationPage from "./pages/SimulationPage";

const navItems = [
  { to: "/",            label: "Dashboard",    end: true },
  { to: "/place-order", label: "Sipariş Ver" },
  { to: "/simulate",    label: "Simülasyon" },
  { to: "/orders",      label: "Siparişler" },
  { to: "/products",    label: "Ürünler" },
  { to: "/search",      label: "Arama" },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>Real-Time</span>
          <h1>Sales Analytics</h1>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Menü</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          Tüm servisler aktif
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/"            element={<DashboardPage />} />
          <Route path="/place-order" element={<PlaceOrderPage />} />
          <Route path="/simulate"    element={<SimulationPage />} />
          <Route path="/orders"      element={<OrdersPage />} />
          <Route path="/products"    element={<ProductsPage />} />
          <Route path="/search"      element={<SearchPage />} />
        </Routes>
      </main>
    </div>
  );
}
