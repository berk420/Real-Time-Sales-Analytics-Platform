using Confluent.Kafka;
using System.Text.Json;
using AnalyticsService.Services;

namespace AnalyticsService.Messaging;

public class OrderCreatedConsumer : BackgroundService
{
    private readonly IConfiguration _config;
    private readonly IAnalyticsService _analytics;

    public OrderCreatedConsumer(IConfiguration config, IAnalyticsService analytics)
    {
        _config = config;
        _analytics = analytics;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
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
            var cr = consumer.Consume(stoppingToken);
            if (cr?.Message == null) continue;

            var doc = JsonDocument.Parse(cr.Message.Value).RootElement;

            var orderId = doc.GetProperty("OrderId").GetGuid();
            var productId = doc.GetProperty("ProductId").GetString()!;
            var quantity = doc.GetProperty("Quantity").GetInt32();
            var totalAmount = doc.GetProperty("TotalAmount").GetDecimal();
            var createdAt = doc.GetProperty("CreatedAt").GetDateTime();

            await _analytics.UpdateFromOrderAsync(orderId, productId, quantity, totalAmount, createdAt, stoppingToken);
        }
    }
}
