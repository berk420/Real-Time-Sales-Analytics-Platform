using Microsoft.AspNetCore.Mvc;
using OrderService.Application.DTOs;
using OrderService.Application.Interfaces;
using OrderService.Domain.Entities;

namespace OrderService.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderRepository _repo;
    private readonly IOrderEventPublisher _publisher;

    public OrdersController(IOrderRepository repo, IOrderEventPublisher publisher)
    {
        _repo = repo;
        _publisher = publisher;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Order>>> Get(CancellationToken cancellationToken)
        => Ok(await _repo.GetAllAsync(cancellationToken));

    [HttpPost]
    public async Task<ActionResult<Order>> Create([FromBody] CreateOrderDto dto, CancellationToken cancellationToken)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            CustomerName = dto.CustomerName,
            ProductId = dto.ProductId,
            Quantity = dto.Quantity,
            TotalAmount = dto.TotalAmount
        };

        await _repo.AddAsync(order, cancellationToken);
        await _publisher.PublishOrderCreatedAsync(order, cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
    }
}
