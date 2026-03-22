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

    private static readonly string[] ProductIds =
        ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12","p13","p14","p15"];
    private static readonly decimal[] Prices =
        [64999,24999,54999,47999,12499,7999,39999,23999,19999,18999,34999,14999,4999,21999,39999];
    private static readonly string[] FirstNames =
        ["Ahmet","Fatma","Mehmet","Ayse","Ali","Zeynep","Hasan","Merve","Mustafa","Elif",
         "Burak","Selin","Emre","Gul","Serkan","Deniz","Oya","Caner","Tugba","Baris"];
    private static readonly string[] LastNames =
        ["Yilmaz","Kaya","Demir","Celik","Sahin","Arslan","Kurt","Dogan","Aydin","Koc",
         "Ozdemir","Erdogan","Yildiz","Cetin","Aktas","Kilic","Polat","Gunes","Yucel","Simsek"];

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

    [HttpPost("simulate")]
    public async Task<ActionResult> Simulate([FromBody] SimulateDto dto, CancellationToken cancellationToken)
    {
        var rng = new Random();
        var created = new List<object>();

        for (int i = 0; i < dto.Count && !cancellationToken.IsCancellationRequested; i++)
        {
            int pIdx = rng.Next(ProductIds.Length);
            int qty = rng.Next(1, 5);
            var order = new Order
            {
                Id = Guid.NewGuid(),
                CreatedAt = DateTime.UtcNow,
                CustomerName = $"{FirstNames[rng.Next(FirstNames.Length)]} {LastNames[rng.Next(LastNames.Length)]}",
                ProductId = ProductIds[pIdx],
                Quantity = qty,
                TotalAmount = Prices[pIdx] * qty,
            };

            await _repo.AddAsync(order, cancellationToken);
            await _publisher.PublishOrderCreatedAsync(order, cancellationToken);
            created.Add(new { order.Id, order.ProductId, order.TotalAmount });

            if (dto.IntervalMs > 0)
                await Task.Delay(dto.IntervalMs, cancellationToken);
        }

        return Ok(new { sent = created.Count, orders = created });
    }
}
