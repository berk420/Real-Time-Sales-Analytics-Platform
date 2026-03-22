using Microsoft.AspNetCore.Mvc;
using AnalyticsService.Services;
using System.Text.Json;

namespace AnalyticsService.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _service;

    public AnalyticsController(IAnalyticsService service)
    {
        _service = service;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardMetrics>> GetDashboard(CancellationToken cancellationToken)
    {
        var metrics = await _service.GetDashboardAsync(cancellationToken);
        return Ok(metrics);
    }

    [HttpGet("stream")]
    public async Task Stream([FromServices] EventBus bus, CancellationToken cancellationToken)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";
        Response.Headers["Access-Control-Allow-Origin"] = "*";

        var ch = bus.Subscribe();
        try
        {
            // keep-alive ping every 15s
            using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
            var pingTask = Task.Run(async () =>
            {
                while (await timer.WaitForNextTickAsync(cancellationToken))
                {
                    await Response.WriteAsync(": ping\n\n", cancellationToken);
                    await Response.Body.FlushAsync(cancellationToken);
                }
            }, cancellationToken);

            await foreach (var evt in ch.Reader.ReadAllAsync(cancellationToken))
            {
                var json = JsonSerializer.Serialize(evt);
                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        catch (OperationCanceledException) { }
        finally
        {
            bus.Unsubscribe(ch);
        }
    }
}
