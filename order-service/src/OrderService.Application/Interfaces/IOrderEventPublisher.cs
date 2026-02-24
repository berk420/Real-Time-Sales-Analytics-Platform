using OrderService.Domain.Entities;

namespace OrderService.Application.Interfaces;

public interface IOrderEventPublisher
{
    Task PublishOrderCreatedAsync(Order order, CancellationToken cancellationToken = default);
}
