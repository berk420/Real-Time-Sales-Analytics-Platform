using Confluent.Kafka;
using System.Text.Json;
using AnalyticsService.Services;

namespace AnalyticsService.Messaging;

public class OrderCreatedConsumer : BackgroundService
{
    private readonly IConfiguration _config;
    private readonly IAnalyticsService _analytics;
    private readonly EventBus _bus;

    public OrderCreatedConsumer(IConfiguration config, IAnalyticsService analytics, EventBus bus)
    {
        _config = config;
        _analytics = analytics;
        _bus = bus;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Yield so host startup completes before we block the thread
        await Task.Yield();

        var conf = new ConsumerConfig
        {
            GroupId = "analytics-service",
            BootstrapServers = _config["Kafka:BootstrapServers"] ?? "kafka:9092",
            AutoOffsetReset = AutoOffsetReset.Earliest
        };

        using var consumer = new ConsumerBuilder<string, string>(conf).Build();
        var topic = _config["Kafka:OrderCreatedTopic"] ?? "order.created";
        consumer.Subscribe(topic);

        while (!stoppingToken.IsCancellationRequested)
        {
            var cr = consumer.Consume(TimeSpan.FromMilliseconds(500));
            if (stoppingToken.IsCancellationRequested) break;
            if (cr?.Message == null) continue;

            var doc = JsonDocument.Parse(cr.Message.Value).RootElement;
            var orderId   = doc.GetProperty("OrderId").GetGuid();
            var productId = doc.GetProperty("ProductId").GetString()!;
            var quantity  = doc.GetProperty("Quantity").GetInt32();
            var total     = doc.GetProperty("TotalAmount").GetDecimal();
            var createdAt = doc.GetProperty("CreatedAt").GetDateTime();
            var shortId   = orderId.ToString()[..8];

            Emit("kafka_received", "Kafka Mesajı Alındı",
                $"Topic: {topic} | Partition: {cr.Partition.Value} | Offset: {cr.Offset.Value}",
                shortId, "info");
            await Task.Delay(250, stoppingToken);

            Emit("deserialize", "Mesaj Deserialize Edildi",
                $"OrderId: {shortId}… | ProductId: {productId} | Qty: {quantity} | ₺{total:N0}",
                shortId, "info");
            await Task.Delay(200, stoppingToken);

            Emit("analytics_update", "Analytics Güncelleniyor",
                $"totalOrders++ | totalSales += ₺{total:N0} | salesPerProduct[{productId}] += ₺{total:N0}",
                shortId, "warning");

            await _analytics.UpdateFromOrderAsync(orderId, productId, quantity, total, createdAt, stoppingToken);
            await Task.Delay(150, stoppingToken);

            Emit("cache_invalidated", "Redis Cache Temizlendi",
                "analytics:dashboard key silindi → 30s TTL resetlendi",
                shortId, "warning");
            await Task.Delay(200, stoppingToken);

            Emit("stock_update", "Stok Azaltıldı",
                $"Product Service Consumer: {productId} stok -{quantity} işlendi",
                shortId, "success");
            await Task.Delay(150, stoppingToken);

            Emit("completed", "Pipeline Tamamlandı",
                $"Sipariş #{shortId} tüm consumer'lar tarafından işlendi ✓",
                shortId, "success");
        }
    }

    private void Emit(string step, string label, string detail, string orderId, string level)
        => _bus.Publish(new PipelineEvent(step, label, detail, orderId, level));
}
