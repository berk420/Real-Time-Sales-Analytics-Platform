import { useEffect, useRef, useState } from "react";

interface PipelineEvent {
  Step: string;
  Label: string;
  Detail: string;
  OrderId: string;
  Level: string;
}

type StepStatus = "idle" | "active" | "done";

interface StepState {
  status: StepStatus;
  detail?: string;
  ts?: string;
}

interface PipelineState {
  steps: Record<string, StepState>;
  orderId: string | null;
  kafkaMeta: { partition?: number; offset?: number; topic?: string };
  orderMeta: { productId?: string; qty?: number; total?: number };
}

const EMPTY_STATE: PipelineState = {
  steps: {},
  orderId: null,
  kafkaMeta: {},
  orderMeta: {},
};

function ts() {
  return new Date().toLocaleTimeString("tr-TR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 } as any);
}

function parseKafkaMeta(detail: string) {
  const partition = detail.match(/Partition:\s*(\d+)/)?.[1];
  const offset = detail.match(/Offset:\s*(\d+)/)?.[1];
  const topic = detail.match(/Topic:\s*([\w.]+)/)?.[1];
  return {
    partition: partition != null ? Number(partition) : undefined,
    offset: offset != null ? Number(offset) : undefined,
    topic,
  };
}

function parseOrderMeta(detail: string) {
  const productId = detail.match(/ProductId:\s*(\S+)/)?.[1];
  const qty = detail.match(/Qty:\s*(\d+)/)?.[1];
  const total = detail.match(/₺([\d,]+)/)?.[1]?.replace(/,/g, "");
  return {
    productId,
    qty: qty != null ? Number(qty) : undefined,
    total: total != null ? Number(total) : undefined,
  };
}

/* ─── visual primitives ─────────────────────────────────────────── */

function StepRow({
  label, detail, status, timestamp, mono,
}: {
  label: string; detail?: string; status: StepStatus; timestamp?: string; mono?: boolean;
}) {
  const colors: Record<StepStatus, string> = {
    idle: "#3a3f5c",
    active: "#f9c84e",
    done: "#00c9a7",
  };
  const c = colors[status];

  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      opacity: status === "idle" ? 0.35 : 1,
      transition: "opacity 0.3s",
      marginBottom: 10,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${c}`,
        background: status === "done" ? `${c}22` : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11,
        boxShadow: status === "active" ? `0 0 8px ${c}` : "none",
        transition: "all 0.4s",
      }}>
        {status === "active" ? <PulseRing color={c} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: status === "idle" ? "var(--text-muted)" : "var(--text)" }}>
            {label}
          </span>
          {timestamp && (
            <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "monospace", flexShrink: 0 }}>
              {timestamp}
            </span>
          )}
        </div>
        {detail && status !== "idle" && (
          <div style={{
            fontSize: 10, color: "var(--text-muted)",
            fontFamily: mono !== false ? "monospace" : "inherit",
            background: "rgba(0,0,0,0.25)", borderRadius: 4,
            padding: "3px 6px", marginTop: 3,
            wordBreak: "break-all", lineHeight: 1.5,
          }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}

function PulseRing({ color }: { color: string }) {
  return (
    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: "kpulse 1s infinite" }} />
  );
}

function SectionCard({
  title, subtitle, accentColor, children,
}: {
  title: string; subtitle: string; accentColor: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--surface2)", borderRadius: 10,
      border: `1px solid ${accentColor}44`,
      overflow: "hidden", flex: 1, minWidth: 0,
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${accentColor}33`,
        background: `${accentColor}0d`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {title}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function Arrow({ active }: { active: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, width: 28,
    }}>
      <div style={{
        width: 24, height: 2,
        background: active ? "#6c63ff" : "#2e3249",
        position: "relative",
        transition: "background 0.5s",
        boxShadow: active ? "0 0 6px #6c63ff" : "none",
      }}>
        <div style={{
          position: "absolute", right: -5, top: -4,
          borderLeft: `8px solid ${active ? "#6c63ff" : "#2e3249"}`,
          borderTop: "5px solid transparent",
          borderBottom: "5px solid transparent",
          transition: "border-color 0.5s",
        }} />
      </div>
    </div>
  );
}

function MetaBadge({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      background: "rgba(0,0,0,0.3)", borderRadius: 6,
      padding: "4px 10px", minWidth: 60,
    }}>
      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: color ?? "var(--text)", fontFamily: "monospace", marginTop: 1 }}>
        {value}
      </span>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────── */

export default function KafkaPipelinePanel({
  currentOrderId,
}: {
  currentOrderId: string | null;
}) {
  const [state, setState] = useState<PipelineState>(EMPTY_STATE);
  const [connected, setConnected] = useState(false);
  const currentRef = useRef<string | null>(null);
  const stateRef = useRef<PipelineState>(EMPTY_STATE);

  function setStep(step: string, status: StepStatus, detail?: string) {
    setState((prev) => {
      const next = {
        ...prev,
        steps: {
          ...prev.steps,
          [step]: { status, detail, ts: status !== "idle" ? ts() : undefined },
        },
      };
      stateRef.current = next;
      return next;
    });
  }

  // When a new order is placed — simulate producer-side steps
  useEffect(() => {
    currentRef.current = currentOrderId;
    if (!currentOrderId) return;

    // Reset
    setState({ ...EMPTY_STATE, orderId: currentOrderId, steps: {}, kafkaMeta: {}, orderMeta: {} });

    const timers: ReturnType<typeof setTimeout>[] = [];
    const s = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };

    s(0,   () => setStep("http_recv",  "active", `POST /api/orders`));
    s(150, () => { setStep("http_recv", "done"); setStep("db_save", "active", "INSERT INTO Orders (Id, ProductId, Qty, Total, CreatedAt)"); });
    s(400, () => { setStep("db_save",  "done"); setStep("serialize", "active", `JSON.Serialize({ OrderId, ProductId, Quantity, TotalAmount, CreatedAt })`); });
    s(620, () => { setStep("serialize","done"); setStep("produce",   "active", `topic=order.created | key=<orderId>`); });
    s(900, () => { setStep("produce",  "done"); setStep("ack",       "active", "Broker lider partition'a yazdı → ACK"); });
    s(1100,() => { setStep("ack",      "done"); });

    return () => timers.forEach(clearTimeout);
  }, [currentOrderId]);

  // SSE connection
  useEffect(() => {
    const es = new EventSource("/api/analytics/stream");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    es.onmessage = (e) => {
      try {
        const evt: PipelineEvent = JSON.parse(e.data);
        const cur = currentRef.current;
        if (!cur || !evt.OrderId || !cur.startsWith(evt.OrderId)) return;

        if (evt.Step === "kafka_received") {
          const meta = parseKafkaMeta(evt.Detail);
          setState((p) => {
            const next = { ...p, kafkaMeta: meta, steps: { ...p.steps } };
            next.steps["broker_recv"]   = { status: "active", detail: `${meta.topic} | broker-1`, ts: ts() };
            stateRef.current = next;
            return next;
          });
          setTimeout(() => {
            setStep("broker_recv", "done");
            setStep("partition_write", "active", `Partition ${stateRef.current.kafkaMeta.partition ?? 0} → offset ${stateRef.current.kafkaMeta.offset ?? "?"}`);
          }, 250);
          setTimeout(() => {
            setStep("partition_write", "done");
            setStep("isr_sync", "active", "ISR=[broker-1] (replication-factor=1) → committed");
          }, 500);
          setTimeout(() => {
            setStep("isr_sync", "done");
            setStep("cg_poll", "active", "Consumer group analytics-service polls partition 0");
          }, 750);
        }

        if (evt.Step === "deserialize") {
          const meta = parseOrderMeta(evt.Detail);
          setState((p) => {
            const next = { ...p, orderMeta: meta };
            stateRef.current = next;
            return next;
          });
          setStep("cg_poll", "done");
          setStep("a_fetch", "active", `offset=${stateRef.current.kafkaMeta.offset ?? "?"} → deserialized`);
          setTimeout(() => {
            setStep("a_fetch", "done");
            setStep("a_parse", "active", evt.Detail);
          }, 300);
        }

        if (evt.Step === "analytics_update") {
          setStep("a_parse", "done");
          setStep("a_update", "active", evt.Detail);
        }

        if (evt.Step === "cache_invalidated") {
          setStep("a_update", "done");
          setStep("a_cache", "active", evt.Detail);
          setTimeout(() => {
            setStep("a_cache", "done");
            setStep("a_offset", "active", `offset ${(stateRef.current.kafkaMeta.offset ?? 0) + 1} commit → __consumer_offsets`);
          }, 200);
        }

        if (evt.Step === "stock_update") {
          setStep("a_offset", "done");
          setStep("cg_poll_p", "active", "Consumer group product-service polls partition 0");
          setTimeout(() => {
            setStep("cg_poll_p", "done");
            setStep("p_fetch", "active", `offset=${stateRef.current.kafkaMeta.offset ?? "?"} → fetched`);
          }, 200);
          setTimeout(() => {
            setStep("p_fetch", "done");
            setStep("p_stock", "active", evt.Detail);
          }, 450);
          setTimeout(() => {
            setStep("p_stock", "done");
            setStep("p_offset", "active", `offset ${(stateRef.current.kafkaMeta.offset ?? 0) + 1} commit → __consumer_offsets`);
          }, 700);
        }

        if (evt.Step === "completed") {
          setTimeout(() => setStep("p_offset", "done"), 300);
        }
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, []);

  const st = state.steps;
  const km = state.kafkaMeta;
  const om = state.orderMeta;

  const producerActive = ["http_recv", "db_save", "serialize", "produce", "ack"].some(
    (k) => st[k]?.status === "done"
  );
  const brokerActive = ["broker_recv", "partition_write", "isr_sync"].some(
    (k) => st[k]?.status === "done"
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, padding: "12px 16px",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Kafka Pipeline</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
            Gerçek zamanlı Producer → Broker → Consumer akışı
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {state.orderId && (
            <div style={{
              fontSize: 10, fontFamily: "monospace",
              background: "rgba(108,99,255,0.15)", color: "#6c63ff",
              borderRadius: 6, padding: "3px 8px",
            }}>
              #{state.orderId.substring(0, 8)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? "#00c9a7" : "#ff5c7a",
              animation: "kpulse 2s infinite",
            }} />
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {connected ? "SSE Live" : "Bağlanıyor"}
            </span>
          </div>
        </div>
      </div>

      {/* Kafka cluster meta bar */}
      {km.topic && (
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "10px 16px",
        }}>
          <MetaBadge label="Topic"     value={km.topic ?? "order.created"} color="#f9c84e" />
          <MetaBadge label="Partition" value={km.partition ?? 0} color="#6c63ff" />
          <MetaBadge label="Offset"    value={km.offset ?? "–"} color="#00c9a7" />
          <MetaBadge label="Broker"    value="broker-1" color="#ff9f43" />
          <MetaBadge label="Repl. Factor" value="1" color="#8b91b0" />
          {om.productId && <MetaBadge label="Product" value={om.productId} color="#e056fd" />}
          {om.qty       && <MetaBadge label="Qty"     value={om.qty} color="#fd9644" />}
        </div>
      )}

      {!state.orderId ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, color: "var(--text-muted)", textAlign: "center", gap: 12,
          padding: 24,
        }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Pipeline Bekleniyor</div>
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            Sipariş ver ve Kafka'nın<br />
            <strong>Producer → Broker → Consumer</strong><br />
            akışını canlı izle
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            {["Order Service", "Kafka Broker", "Analytics Consumer", "Product Consumer"].map((s) => (
              <span key={s} style={{
                fontSize: 10, padding: "3px 10px", borderRadius: 20,
                border: "1px solid var(--border)", color: "var(--text-muted)",
              }}>{s}</span>
            ))}
          </div>
        </div>
      ) : (
        /* Pipeline flow */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Row 1: Producer → Broker */}
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <SectionCard title="Order Service" subtitle=".NET 8 / EF Core / Kafka Producer" accentColor="#6c63ff">
              <StepRow label="HTTP POST alındı"       detail={st.http_recv?.detail}     status={st.http_recv?.status ?? "idle"}   timestamp={st.http_recv?.ts} />
              <StepRow label="PostgreSQL'e kaydedildi" detail={st.db_save?.detail}      status={st.db_save?.status ?? "idle"}     timestamp={st.db_save?.ts} />
              <StepRow label="Mesaj serialize edildi" detail={st.serialize?.detail}     status={st.serialize?.status ?? "idle"}   timestamp={st.serialize?.ts} />
              <StepRow label="Broker'a gönderildi"    detail={st.produce?.detail}       status={st.produce?.status ?? "idle"}     timestamp={st.produce?.ts} />
              <StepRow label="ACK alındı → 201"       detail={st.ack?.detail}           status={st.ack?.status ?? "idle"}         timestamp={st.ack?.ts} />
            </SectionCard>

            <Arrow active={producerActive} />

            <SectionCard title="Kafka Broker" subtitle="confluent/cp-kafka:7.6.0 · broker-1" accentColor="#f9c84e">
              <StepRow label="Broker mesajı aldı"       detail={st.broker_recv?.detail}      status={st.broker_recv?.status ?? "idle"}      timestamp={st.broker_recv?.ts} />
              <StepRow label="Partition log'una yazıldı" detail={st.partition_write?.detail}  status={st.partition_write?.status ?? "idle"}  timestamp={st.partition_write?.ts} />
              <StepRow label="ISR replikasyonu"          detail={st.isr_sync?.detail}         status={st.isr_sync?.status ?? "idle"}         timestamp={st.isr_sync?.ts} />
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8 }}>
                <StepRow label="analytics-service poll"  detail={st.cg_poll?.detail}          status={st.cg_poll?.status ?? "idle"}          timestamp={st.cg_poll?.ts} />
                <StepRow label="product-service poll"    detail={st.cg_poll_p?.detail}         status={st.cg_poll_p?.status ?? "idle"}        timestamp={st.cg_poll_p?.ts} />
              </div>
            </SectionCard>
          </div>

          {/* Row 2: Consumers */}
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <SectionCard title="Analytics Consumer" subtitle=".NET 8 · group: analytics-service" accentColor="#00c9a7">
              <StepRow label="Mesaj fetch edildi"       detail={st.a_fetch?.detail}   status={st.a_fetch?.status ?? "idle"}   timestamp={st.a_fetch?.ts} />
              <StepRow label="Payload parse edildi"     detail={st.a_parse?.detail}   status={st.a_parse?.status ?? "idle"}   timestamp={st.a_parse?.ts} />
              <StepRow label="Analytics state güncellendi" detail={st.a_update?.detail} status={st.a_update?.status ?? "idle"} timestamp={st.a_update?.ts} />
              <StepRow label="Redis cache temizlendi"   detail={st.a_cache?.detail}   status={st.a_cache?.status ?? "idle"}   timestamp={st.a_cache?.ts} />
              <StepRow label="Offset commit edildi"     detail={st.a_offset?.detail}  status={st.a_offset?.status ?? "idle"}  timestamp={st.a_offset?.ts} />
            </SectionCard>

            <Arrow active={brokerActive} />

            <SectionCard title="Product Consumer" subtitle="Spring Boot 3.3 · group: product-service" accentColor="#fd9644">
              <StepRow label="Mesaj fetch edildi"   detail={st.p_fetch?.detail}   status={st.p_fetch?.status ?? "idle"}   timestamp={st.p_fetch?.ts} />
              <StepRow label="Stok azaltıldı"      detail={st.p_stock?.detail}   status={st.p_stock?.status ?? "idle"}   timestamp={st.p_stock?.ts} />
              <StepRow label="Offset commit edildi" detail={st.p_offset?.detail}  status={st.p_offset?.status ?? "idle"}  timestamp={st.p_offset?.ts} />
            </SectionCard>
          </div>
        </div>
      )}

      <style>{`
        @keyframes kpulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
