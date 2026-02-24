using Microsoft.AspNetCore.Mvc;
using AnalyticsService.Services;

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
}
