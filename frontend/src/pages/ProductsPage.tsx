import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchProducts } from "../store/productsSlice";

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.items);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  return (
    <div>
      <h2>Products</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
