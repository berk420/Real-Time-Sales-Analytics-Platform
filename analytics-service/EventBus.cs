using System.Threading.Channels;

namespace AnalyticsService;

public record PipelineEvent(
    string Step,
    string Label,
    string Detail,
    string OrderId,
    string Level = "info"
);

public class EventBus
{
    private readonly List<Channel<PipelineEvent>> _channels = new();
    private readonly object _lock = new();

    public Channel<PipelineEvent> Subscribe()
    {
        var ch = Channel.CreateUnbounded<PipelineEvent>();
        lock (_lock) _channels.Add(ch);
        return ch;
    }

    public void Unsubscribe(Channel<PipelineEvent> ch)
    {
        lock (_lock) _channels.Remove(ch);
        ch.Writer.TryComplete();
    }

    public void Publish(PipelineEvent evt)
    {
        lock (_lock)
        {
            foreach (var ch in _channels)
                ch.Writer.TryWrite(evt);
        }
    }
}
