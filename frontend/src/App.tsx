import { Link, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <div className="app">
      <nav style={{ padding: "1rem", borderBottom: "1px solid #eee" }}>
        <Link to="/">Dashboard</Link> | <Link to="/orders">Orders</Link> |{" "}
        <Link to="/products">Products</Link> | <Link to="/search">Search</Link>
      </nav>
      <main style={{ padding: "1rem" }}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </main>
    </div>
  );
}
