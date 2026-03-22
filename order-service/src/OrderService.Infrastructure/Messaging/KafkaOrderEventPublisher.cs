using Confluent.Kafka;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using OrderService.Application.Interfaces;
using OrderService.Domain.Entities;

namespace OrderService.Infrastructure.Messaging;

public class KafkaOrderEventPublisher : IOrderEventPublisher
{
    private readonly IProducer<string, string> _producer;
    private readonly string _topic;

    public KafkaOrderEventPublisher(IConfiguration config)
    {
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = config["Kafka:BootstrapServers"] ?? "kafka:9092"
        };
        _producer = new ProducerBuilder<string, string>(producerConfig).Build();
        _topic = config["Kafka:OrderCreatedTopic"] ?? "order.created";
    }

    public async Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Serialize(new
        {
            OrderId = order.Id,
            order.ProductId,
            order.Quantity,
            order.TotalAmount,
            order.CreatedAt
        });
        await _producer.ProduceAsync(_topic, new Message<string, string>
        {
            Key = order.Id.ToString(),
            Value = payload
        }, cancellationToken);
    }
}
