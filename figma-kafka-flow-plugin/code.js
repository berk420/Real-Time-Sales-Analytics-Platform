// ============================================================
//  Kafka Order Flow — Focused Architecture Diagram
//  User → .NET Producer → Kafka Broker → Java Consumer → Stock
//
//  Nasıl kullanılır:
//  1. Figma'yı aç → FigJam dosyası oluştur
//  2. Plugins > Development > Import plugin from manifest
//  3. Bu klasördeki manifest.json'u seç
//  4. Plugin'i çalıştır
// ============================================================

(async function () {

  // ──────────────────────────────────────────────────────────
  // CONSTANTS
  // ──────────────────────────────────────────────────────────

  const BOX_W  = 260;
  const BOX_H  = 110;
  const H_GAP  = 100;   // yatay boşluk kutular arası
  const V_GAP  = 120;   // dikey boşluk (Kafka satırı için)
  const PAD    = 80;

  // Renk paleti
  const C = {
    user:       hex("#1E88E5"),   // mavi       — Kullanıcı
    dotnet:     hex("#8E24AA"),   // mor        — .NET Order Service
    kafka:      hex("#FFB300"),   // turuncu    — Kafka Broker
    java:       hex("#00ACC1"),   // camgöbeği  — Java Product Service
    stock:      hex("#43A047"),   // yeşil      — InMemory Stock
    zookeeper:  hex("#FB8C00"),   // koyu turuncu — Zookeeper
    bg:         { r: 0.97, g: 0.97, b: 0.98 },
    textDark:   { r: 0.10, g: 0.10, b: 0.12 },
    textMid:    { r: 0.40, g: 0.40, b: 0.42 },
    textLight:  { r: 0.60, g: 0.60, b: 0.62 },
    white:      { r: 1,    g: 1,    b: 1    },
    arrow:      { r: 0.20, g: 0.20, b: 0.25 },
  };

  function hex(h) {
    const v = parseInt(h.replace("#", ""), 16);
    return {
      r: ((v >> 16) & 0xff) / 255,
      g: ((v >>  8) & 0xff) / 255,
      b: ((v      ) & 0xff) / 255,
    };
  }

  function solid(color, opacity = 1) {
    return [{ type: "SOLID", color, opacity }];
  }

  // ──────────────────────────────────────────────────────────
  // FONT
  // ──────────────────────────────────────────────────────────

  async function loadFonts() {
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "Inter", style: "Medium"  }),
      figma.loadFontAsync({ family: "Inter", style: "Bold"    }),
    ]);
  }

  // ──────────────────────────────────────────────────────────
  // NODE FACTORIES
  // ──────────────────────────────────────────────────────────

  function createBox(title, sub1, sub2, color, x, y, w = BOX_W, h = BOX_H) {
    const node = figma.createShapeWithText();
    node.shapeType    = "ROUNDED_RECTANGLE";
    node.x            = x;
    node.y            = y;
    node.resize(w, h);
    node.cornerRadius = 16;
    node.fills        = solid(color);

    const body     = sub2 ? `${title}\n${sub1}\n${sub2}` : `${title}\n${sub1}`;
    const t1End    = title.length;
    const t2End    = t1End + 1 + sub1.length;
    const t3End    = sub2 ? t2End + 1 + sub2.length : t2End;

    node.text.characters          = body;
    node.text.textAlignHorizontal = "CENTER";
    node.text.textAlignVertical   = "CENTER";

    node.text.setRangeFontSize(0, t3End, 12);
    node.text.setRangeFontName(0, t3End, { family: "Inter", style: "Regular" });
    node.text.setRangeFills   (0, t3End, solid(C.white, 0.88));

    // Başlık: bold + büyük
    node.text.setRangeFontName(0, t1End, { family: "Inter", style: "Bold" });
    node.text.setRangeFontSize(0, t1End, 15);
    node.text.setRangeFills   (0, t1End, solid(C.white));

    // Alt bilgi: küçük + şeffaf
    if (sub2) {
      node.text.setRangeFontSize(t2End + 1, t3End, 10);
      node.text.setRangeFills   (t2End + 1, t3End, solid(C.white, 0.65));
    }

    return node;
  }

  function createArrow(from, to, label, fromMagnet = "RIGHT", toMagnet = "LEFT") {
    const conn = figma.createConnector();
    conn.connectorStart           = { endpointNodeId: from.id, magnet: fromMagnet };
    conn.connectorEnd             = { endpointNodeId: to.id,   magnet: toMagnet   };
    conn.connectorLineType        = "ELBOWED";
    conn.connectorStartStrokeCap  = "NONE";
    conn.connectorEndStrokeCap    = "ARROW_EQUILATERAL";
    conn.strokes                  = solid(C.arrow);
    conn.strokeWeight             = 2.5;

    if (label) {
      conn.text.characters          = label;
      conn.text.fontSize            = 11;
      conn.text.fontName            = { family: "Inter", style: "Medium" };
      conn.text.fills               = solid(C.textDark);
      conn.text.textAlignHorizontal = "CENTER";
    }

    return conn;
  }

  function makeText(str, x, y, size, style = "Regular", color = C.textDark) {
    const t = figma.createText();
    t.x          = x;
    t.y          = y;
    t.characters = str;
    t.fontSize   = size;
    t.fontName   = { family: "Inter", style };
    t.fills      = solid(color);
    return t;
  }

  function makeRect(x, y, w, h, color, radius = 0, opacity = 1) {
    const r = figma.createRectangle();
    r.x            = x;
    r.y            = y;
    r.resize(w, h);
    r.fills        = solid(color, opacity);
    r.cornerRadius = radius;
    return r;
  }

  // ──────────────────────────────────────────────────────────
  // LAYOUT
  //
  //  Satır 1 (yatay, sol→sağ):
  //    [Kullanıcı] ──POST /orders──> [.NET Order Service] ──publish──> [Kafka Broker]
  //
  //  Satır 2 (Kafka'nın altında):
  //    [Kafka Broker] ──consume──> [Java Product Service] ──update──> [InMemory Stock]
  //
  //  Kafka kutusu her iki satırda da referans nokta.
  // ──────────────────────────────────────────────────────────

  async function build() {
    await loadFonts();

    // ── Konumlar ─────────────────────────────────────────────

    // Satır 1 Y
    const ROW1_Y = 160;
    // Satır 2 Y
    const ROW2_Y = ROW1_Y + BOX_H + V_GAP;

    // Satır 1: User | dotnet | Kafka  (3 kutu yatay)
    const X_USER   = PAD;
    const X_DOTNET = X_USER   + BOX_W + H_GAP;
    const X_KAFKA  = X_DOTNET + BOX_W + H_GAP;

    // Satır 2: Java | Stock  (Kafka'nın altından başlar)
    const X_JAVA  = X_KAFKA;
    const X_STOCK = X_JAVA + BOX_W + H_GAP;

    // Zookeeper (Kafka'nın sağında, ufak)
    const ZOOK_W  = 180;
    const ZOOK_H  = 70;
    const X_ZOOK  = X_KAFKA + BOX_W + H_GAP;
    const Y_ZOOK  = ROW1_Y  + (BOX_H - ZOOK_H) / 2;

    // Section boyutu
    const SEC_W = X_ZOOK + ZOOK_W + PAD;
    const SEC_H = ROW2_Y + BOX_H + 200;

    // ── Section ──────────────────────────────────────────────
    const section = figma.createSection();
    section.name  = "Kafka Order Flow — User → .NET → Kafka → Java → Stock";
    section.resizeWithoutConstraints(SEC_W, SEC_H);
    section.x = 200;
    section.y = 200;

    const bg = makeRect(0, 0, SEC_W, SEC_H, C.bg);
    section.appendChild(bg);

    // ── Başlık ───────────────────────────────────────────────
    section.appendChild(
      makeText("Kafka Order Flow", PAD, 28, 28, "Bold", C.textDark)
    );
    section.appendChild(
      makeText(
        "Kullanıcı sipariş verir  →  .NET Kafka Producer  →  Kafka Broker  →  Java Kafka Consumer  →  Stok düşer",
        PAD, 66, 13, "Regular", C.textMid
      )
    );

    // ── SATIR 1 KUTULARI ─────────────────────────────────────

    // 1. Kullanıcı
    const nUser = createBox(
      "Kullanıcı",
      "Web Browser",
      "POST /api/orders",
      C.user, X_USER, ROW1_Y
    );
    section.appendChild(nUser);

    // 2. .NET Order Service (Producer)
    const nDotnet = createBox(
      "Order Service",
      ".NET 8  ·  Kafka Producer",
      "KafkaOrderEventPublisher.cs",
      C.dotnet, X_DOTNET, ROW1_Y
    );
    section.appendChild(nDotnet);

    // 3. Kafka Broker
    const nKafka = createBox(
      "Kafka Broker",
      "Topic: order.created",
      "Port 9092  ·  confluent 7.6",
      C.kafka, X_KAFKA, ROW1_Y
    );
    section.appendChild(nKafka);

    // 3b. Zookeeper (küçük, Kafka yanında)
    const nZook = createBox(
      "Zookeeper",
      "Cluster Coord.",
      null,
      C.zookeeper, X_ZOOK, Y_ZOOK, ZOOK_W, ZOOK_H
    );
    section.appendChild(nZook);

    // ── SATIR 2 KUTULARI ─────────────────────────────────────

    // 4. Java Product Service (Consumer)
    const nJava = createBox(
      "Product Service",
      "Java 17  ·  Spring Boot  ·  Kafka Consumer",
      "OrderCreatedConsumer.java",
      C.java, X_JAVA, ROW2_Y
    );
    section.appendChild(nJava);

    // 5. InMemory Stock
    const nStock = createBox(
      "In-Memory Stock",
      "InMemoryProductRepository",
      "product.setStock(stock - qty)",
      C.stock, X_STOCK, ROW2_Y
    );
    section.appendChild(nStock);

    // ── OKLAR ────────────────────────────────────────────────

    // Kullanıcı → .NET
    section.appendChild(
      createArrow(nUser, nDotnet, "POST /api/orders\n(HTTP REST)", "RIGHT", "LEFT")
    );

    // .NET → Kafka (publish)
    section.appendChild(
      createArrow(nDotnet, nKafka, "Publish\norder.created (JSON)", "RIGHT", "LEFT")
    );

    // Kafka ↔ Zookeeper
    section.appendChild(
      createArrow(nKafka, nZook, "Koordinasyon", "RIGHT", "LEFT")
    );

    // Kafka → Java (consume) — Kafka'nın altından Java'nın üstüne
    section.appendChild(
      createArrow(nKafka, nJava, "Consume\norder.created", "BOTTOM", "TOP")
    );

    // Java → Stock
    section.appendChild(
      createArrow(nJava, nStock, "stock -= quantity", "RIGHT", "LEFT")
    );

    // ── ADIM ETİKETLERİ (numara baloncukları) ────────────────
    const steps = [
      { n: "1", x: X_USER   + BOX_W / 2 - 14, y: ROW1_Y - 44, color: C.user    },
      { n: "2", x: X_DOTNET + BOX_W / 2 - 14, y: ROW1_Y - 44, color: C.dotnet  },
      { n: "3", x: X_KAFKA  + BOX_W / 2 - 14, y: ROW1_Y - 44, color: C.kafka   },
      { n: "4", x: X_JAVA   + BOX_W / 2 - 14, y: ROW2_Y - 44, color: C.java    },
      { n: "5", x: X_STOCK  + BOX_W / 2 - 14, y: ROW2_Y - 44, color: C.stock   },
    ];

    steps.forEach(s => {
      const circle = figma.createEllipse();
      circle.x = s.x;
      circle.y = s.y;
      circle.resize(28, 28);
      circle.fills = solid(s.color);
      section.appendChild(circle);

      const lbl = makeText(s.n, s.x + 9, s.y + 5, 13, "Bold", C.white);
      section.appendChild(lbl);
    });

    // ── LEGEND ───────────────────────────────────────────────
    const LEG_Y = ROW2_Y + BOX_H + 50;
    section.appendChild(makeText("Renk Açıklaması", PAD, LEG_Y, 14, "Bold", C.textDark));

    const items = [
      { label: "Kullanıcı / Web Browser",                    color: C.user      },
      { label: "Order Service — .NET 8 (Kafka Producer)",    color: C.dotnet    },
      { label: "Kafka Broker — Topic: order.created",        color: C.kafka     },
      { label: "Zookeeper — Cluster Koordinatörü",           color: C.zookeeper },
      { label: "Product Service — Java / Spring Boot (Consumer)", color: C.java },
      { label: "In-Memory Stock — Stok güncelleme katmanı",  color: C.stock     },
    ];

    const SW = 18;
    items.forEach((item, i) => {
      const lx = PAD + (i % 3) * 320;
      const ly = LEG_Y + 26 + Math.floor(i / 3) * 32;
      section.appendChild(makeRect(lx, ly, SW, SW, item.color, 4));
      section.appendChild(makeText(item.label, lx + SW + 8, ly + 2, 11, "Regular", C.textDark));
    });

    // ── Footer ───────────────────────────────────────────────
    const footerY = LEG_Y + 26 + Math.ceil(items.length / 3) * 32 + 16;
    section.appendChild(
      makeText(
        "Figma Plugin  ·  Real-Time Sales Analytics Platform  ·  " + new Date().toLocaleDateString("tr-TR"),
        PAD, footerY, 10, "Regular", C.textLight
      )
    );

    // ── Viewport ─────────────────────────────────────────────
    figma.viewport.scrollAndZoomIntoView([section]);
    figma.currentPage.selection = [section];
    figma.notify("Kafka Order Flow diyagramı oluşturuldu!", { timeout: 4000 });
  }

  // ──────────────────────────────────────────────────────────
  // ENTRY POINT
  // ──────────────────────────────────────────────────────────
  try {
    await build();
  } catch (err) {
    console.error("[Plugin Error]", err);
    figma.notify("Hata: " + err.message, { error: true, timeout: 8000 });
  } finally {
    figma.closePlugin();
  }

})();
