import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

export interface DashboardMetrics {
  totalSales: number;
  totalOrders: number;
  topProductId?: string;
  topProductSales: number;
}

interface AnalyticsState {
  dashboard?: DashboardMetrics;
  status: "idle" | "loading" | "failed";
}

const initialState: AnalyticsState = {
  status: "idle",
};

export const fetchDashboard = createAsyncThunk(
  "analytics/fetchDashboard",
  async () => {
    const res = await api.get<DashboardMetrics>("/analytics/dashboard");
    return res.data;
  }
);

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.status = "idle";
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state) => {
        state.status = "failed";
      });
  },
});

export default analyticsSlice.reducer;
