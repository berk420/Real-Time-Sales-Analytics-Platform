namespace OrderService.Domain.Entities;

public class Order
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CustomerName { get; set; } = default!;
    public decimal TotalAmount { get; set; }
    public string ProductId { get; set; } = default!;
    public int Quantity { get; set; }
}
