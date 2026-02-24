namespace AnalyticsService.Services;

public record DashboardMetrics(
    decimal TotalSales,
    int TotalOrders,
    string? TopProductId,
    decimal TopProductSales);

public interface IAnalyticsService
{
    Task<DashboardMetrics> GetDashboardAsync(CancellationToken cancellationToken = default);
    Task UpdateFromOrderAsync(Guid orderId, string productId, int quantity, decimal totalAmount, DateTime createdAt, CancellationToken cancellationToken = default);
}
