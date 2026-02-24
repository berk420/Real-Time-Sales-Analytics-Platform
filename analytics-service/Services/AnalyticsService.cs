using AnalyticsService.Caching;

namespace AnalyticsService.Services;

public class AnalyticsService : IAnalyticsService
{
    private const string DashboardCacheKey = "analytics:dashboard";
    private readonly RedisCacheService _cache;

    private decimal _totalSales;
    private int _totalOrders;
    private readonly Dictionary<string, decimal> _salesPerProduct = new();

    public AnalyticsService(RedisCacheService cache)
    {
        _cache = cache;
    }

    public async Task<DashboardMetrics> GetDashboardAsync(CancellationToken cancellationToken = default)
    {
        var cached = await _cache.GetAsync<DashboardMetrics>(DashboardCacheKey);
        if (cached != null) return cached;

        var topProduct = _salesPerProduct.OrderByDescending(x => x.Value).FirstOrDefault();
        var metrics = new DashboardMetrics(
            _totalSales,
            _totalOrders,
            topProduct.Key,
            topProduct.Value
        );

        await _cache.SetAsync(DashboardCacheKey, metrics, TimeSpan.FromSeconds(30));
        return metrics;
    }

    public async Task UpdateFromOrderAsync(Guid orderId, string productId, int quantity, decimal totalAmount, DateTime createdAt, CancellationToken cancellationToken = default)
    {
        _totalOrders++;
        _totalSales += totalAmount;

        if (!_salesPerProduct.ContainsKey(productId))
            _salesPerProduct[productId] = 0;
        _salesPerProduct[productId] += totalAmount;

        await _cache.SetAsync<DashboardMetrics?>(DashboardCacheKey, null);
    }
}
