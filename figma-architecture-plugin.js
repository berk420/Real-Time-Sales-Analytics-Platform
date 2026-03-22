// ============================================================
//  Real-Time Sales Analytics Platform — FigJam Architecture
//  Paste this into: Figma > Plugins > Development > Console
//  Works in FigJam files (requires plugin execution context)
// ============================================================

(async function () {

  // ──────────────────────────────────────────────────────────
  // SECTION 1 · DIMENSION & COLOR CONSTANTS
  // ──────────────────────────────────────────────────────────

  const BOX_W    = 280;   // component box width
  const BOX_H    = 120;   // component box height
  const H_GAP    = 60;    // horizontal gap between sibling boxes
  const V_PAD    = 80;    // top/bottom padding inside the section
  const H_PAD    = 100;   // left/right padding inside the section

  // Layer Y positions (absolute, inside the section)
  const Y_TITLE  = 30;
  const Y1       = 130;   // User / Browser
  const Y2       = 310;   // Nginx
  const Y3       = 490;   // Frontend  +  API Gateway
  const Y4       = 710;   // Order  +  Product  +  Analytics
  const Y5       = 950;   // PostgreSQL  +  InMemory  +  Redis  +  Elasticsearch
  const Y6       = 1190;  // Kafka  +  Zookeeper
  const Y_LEGEND = Y6 + BOX_H + 70;

  // Canvas working width (inside padding)
  const CANVAS_W  = 1560;
  const SECTION_W = CANVAS_W + H_PAD * 2;
  const SECTION_H = Y_LEGEND + 200;

  // Color palette (all in 0-1 float RGB)
  const C = {
    user:          hex("#1E88E5"),
    nginx:         hex("#455A64"),
    frontend:      hex("#43A047"),
    gateway:       hex("#FB8C00"),
    dotnet:        hex("#8E24AA"),
    java:          hex("#00ACC1"),
    postgres:      hex("#E53935"),
    kafka:         hex("#FFB300"),
    redis:         hex("#00BCD4"),
    elasticsearch: hex("#7CB342"),
    white:         { r: 1,    g: 1,    b: 1    },
    bg:            { r: 0.96, g: 0.96, b: 0.97 },
    textDark:      { r: 0.10, g: 0.10, b: 0.12 },
    textMid:       { r: 0.40, g: 0.40, b: 0.42 },
    textLight:     { r: 0.55, g: 0.55, b: 0.57 },
    connector:     { r: 0.25, g: 0.25, b: 0.30 },
  };

  // Convert hex string "#RRGGBB" → {r,g,b} in 0-1 range
  function hex(h) {
    const v = parseInt(h.replace("#", ""), 16);
    return {
      r: ((v >> 16) & 0xff) / 255,
      g: ((v >>  8) & 0xff) / 255,
      b: ((v      ) & 0xff) / 255,
    };
  }

  // Solid paint helper
  function solid(color, opacity = 1) {
    return [{ type: "SOLID", color, opacity }];
  }

  // ──────────────────────────────────────────────────────────
  // SECTION 2 · FONT LOADING
  // ──────────────────────────────────────────────────────────

  async function loadFonts() {
    await Promise.all([
      figma.loadFontAsync({ family: "Inter", style: "Regular" }),
      figma.loadFontAsync({ family: "Inter", style: "Medium"  }),
      figma.loadFontAsync({ family: "Inter", style: "Bold"    }),
    ]);
  }

  // ──────────────────────────────────────────────────────────
  // SECTION 3 · LAYOUT HELPERS
  // ──────────────────────────────────────────────────────────

  /**
   * Return the X coordinate that horizontally centers `n` boxes
   * (each BOX_W wide with H_GAP gaps) within CANVAS_W.
   */
  function centerX(n, boxW = BOX_W) {
    const total = n * boxW + (n - 1) * H_GAP;
    return H_PAD + (CANVAS_W - total) / 2;
  }

  // ──────────────────────────────────────────────────────────
  // SECTION 4 · NODE FACTORY FUNCTIONS
  // ──────────────────────────────────────────────────────────

  /**
   * Create a ShapeWithText (FigJam sticky-like box).
   *
   * @param {string} title    - Bold headline (line 1)
   * @param {string} tech     - Technology description (line 2)
   * @param {string} port     - Port / address info (line 3)
   * @param {object} color    - {r,g,b} fill color
   * @param {number} x
   * @param {number} y
   * @param {number} [w]
   * @param {number} [h]
   */
  function createBox(title, tech, port, color, x, y, w = BOX_W, h = BOX_H) {
    const node = figma.createShapeWithText();
    node.shapeType = "ROUNDED_RECTANGLE";
    node.x = x;
    node.y = y;
    node.resize(w, h);
    node.cornerRadius = 14;
    node.fills = solid(color);

    // Assemble text with explicit newlines
    const body     = port ? `${title}\n${tech}\n${port}` : `${title}\n${tech}`;
    const titleEnd = title.length;
    const techEnd  = titleEnd + 1 + tech.length;
    const portEnd  = port ? techEnd + 1 + port.length : techEnd;

    node.text.characters        = body;
    node.text.textAlignHorizontal = "CENTER";
    node.text.textAlignVertical   = "CENTER";

    // Base style: entire block
    node.text.setRangeFontSize (0, portEnd, 12);
    node.text.setRangeFontName (0, portEnd, { family: "Inter", style: "Regular" });
    node.text.setRangeFills    (0, portEnd, solid(C.white, 0.90));

    // Title: bold + larger
    node.text.setRangeFontName (0, titleEnd, { family: "Inter", style: "Bold" });
    node.text.setRangeFontSize (0, titleEnd, 14);
    node.text.setRangeFills    (0, titleEnd, solid(C.white));

    // Tech: medium
    node.text.setRangeFontName (titleEnd + 1, techEnd, { family: "Inter", style: "Medium" });

    // Port: smaller, slightly transparent
    if (port) {
      node.text.setRangeFontSize(techEnd + 1, portEnd, 11);
      node.text.setRangeFills   (techEnd + 1, portEnd, solid(C.white, 0.70));
    }

    return node;
  }

  /**
   * Create a connector arrow between two nodes.
   *
   * @param {SceneNode} from
   * @param {SceneNode} to
   * @param {string}    label
   * @param {string}    fromMagnet  "TOP"|"BOTTOM"|"LEFT"|"RIGHT"
   * @param {string}    toMagnet    "TOP"|"BOTTOM"|"LEFT"|"RIGHT"
   */
  function createArrow(from, to, label, fromMagnet = "BOTTOM", toMagnet = "TOP") {
    const conn = figma.createConnector();

    conn.connectorStart = { endpointNodeId: from.id, magnet: fromMagnet };
    conn.connectorEnd   = { endpointNodeId: to.id,   magnet: toMagnet   };

    conn.connectorLineType        = "ELBOWED";
    conn.connectorStartStrokeCap  = "NONE";
    conn.connectorEndStrokeCap    = "ARROW_EQUILATERAL";
    conn.strokes                  = solid(C.connector);
    conn.strokeWeight             = 2.5;
    conn.dashPattern              = [];

    if (label) {
      conn.text.characters          = label;
      conn.text.fontSize            = 11;
      conn.text.fontName            = { family: "Inter", style: "Medium" };
      conn.text.fills               = solid(C.textDark);
      conn.text.textAlignHorizontal = "CENTER";
    }

    return conn;
  }

  /**
   * Create a standalone text node.
   */
  function makeText(str, x, y, size, style = "Regular", color = C.textDark) {
    const t = figma.createText();
    t.x           = x;
    t.y           = y;
    t.characters  = str;
    t.fontSize    = size;
    t.fontName    = { family: "Inter", style };
    t.fills       = solid(color);
    return t;
  }

  /**
   * Create a solid-filled rectangle (used for legend swatches and the background).
   */
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
  // SECTION 5 · BUILD DIAGRAM
  // ──────────────────────────────────────────────────────────

  async function build() {
    await loadFonts();

    // ── Create FigJam Section ────────────────────────────────
    const section = figma.createSection();
    section.name  = "Real-Time Sales Analytics Platform Architecture";
    section.resizeWithoutConstraints(SECTION_W, SECTION_H);
    section.x = 200;
    section.y = 200;

    // Background rectangle (FigJam sections are transparent by default)
    const bg = makeRect(0, 0, SECTION_W, SECTION_H, C.bg);
    section.appendChild(bg);

    // ── Title block ──────────────────────────────────────────
    const mainTitle = makeText(
      "Real-Time Sales Analytics Platform",
      H_PAD, Y_TITLE, 32, "Bold", C.textDark
    );
    section.appendChild(mainTitle);

    const mainSub = makeText(
      "Architecture Diagram  ·  FigJam  ·  All components, data flows & technology stack",
      H_PAD, Y_TITLE + 42, 14, "Regular", C.textMid
    );
    section.appendChild(mainSub);

    // ── Helper: layer annotation on left rail ────────────────
    function addLayerLabel(yPos, line1, line2) {
      const lbl = makeText(`${line1}\n${line2}`, 8, yPos, 10, "Medium", C.textLight);
      section.appendChild(lbl);
    }

    addLayerLabel(Y1, "Layer 1", "Client");
    addLayerLabel(Y2, "Layer 2", "Entry Point");
    addLayerLabel(Y3, "Layer 3", "Presentation");
    addLayerLabel(Y4, "Layer 4", "Services");
    addLayerLabel(Y5, "Layer 5", "Data Stores");
    addLayerLabel(Y6, "Layer 6", "Messaging");

    // ═══════════════════════════════════════════════════════
    // LAYER 1 — User / Browser  (centered, 1 box)
    // ═══════════════════════════════════════════════════════
    const xUser = centerX(1);
    const nUser = createBox(
      "User / Browser",
      "Web Client (Chrome / Firefox / Safari)",
      "HTTPS :443 / HTTP :80",
      C.user, xUser, Y1
    );
    section.appendChild(nUser);

    // ═══════════════════════════════════════════════════════
    // LAYER 2 — Nginx Reverse Proxy  (centered, 1 box)
    // ═══════════════════════════════════════════════════════
    const xNginx = centerX(1);
    const nNginx = createBox(
      "Nginx Reverse Proxy",
      "Entry Point · TLS Termination · Load Balancer",
      "Port 80  (internal :80/:4173/:8080)",
      C.nginx, xNginx, Y2
    );
    section.appendChild(nNginx);

    // ═══════════════════════════════════════════════════════
    // LAYER 3 — Frontend + API Gateway  (2 boxes, centered)
    // ═══════════════════════════════════════════════════════
    const xL3 = centerX(2);
    const nFrontend = createBox(
      "Frontend",
      "React 18 · Redux · TypeScript · Vite",
      "Port 4173",
      C.frontend, xL3, Y3
    );
    section.appendChild(nFrontend);

    const nGateway = createBox(
      "API Gateway",
      "ASP.NET Core 8 · YARP Reverse Proxy",
      "Port 8080",
      C.gateway, xL3 + BOX_W + H_GAP, Y3
    );
    section.appendChild(nGateway);

    // ═══════════════════════════════════════════════════════
    // LAYER 4 — Microservices  (3 boxes, centered)
    // ═══════════════════════════════════════════════════════
    const xL4 = centerX(3);
    const nOrder = createBox(
      "Order Service",
      ".NET 8 · Clean Architecture · CQRS",
      "Port 8080",
      C.dotnet, xL4, Y4
    );
    section.appendChild(nOrder);

    const nProduct = createBox(
      "Product Service",
      "Spring Boot 3.3 · Java 17 · REST",
      "Port 8080",
      C.java, xL4 + BOX_W + H_GAP, Y4
    );
    section.appendChild(nProduct);

    const nAnalytics = createBox(
      "Analytics Service",
      ".NET 8 · Background Workers · Metrics",
      "Port 8080",
      C.dotnet, xL4 + (BOX_W + H_GAP) * 2, Y4
    );
    section.appendChild(nAnalytics);

    // ═══════════════════════════════════════════════════════
    // LAYER 5 — Data Stores  (4 boxes, centered)
    // ═══════════════════════════════════════════════════════
    const xL5 = centerX(4);
    const nPostgres = createBox(
      "PostgreSQL 16",
      "ordersdb · Relational · Persistent",
      "Port 5432",
      C.postgres, xL5, Y5
    );
    section.appendChild(nPostgres);

    const nInMemory = createBox(
      "In-Memory Storage",
      "Product Stock · JVM Heap · No persistence",
      "(internal to Product Service)",
      C.java, xL5 + BOX_W + H_GAP, Y5
    );
    section.appendChild(nInMemory);

    const nRedis = createBox(
      "Redis 7",
      "Dashboard Metrics Cache · 30s TTL",
      "Port 6379",
      C.redis, xL5 + (BOX_W + H_GAP) * 2, Y5
    );
    section.appendChild(nRedis);

    const nElastic = createBox(
      "Elasticsearch 8.14",
      "order-events index · Full-text Search",
      "Port 9200",
      C.elasticsearch, xL5 + (BOX_W + H_GAP) * 3, Y5
    );
    section.appendChild(nElastic);

    // ═══════════════════════════════════════════════════════
    // LAYER 6 — Kafka + Zookeeper  (wide Kafka + 1 Zookeeper)
    // ═══════════════════════════════════════════════════════
    // Kafka spans ~3 box widths; Zookeeper is 1 box.
    // Total: kafkaW + H_GAP + BOX_W, centered in CANVAS_W.
    const kafkaW      = BOX_W * 3 + H_GAP * 2;   // 960 px
    const zookW       = BOX_W;
    const l6Total     = kafkaW + H_GAP + zookW;   // 1300 px
    const xL6         = H_PAD + (CANVAS_W - l6Total) / 2;

    const nKafka = createBox(
      "Apache Kafka 7.6",
      "Distributed Message Broker · Topics: order.created · Partitioned",
      "Port 9092  (Broker)  ·  Zookeeper :2181",
      C.kafka, xL6, Y6, kafkaW, BOX_H
    );
    section.appendChild(nKafka);

    const nZookeeper = createBox(
      "Zookeeper",
      "Kafka Cluster Coordinator · Leader Election",
      "Port 2181",
      C.kafka, xL6 + kafkaW + H_GAP, Y6, zookW, BOX_H
    );
    section.appendChild(nZookeeper);

    // ═══════════════════════════════════════════════════════
    // CONNECTORS  (data flow arrows)
    // ═══════════════════════════════════════════════════════

    // All connectors appended to section AFTER boxes
    // so they render above the background but properly link nodes.

    // ── Tier 1→2 ────────────────────────────────────────────
    const arr_userNginx = createArrow(nUser,    nNginx,    "HTTPS",                  "BOTTOM", "TOP");
    section.appendChild(arr_userNginx);

    // ── Tier 2→3 ────────────────────────────────────────────
    const arr_nginxFE   = createArrow(nNginx,   nFrontend, "HTTP · Static Assets",   "BOTTOM", "TOP");
    section.appendChild(arr_nginxFE);

    const arr_nginxGW   = createArrow(nNginx,   nGateway,  "HTTP · Reverse Proxy",   "BOTTOM", "TOP");
    section.appendChild(arr_nginxGW);

    // ── Tier 3 internal ─────────────────────────────────────
    const arr_feGW      = createArrow(nFrontend, nGateway,  "REST API calls",         "RIGHT",  "LEFT");
    section.appendChild(arr_feGW);

    // ── Tier 3→4 ────────────────────────────────────────────
    const arr_gwOrder   = createArrow(nGateway,  nOrder,    "REST  /orders",          "BOTTOM", "TOP");
    section.appendChild(arr_gwOrder);

    const arr_gwProduct = createArrow(nGateway,  nProduct,  "REST  /products",        "BOTTOM", "TOP");
    section.appendChild(arr_gwProduct);

    const arr_gwAnalyt  = createArrow(nGateway,  nAnalytics,"REST  /analytics",       "BOTTOM", "TOP");
    section.appendChild(arr_gwAnalyt);

    // ── Tier 4→5  (service to data store) ───────────────────
    const arr_orderPG   = createArrow(nOrder,    nPostgres, "SQL / TCP",              "BOTTOM", "TOP");
    section.appendChild(arr_orderPG);

    const arr_prodMem   = createArrow(nProduct,  nInMemory, "Update Stock",           "BOTTOM", "TOP");
    section.appendChild(arr_prodMem);

    const arr_analytRed = createArrow(nAnalytics, nRedis,   "Cache Metrics (30s TTL)","BOTTOM", "TOP");
    section.appendChild(arr_analytRed);

    const arr_analytES  = createArrow(nAnalytics, nElastic, "Index Events",           "BOTTOM", "TOP");
    section.appendChild(arr_analytES);

    // ── Tier 4→6  (Order Service publishes to Kafka) ─────────
    const arr_orderKafka = createArrow(nOrder,   nKafka,    "Publish: order.created", "BOTTOM", "TOP");
    section.appendChild(arr_orderKafka);

    // ── Tier 6→4  (Services consume from Kafka) ──────────────
    const arr_kafkaProd  = createArrow(nKafka,   nProduct,  "Consume: order.created", "TOP",    "BOTTOM");
    section.appendChild(arr_kafkaProd);

    const arr_kafkaAnal  = createArrow(nKafka,   nAnalytics,"Consume: order.created", "TOP",    "BOTTOM");
    section.appendChild(arr_kafkaAnal);

    // ── Tier 6 internal  (Kafka ↔ Zookeeper) ─────────────────
    const arr_kafkaZK    = createArrow(nKafka,   nZookeeper,"Cluster Coordination",   "RIGHT",  "LEFT");
    section.appendChild(arr_kafkaZK);

    // ═══════════════════════════════════════════════════════
    // LEGEND
    // ═══════════════════════════════════════════════════════
    const SWATCH = 20;
    const S_GAP  = 10;
    const COL_W  = 340;
    const COLS   = 3;

    section.appendChild(makeText("Legend", H_PAD, Y_LEGEND, 18, "Bold", C.textDark));

    // Thin divider line
    const divider = makeRect(H_PAD, Y_LEGEND + 26, COLS * COL_W, 1, C.textLight);
    section.appendChild(divider);

    const legendItems = [
      { label: "User / Browser",                  color: C.user          },
      { label: "Nginx Reverse Proxy",              color: C.nginx         },
      { label: "Frontend — React 18 + Vite",       color: C.frontend      },
      { label: "API Gateway — YARP (ASP.NET 8)",   color: C.gateway       },
      { label: ".NET 8 Services (Order, Analytics)",color: C.dotnet       },
      { label: "Product Service — Spring Boot 3.3",color: C.java          },
      { label: "PostgreSQL 16 (ordersdb)",         color: C.postgres      },
      { label: "Apache Kafka 7.6 + Zookeeper",     color: C.kafka         },
      { label: "Redis 7 — 30s TTL cache",          color: C.redis         },
      { label: "Elasticsearch 8.14 (search index)",color: C.elasticsearch },
    ];

    legendItems.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const lx  = H_PAD + col * COL_W;
      const ly  = Y_LEGEND + 36 + row * (SWATCH + S_GAP);

      section.appendChild(makeRect(lx, ly, SWATCH, SWATCH, item.color, 4));
      section.appendChild(makeText(item.label, lx + SWATCH + 8, ly + 3, 12, "Regular", C.textDark));
    });

    // ═══════════════════════════════════════════════════════
    // FOOTER NOTE
    // ═══════════════════════════════════════════════════════
    const footerY = Y_LEGEND + 36 + Math.ceil(legendItems.length / COLS) * (SWATCH + S_GAP) + 20;
    section.appendChild(makeText(
      "Generated by FigJam Plugin  ·  Real-Time Sales Analytics Platform  ·  " + new Date().toLocaleDateString(),
      H_PAD, footerY, 11, "Regular", C.textLight
    ));

    // ── Scroll viewport to show the new section ──────────────
    figma.viewport.scrollAndZoomIntoView([section]);
    figma.currentPage.selection = [section];

    figma.notify("Architecture diagram created successfully!", { timeout: 4000 });
  }

  // ──────────────────────────────────────────────────────────
  // ENTRY POINT
  // ──────────────────────────────────────────────────────────
  try {
    await build();
  } catch (err) {
    console.error("[Plugin Error]", err);
    figma.notify("Plugin error: " + err.message, { error: true, timeout: 8000 });
  } finally {
    figma.closePlugin();
  }

})();
