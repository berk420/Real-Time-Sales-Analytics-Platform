using Elasticsearch.Net;
using System.Text.Json;

namespace AnalyticsService.Search;

public class ElasticsearchIndexer
{
    private readonly ElasticLowLevelClient _client;
    private const string IndexName = "order-events";

    public ElasticsearchIndexer(IConfiguration config)
    {
        var settings = new ConnectionConfiguration(new Uri(config["Elasticsearch:Url"] ?? "http://elasticsearch:9200"));
        _client = new ElasticLowLevelClient(settings);
    }

    public Task IndexOrderAsync(object doc)
    {
        var body = JsonSerializer.Serialize(doc);
        return _client.IndexAsync<StringResponse>(IndexName, PostData.String(body));
    }
}
