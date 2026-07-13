import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api/client";

/* ─── types ─────────────────────────────────────────────────────── */
interface LogEntry {
  id: number;
  time: string;
  method: string;
  path: string;
  status: number;
  latency: number;
  size: number;
  upstream: string;
  orderId?: string;
}

interface PipelineCard {
  orderId: string;
  short: string;
  productId: string;
  customerName: string;
  total: number;
  step: string;
  stepLabel: string;
  done: boolean;
  ts: number;
}

interface Metrics {
  totalSent: number;
  totalProcessed: number;
  lag: number;
  rps: number;
  kafkaMsgPerSec: number;
  avgLatency: number;
  p99Latency: number;
  kafkaOffset: number;
  errors: number;
}

interface SSEEvent {
  Step: string; Label: string; Detail: string; OrderId: string; Level: string;
}

const STEP_LABELS: Record<string, string> = {
  kafka_received:   "Kafka → Alındı",
  deserialize:      "Deserialize",
  analytics_update: "Analytics güncelleniyor",
  cache_invalidated:"Redis cache temizlendi",
  stock_update:     "Stok azaltıldı",
  completed:        "Tamamlandı",
};

/* ─── helpers ───────────────────────────────────────────────────── */
let logId = 0;
const nowStr = () => new Date().toLocaleTimeString("tr-TR", { hour12: false }) + "." +
  String(new Date().getMilliseconds()).padStart(3, "0");

const STATUS_COLOR: Record<number, string> = {
  201: "#00c9a7", 200: "#00c9a7", 400: "#f9c84e", 500: "#ff5c7a",
};

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function p99(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length * 0.99)] ?? s[s.length - 1];
}

/* ─── components ────────────────────────────────────────────────── */
function MetricBox({
  label, value, sub, color, big,
}: { label: string; value: string | number; sub?: string; color?: string; big?: boolean }) {
  return (
    <div style={{
      background: "var(--surface2)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "12px 16px", flex: 1, minWidth: 100,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: big ? 30 : 22, fontWeight: 900, color: color ?? "var(--text)", marginTop: 4, fontFamily: "monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function LagBar({ lag, max }: { lag: number; max: number }) {
  const pct = Math.min((lag / Math.max(max, 1)) * 100, 100);
  const color = lag === 0 ? "#00c9a7" : lag < 10 ? "#f9c84e" : "#ff5c7a";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: "var(--text-muted)" }}>Consumer Lag</span>
        <span style={{ fontWeight: 800, color, fontFamily: "monospace" }}>{lag} msgs</span>
      </div>
      <div style={{ height: 8, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: "width 0.3s, background 0.3s",
          boxShadow: lag > 0 ? `0 0 8px ${color}` : "none",
        }} />
      </div>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120, h = 36, pad = 2;
  const vals = data.slice(-20);
  if (vals.length < 2) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#2e3249" strokeWidth={0.5} />
    </svg>
  );
}

/* ─── main page ─────────────────────────────────────────────────── */
export default function SimulationPage() {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<"slow" | "medium" | "fast">("medium");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cards, setCards] = useState<PipelineCard[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalSent: 0, totalProcessed: 0, lag: 0,
    rps: 0, kafkaMsgPerSec: 0, avgLatency: 0, p99Latency: 0,
    kafkaOffset: 0, errors: 0,
  });
  const [rpsHistory, setRpsHistory] = useState<number[]>([]);
  const [lagHistory, setLagHistory] = useState<number[]>([]);

  const runningRef = useRef(false);
  const sentRef = useRef(0);
  const processedRef = useRef(0);
  const kafkaOffsetRef = useRef(0);
  const latenciesRef = useRef<number[]>([]);
  const recentSendTimes = useRef<number[]>([]);
  const recentKafkaTimes = useRef<number[]>([]);
  const errorsRef = useRef(0);
  const cardsRef = useRef<Map<string, PipelineCard>>(new Map());
  const logRef = useRef<HTMLDivElement>(null);

  const CONFIGS = {
    slow:   { count: 30, intervalMs: 300 },
    medium: { count: 60, intervalMs: 120 },
    fast:   { count: 120, intervalMs: 50 },
  };

  /* SSE connection - always on */
  useEffect(() => {
    const es = new EventSource("/api/analytics/stream");
    es.onmessage = (e) => {
      try {
        const evt: SSEEvent = JSON.parse(e.data);
        const { OrderId, Step } = evt;
        if (!OrderId) return;

        recentKafkaTimes.current.push(Date.now());

        // Update pipeline card
        const card = cardsRef.current.get(OrderId);
        if (card) {
          const done = Step === "completed";
          const updated: PipelineCard = {
            ...card,
            step: Step,
            stepLabel: STEP_LABELS[Step] ?? Step,
            done,
          };
          cardsRef.current.set(OrderId, updated);
          setCards([...cardsRef.current.values()].slice(-9).reverse());
        }

        if (Step === "kafka_received") {
          const offsetMatch = evt.Detail.match(/Offset:\s*(\d+)/);
          if (offsetMatch) kafkaOffsetRef.current = Number(offsetMatch[1]);
        }

        if (Step === "completed") {
          processedRef.current++;
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, []);

  /* Metrics ticker */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const recent = recentSendTimes.current.filter(t => now - t < 1000);
      recentSendTimes.current = recent;
      const kafkaRecent = recentKafkaTimes.current.filter(t => now - t < 1000);
      recentKafkaTimes.current = kafkaRecent;

      const rps = recent.length;
      const kafkaMps = kafkaRecent.length;
      const lag = Math.max(0, sentRef.current - processedRef.current);
      const lats = latenciesRef.current.slice(-200);

      setMetrics({
        totalSent: sentRef.current,
        totalProcessed: processedRef.current,
        lag,
        rps,
        kafkaMsgPerSec: kafkaMps,
        avgLatency: Math.round(avg(lats)),
        p99Latency: Math.round(p99(lats)),
        kafkaOffset: kafkaOffsetRef.current,
        errors: errorsRef.current,
      });
      setRpsHistory(h => [...h.slice(-20), rps]);
      setLagHistory(h => [...h.slice(-20), lag]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  /* Auto-scroll nginx log */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(l => [...l.slice(-200), entry]);
  }, []);

  /* Fire one order */
  const fireOrder = useCallback(async (productId: string, customerName: string, qty: number, total: number) => {
    const t0 = performance.now();
    recentSendTimes.current.push(Date.now());

    try {
      const res = await api.post("/orders", { customerName, productId, quantity: qty, totalAmount: total });
      const latency = Math.round(performance.now() - t0);
      latenciesRef.current.push(latency);
      sentRef.current++;

      const orderId: string = res.data?.id ?? "";
      const short = orderId.substring(0, 8);

      // Add pipeline card
      const card: PipelineCard = {
        orderId: short, short, productId, customerName,
        total, step: "http_sent", stepLabel: "Kafka'ya iletiliyor…",
        done: false, ts: Date.now(),
      };
      cardsRef.current.set(short, card);
      if (cardsRef.current.size > 12) {
        const oldest = [...cardsRef.current.keys()][0];
        cardsRef.current.delete(oldest);
      }

      addLog({
        id: logId++,
        time: nowStr(),
        method: "POST",
        path: "/api/orders",
        status: 201,
        latency,
        size: 284 + Math.floor(Math.random() * 40),
        upstream: "order-service:8080",
        orderId: short,
      });
    } catch {
      errorsRef.current++;
      const latency = Math.round(performance.now() - t0);
      addLog({
        id: logId++,
        time: nowStr(),
        method: "POST",
        path: "/api/orders",
        status: 500,
        latency,
        size: 0,
        upstream: "order-service:8080",
      });
    }
  }, [addLog]);

  /* Simulation runner */
  const startSim = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);

    const cfg = CONFIGS[speed];
    const products = [
      { id: "p1", price: 64999 }, { id: "p2", price: 24999 }, { id: "p3", price: 54999 },
      { id: "p4", price: 47999 }, { id: "p5", price: 12499 }, { id: "p6", price: 7999 },
      { id: "p7", price: 39999 }, { id: "p8", price: 23999 }, { id: "p9", price: 19999 },
      { id: "p10",price: 18999 }, { id: "p11",price: 34999 }, { id: "p12",price: 14999 },
      { id: "p13",price: 4999  }, { id: "p14",price: 21999 }, { id: "p15",price: 39999 },
    ];
    const names = ["Ahmet Yilmaz","Fatma Kaya","Mehmet Demir","Ayse Celik","Ali Sahin",
      "Zeynep Arslan","Hasan Kurt","Merve Dogan","Mustafa Aydin","Elif Koc",
      "Burak Ozdemir","Selin Erdogan","Emre Yildiz","Gul Cetin","Serkan Aktas"];

    for (let i = 0; i < cfg.count && runningRef.current; i++) {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      const name = names[Math.floor(Math.random() * names.length)];
      fireOrder(p.id, name, qty, p.price * qty);
      await new Promise(r => setTimeout(r, cfg.intervalMs));
    }

    runningRef.current = false;
    setRunning(false);
  }, [speed, fireOrder]);

  const stopSim = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    sentRef.current = 0;
    processedRef.current = 0;
    kafkaOffsetRef.current = 0;
    errorsRef.current = 0;
    latenciesRef.current = [];
    recentSendTimes.current = [];
    recentKafkaTimes.current = [];
    cardsRef.current.clear();
    setLogs([]);
    setCards([]);
    setMetrics({ totalSent: 0, totalProcessed: 0, lag: 0, rps: 0, kafkaMsgPerSec: 0, avgLatency: 0, p99Latency: 0, kafkaOffset: 0, errors: 0 });
    setRpsHistory([]);
    setLagHistory([]);
  }, []);

  const maxLag = Math.max(...lagHistory, 1);

  const stepColor = (step: string, done: boolean) => {
    if (done) return "#00c9a7";
    if (step === "analytics_update") return "#f9c84e";
    return "#6c63ff";
  };

  return (
    <>
      <div className="page-header">
        <h2>Yük Simülasyonu</h2>
        <p>nginx → gateway → Order Service → Kafka → Consumer pipeline'ını gerçek trafik altında izle</p>
      </div>

      {/* Control bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 16px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["slow", "medium", "fast"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              disabled={running}
              style={{
                padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)",
                background: speed === s ? "var(--accent)" : "var(--surface2)",
                color: speed === s ? "#fff" : "var(--text-muted)",
                cursor: running ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 700,
              }}
            >
              {s === "slow" ? "30 sipariş" : s === "medium" ? "60 sipariş" : "120 sipariş"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={reset}
          disabled={running}
          style={{
            padding: "7px 16px", borderRadius: 7,
            border: "1px solid var(--border)", background: "var(--surface2)",
            color: "var(--text-muted)", cursor: running ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 700,
          }}
        >
          Sıfırla
        </button>
        <button
          onClick={running ? stopSim : startSim}
          style={{
            padding: "8px 24px", borderRadius: 8,
            background: running ? "#ff5c7a" : "#00c9a7",
            color: "#000", border: "none",
            cursor: "pointer", fontSize: 13, fontWeight: 800,
            boxShadow: running ? "0 0 12px #ff5c7a66" : "0 0 12px #00c9a766",
            animation: running ? "simPulse 1s infinite" : "none",
          }}
        >
          {running ? "■ Durdur" : "▶ Simülasyonu Başlat"}
        </button>
      </div>

      {/* Metrics row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <MetricBox label="nginx RPS"       value={metrics.rps}                color="#6c63ff" sub="req/saniye" />
        <MetricBox label="Kafka msg/s"     value={metrics.kafkaMsgPerSec}     color="#f9c84e" sub="consumer throughput" />
        <MetricBox label="Consumer Lag"    value={metrics.lag}
          color={metrics.lag === 0 ? "#00c9a7" : metrics.lag < 10 ? "#f9c84e" : "#ff5c7a"}
          sub="işlenmemiş mesaj" />
        <MetricBox label="Gönderilen"      value={metrics.totalSent}          color="#e8eaf0" sub="toplam sipariş" />
        <MetricBox label="İşlenen"         value={metrics.totalProcessed}     color="#00c9a7" sub="pipeline tamamlanan" />
        <MetricBox label="Ort. Latency"    value={`${metrics.avgLatency}ms`}  color="#fd9644" sub={`p99: ${metrics.p99Latency}ms`} />
        <MetricBox label="Kafka Offset"    value={metrics.kafkaOffset}        color="#a29bfe" sub="order.created" />
        <MetricBox label="Hata"            value={metrics.errors}
          color={metrics.errors > 0 ? "#ff5c7a" : "var(--text-muted)"} sub="5xx / timeout" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

        {/* Left: nginx access log */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 16px", borderBottom: "1px solid var(--border)",
            background: "#111318",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ display: "flex", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5c7a" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f9c84e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00c9a7" }} />
            </div>
            <span style={{ fontSize: 11, color: "#8b91b0", fontFamily: "monospace" }}>
              nginx/1.25 — access.log
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
              <MiniSparkline data={rpsHistory} color="#6c63ff" />
              <span style={{ fontSize: 10, color: "#8b91b0" }}>{metrics.rps} req/s</span>
            </div>
          </div>
          <div
            ref={logRef}
            style={{
              height: 380, overflowY: "auto", padding: "8px 0",
              background: "#0a0c12", fontFamily: "monospace",
              fontSize: 11,
            }}
          >
            {logs.length === 0 && (
              <div style={{ color: "#3a3f5c", padding: "80px 16px", textAlign: "center" }}>
                Simülasyon başlatıldığında nginx logları burada görünecek…
              </div>
            )}
            {logs.map(l => (
              <div
                key={l.id}
                style={{
                  padding: "2px 14px",
                  borderLeft: `2px solid ${(STATUS_COLOR[l.status] ?? "#8b91b0")}44`,
                  lineHeight: 1.7,
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <span style={{ color: "#4a5080" }}>{l.time} </span>
                <span style={{ color: "#6c63ff" }}>"POST {l.path} HTTP/1.1" </span>
                <span style={{ color: STATUS_COLOR[l.status] ?? "#8b91b0", fontWeight: 700 }}>{l.status} </span>
                <span style={{ color: "#4a5080" }}>{l.size}B </span>
                <span style={{ color: "#fd9644" }}>{l.latency}ms </span>
                <span style={{ color: "#3a3f5c" }}>→ {l.upstream}</span>
                {l.orderId && (
                  <span style={{ color: "#6c63ff88" }}> #{l.orderId}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Kafka + pipeline cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Kafka broker panel */}
          <div style={{
            background: "var(--surface)", border: "1px solid #f9c84e44",
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#f9c84e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Kafka Broker — Cluster
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  confluentinc/cp-kafka:7.6.0 · broker-1 · topic: order.created · partition: 1
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Producer (Order Service)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#6c63ff", fontFamily: "monospace" }}>
                    {metrics.rps}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>msg/s</span>
                </div>
                <MiniSparkline data={rpsHistory} color="#6c63ff" />
              </div>
              <div style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Consumer (Analytics)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#00c9a7", fontFamily: "monospace" }}>
                    {metrics.kafkaMsgPerSec}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>msg/s</span>
                </div>
                <MiniSparkline data={lagHistory.map((_, i) => (rpsHistory[i] ?? 0))} color="#00c9a7" />
              </div>
            </div>

            <LagBar lag={metrics.lag} max={Math.max(maxLag, 5)} />

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[
                { label: "Topic",         value: "order.created",   color: "#f9c84e" },
                { label: "Partitions",    value: "1",                color: "#6c63ff" },
                { label: "Repl. Factor",  value: "1",                color: "#a29bfe" },
                { label: "Latest Offset", value: metrics.kafkaOffset,color: "#00c9a7" },
                { label: "Groups",        value: "2",                color: "#fd9644" },
              ].map(b => (
                <div key={b.label} style={{
                  flex: 1, background: "var(--surface2)", borderRadius: 6,
                  padding: "6px 8px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>{b.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: b.color, fontFamily: "monospace" }}>{b.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Concurrent pipeline cards */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid var(--border)",
              fontSize: 11, fontWeight: 800, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.06em",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span>Concurrent Pipelines</span>
              <span style={{ fontWeight: 400 }}>son {Math.min(cards.length, 9)} sipariş</span>
            </div>
            <div style={{ padding: "10px", maxHeight: 220, overflowY: "auto" }}>
              {cards.length === 0 && (
                <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "32px 0", fontSize: 12 }}>
                  Pipeline kartları burada görünecek…
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cards.map(c => (
                  <div
                    key={c.orderId}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "var(--surface2)", borderRadius: 8, padding: "7px 10px",
                      border: `1px solid ${c.done ? "#00c9a744" : "#6c63ff44"}`,
                      animation: "fadeIn 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: stepColor(c.step, c.done),
                      boxShadow: c.done ? "none" : `0 0 6px ${stepColor(c.step, c.done)}`,
                      animation: c.done ? "none" : "kpulse 1s infinite",
                    }} />
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a29bfe", flexShrink: 0 }}>
                      #{c.short}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                      {c.productId}
                    </div>
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: c.done ? "#00c9a7" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.stepLabel}
                    </div>
                    <div style={{ fontSize: 10, color: "#fd9644", fontFamily: "monospace", flexShrink: 0 }}>
                      ₺{c.total.toLocaleString("tr-TR")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        @keyframes kpulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes simPulse { 0%,100% { box-shadow: 0 0 12px #ff5c7a66; } 50% { box-shadow: 0 0 20px #ff5c7aaa; } }
      `}</style>
    </>
  );
}
