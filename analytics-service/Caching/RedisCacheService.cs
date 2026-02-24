using StackExchange.Redis;
using System.Text.Json;

namespace AnalyticsService.Caching;

public class RedisCacheService
{
    private readonly IDatabase _db;

    public RedisCacheService(IConfiguration config)
    {
        var conn = ConnectionMultiplexer.Connect(config["Redis:ConnectionString"] ?? "redis:6379");
        _db = conn.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var value = await _db.StringGetAsync(key);
        if (value.IsNullOrEmpty) return default;
        return JsonSerializer.Deserialize<T>(value!);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        var json = JsonSerializer.Serialize(value);
        return _db.StringSetAsync(key, json, expiry);
    }
}
