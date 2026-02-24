import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

export interface Order {
  id: string;
  customerName: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  createdAt: string;
}

interface OrdersState {
  items: Order[];
  status: "idle" | "loading" | "failed";
}

const initialState: OrdersState = {
  items: [],
  status: "idle",
};

export const fetchOrders = createAsyncThunk("orders/fetchOrders", async () => {
  const res = await api.get<Order[]>("/orders");
  return res.data;
});

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default ordersSlice.reducer;
