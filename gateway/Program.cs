using Yarp.ReverseProxy.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddReverseProxy()
    .LoadFromMemory(
        new[]
        {
            new RouteConfig
            {
                RouteId = "orders_route",
                ClusterId = "orders_cluster",
                Match = new RouteMatch { Path = "/api/orders/{**catch-all}" }
            },
            new RouteConfig
            {
                RouteId = "products_route",
                ClusterId = "products_cluster",
                Match = new RouteMatch { Path = "/api/products/{**catch-all}" }
            },
            new RouteConfig
            {
                RouteId = "analytics_route",
                ClusterId = "analytics_cluster",
                Match = new RouteMatch { Path = "/api/analytics/{**catch-all}" }
            }
        },
        new[]
        {
            new ClusterConfig
            {
                ClusterId = "orders_cluster",
                Destinations = new Dictionary<string, DestinationConfig>
                {
                    ["orders"] = new() { Address = builder.Configuration["Downstream:Orders"] ?? "http://order-service:8080" }
                }
            },
            new ClusterConfig
            {
                ClusterId = "products_cluster",
                Destinations = new Dictionary<string, DestinationConfig>
                {
                    ["products"] = new() { Address = builder.Configuration["Downstream:Products"] ?? "http://product-service:8080" }
                }
            },
            new ClusterConfig
            {
                ClusterId = "analytics_cluster",
                Destinations = new Dictionary<string, DestinationConfig>
                {
                    ["analytics"] = new() { Address = builder.Configuration["Downstream:Analytics"] ?? "http://analytics-service:8080" }
                }
            }
        });

var app = builder.Build();
app.MapReverseProxy();
app.Run();
