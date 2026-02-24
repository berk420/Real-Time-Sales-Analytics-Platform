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
    <div>
      <h2>Orders</h2>
      <input
        placeholder="Filter by customer"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id}>
              <td>{o.customerName}</td>
              <td>{o.productId}</td>
              <td>{o.quantity}</td>
              <td>{o.totalAmount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
