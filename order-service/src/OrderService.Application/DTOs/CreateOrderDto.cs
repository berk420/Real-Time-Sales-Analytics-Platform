namespace OrderService.Application.DTOs;

public class CreateOrderDto
{
    public string CustomerName { get; set; } = default!;
    public string ProductId { get; set; } = default!;
    public int Quantity { get; set; }
    public decimal TotalAmount { get; set; }
}
