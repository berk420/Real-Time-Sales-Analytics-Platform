using AnalyticsService.Caching;
using AnalyticsService.Messaging;
using AnalyticsService.Search;
using AnalyticsService.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<RedisCacheService>();
builder.Services.AddSingleton<ElasticsearchIndexer>();
builder.Services.AddSingleton<IAnalyticsService, AnalyticsService>();
builder.Services.AddHostedService<OrderCreatedConsumer>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.Run();
