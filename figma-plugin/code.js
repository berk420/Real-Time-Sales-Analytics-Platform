// ================================================================
//  Real-Time Sales Analytics Platform — Architecture Manifest
//  FigJam Plugin · Mimari Manifesto Görsel Belgesi
// ================================================================
(async function () {

  // ── Font yükleme ─────────────────────────────────────────────
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
  ]);

  // ── Renkler ──────────────────────────────────────────────────
  function hex(h) {
    const v = parseInt(h.replace("#",""), 16);
    return { r:((v>>16)&0xff)/255, g:((v>>8)&0xff)/255, b:(v&0xff)/255 };
  }
  const C = {
    bg:       hex("#F7F8FA"), pageBg:   hex("#ECEEF2"),
    white:    hex("#FFFFFF"), dark:     hex("#1A1D23"),
    mid:      hex("#5A6070"), light:    hex("#9AA0B0"),
    border:   hex("#DDE1EA"), divider:  hex("#C8CDD8"),
    // brand
    blue:     hex("#1E88E5"), blueL:    hex("#BBDEFB"),
    green:    hex("#2E7D32"), greenL:   hex("#C8E6C9"),
    orange:   hex("#E65100"), orangeL:  hex("#FFE0B2"),
    purple:   hex("#6A1B9A"), purpleL:  hex("#E1BEE7"),
    red:      hex("#C62828"), redL:     hex("#FFCDD2"),
    teal:     hex("#006064"), tealL:    hex("#B2EBF2"),
    amber:    hex("#E65100"), amberL:   hex("#FFE0B2"),
    yellow:   hex("#F57F17"), yellowL:  hex("#FFF9C4"),
    // section header backgrounds
    hBlue:    hex("#1565C0"), hGreen:   hex("#1B5E20"),
    hPurple:  hex("#4A148C"), hOrange:  hex("#BF360C"),
    hRed:     hex("#B71C1C"), hTeal:    hex("#004D40"),
    hAmber:   hex("#E65100"), hSlate:   hex("#263238"),
    // tag colors
    tagDotnet:  hex("#8E24AA"), tagJava: hex("#00897B"),
    tagInfra:   hex("#37474F"), tagFE:   hex("#2E7D32"),
  };

  const paint  = (c, o) => [{ type:"SOLID", color:c, opacity: o===undefined ? 1 : o }];
  const noPaint = () => [{ type:"SOLID", color:C.white, opacity:0 }];

  // ── Temel yardımcılar ────────────────────────────────────────
  function mkRect(parent, x, y, w, h, color, radius, opacity) {
    const r = figma.createRectangle();
    r.x=x; r.y=y; r.resize(w,h);
    r.fills = paint(color, opacity===undefined ? 1 : opacity);
    if (radius) r.cornerRadius = radius;
    parent.appendChild(r);
    return r;
  }

  function mkText(parent, str, x, y, size, style, color, w) {
    if (!str) return null;
    const t = figma.createText();
    t.x=x; t.y=y;
    if (w) { t.resize(w, 99); t.textAutoResize = "HEIGHT"; }
    t.characters = str;
    t.setRangeFontName(0, str.length, { family:"Inter", style: style||"Regular" });
    t.setRangeFontSize(0, str.length, size);
    t.setRangeFills(0, str.length, paint(color||C.dark));
    parent.appendChild(t);
    return t;
  }

  function mkBox(parent, x, y, w, h, bgColor, radius) {
    const f = figma.createFrame();
    f.x=x; f.y=y; f.resize(w,h);
    f.fills = paint(bgColor||C.white);
    f.cornerRadius = radius||12;
    f.clipsContent = true;
    parent.appendChild(f);
    return f;
  }

  function mkArrow(parent, fromNode, toNode, label, fm, tm, color, dashed) {
    const conn = figma.createConnector();
    conn.connectorStart = { endpointNodeId: fromNode.id, magnet: fm||"BOTTOM" };
    conn.connectorEnd   = { endpointNodeId: toNode.id,   magnet: tm||"TOP" };
    conn.connectorLineType     = "ELBOWED";
    conn.connectorEndStrokeCap = "ARROW_EQUILATERAL";
    conn.strokes      = paint(color||C.mid);
    conn.strokeWeight = 2;
    if (dashed) conn.dashPattern = [6,4];
    if (label) {
      conn.text.characters = label;
      conn.text.setRangeFontName(0, label.length, { family:"Inter", style:"Regular" });
      conn.text.setRangeFontSize(0, label.length, 10);
    }
    parent.appendChild(conn);
    return conn;
  }

  // Başlıklı card kutusu (iç metinleriyle birlikte)
  function card(parent, x, y, w, title, titleColor, bgColor, lines, minH) {
    const PADDING = 16;
    const titleH  = 28;
    let contentH  = PADDING;
    lines.forEach(([, size]) => { contentH += (size||12) * 1.55 + 4; });
    const h = Math.max(minH||80, titleH + contentH + PADDING);

    const f = mkBox(parent, x, y, w, h, bgColor||C.white, 10);

    // Başlık şeridi
    mkRect(f, 0, 0, w, titleH, titleColor||C.blue, 0);
    // Başlık metni
    const tTitle = figma.createText();
    tTitle.x=PADDING; tTitle.y=6;
    tTitle.resize(w-PADDING*2, titleH-4);
    tTitle.characters = title;
    tTitle.setRangeFontName(0,title.length,{family:"Inter",style:"Bold"});
    tTitle.setRangeFontSize(0,title.length,12);
    tTitle.setRangeFills(0,title.length,paint(C.white));
    f.appendChild(tTitle);

    let cy = titleH + PADDING;
    lines.forEach(([text, size, style, color, indent]) => {
      if (!text) { cy += 8; return; }
      const t = figma.createText();
      const ix = PADDING + (indent||0);
      t.x=ix; t.y=cy;
      t.resize(w-ix-PADDING, 99);
      t.textAutoResize="HEIGHT";
      t.characters=text;
      t.setRangeFontName(0,text.length,{family:"Inter",style:style||"Regular"});
      t.setRangeFontSize(0,text.length,size||11);
      t.setRangeFills(0,text.length,paint(color||C.dark));
      f.appendChild(t);
      cy += (size||12)*1.55 + 4;
    });

    f.resize(w, h);
    return f;
  }

  // Bölüm başlığı (tam genişlik şerit)
  function sectionHeader(parent, x, y, w, number, title, subtitle, bgColor) {
    const h = subtitle ? 90 : 68;
    const f = mkBox(parent, x, y, w, h, bgColor||C.hSlate, 14);
    // numara balonu
    const nb = mkBox(f, 20, 20, 34, 34, C.white, 17);
    const nTxt = figma.createText();
    nTxt.x=0; nTxt.y=8; nTxt.resize(34,20);
    nTxt.textAlignHorizontal="CENTER";
    nTxt.characters=String(number);
    nTxt.setRangeFontName(0,nTxt.characters.length,{family:"Inter",style:"Bold"});
    nTxt.setRangeFontSize(0,nTxt.characters.length,14);
    nTxt.setRangeFills(0,nTxt.characters.length,paint(bgColor||C.hSlate));
    nb.appendChild(nTxt);

    mkText(f, title, 68, 16, 22, "Bold", C.white);
    if (subtitle) mkText(f, subtitle, 68, 44, 12, "Regular", C.white, w-88);
    return { node: f, h };
  }

  // Tablo oluşturucu
  function mkTable(parent, x, y, w, headers, rows, headerBg) {
    const COL = Math.floor(w / headers.length);
    const ROW_H = 36, HEAD_H = 40;
    const totalH = HEAD_H + rows.length * ROW_H;

    const f = mkBox(parent, x, y, w, totalH, C.white, 8);
    mkRect(f, 0, 0, w, HEAD_H, headerBg||C.hSlate);

    headers.forEach((h, i) => {
      mkText(f, h, i*COL+12, 12, 11, "Bold", C.white, COL-16);
    });

    rows.forEach((row, ri) => {
      const ry = HEAD_H + ri * ROW_H;
      if (ri % 2 === 1) mkRect(f, 0, ry, w, ROW_H, C.bg);
      // dikey çizgiler
      headers.forEach((_, i) => {
        if (i>0) mkRect(f, i*COL, ry, 1, ROW_H, C.border);
        const cell = row[i]||"";
        const cellColor = cell.startsWith("✓") ? C.green
                        : cell.startsWith("✗") ? C.red
                        : cell.startsWith("◎") ? C.orange : C.dark;
        mkText(f, cell, i*COL+12, ry+10, 10, "Regular", cellColor, COL-16);
      });
      mkRect(f, 0, ry+ROW_H-1, w, 1, C.border);
    });

    return f;
  }

  // ════════════════════════════════════════════════════════════
  //  ANA CANVAS
  // ════════════════════════════════════════════════════════════
  const CW   = 2000;   // canvas genişliği
  const PAD  = 60;     // kenar boşluğu
  const GAP  = 40;     // bileşenler arası boşluk

  const canvas = figma.createSection();
  canvas.name  = "Architecture Manifest — Real-Time Sales Analytics Platform";
  canvas.x = 100; canvas.y = 100;
  canvas.resizeWithoutConstraints(CW + PAD*2, 8000); // başta büyük, sonra trim

  mkRect(canvas, 0, 0, CW+PAD*2, 8000, C.pageBg);

  let Y = 40; // mevcut Y imleci

  // ════════════════════════════════════════════════════════════
  //  KAPAK
  // ════════════════════════════════════════════════════════════
  const cover = mkBox(canvas, PAD, Y, CW, 180, C.hSlate, 16);
  mkRect(cover, 0, 0, 8, 180, C.blue);  // sol renkli şerit
  mkText(cover, "Mimari Manifesto", 32, 28, 32, "Bold", C.white);
  mkText(cover, "Real-Time Sales Analytics Platform", 32, 68, 18, "Regular", C.white);
  mkText(cover, "Polyglot Microservices · Event-Driven · Clean Architecture · Docker Compose", 32, 98, 12, "Regular", C.light, CW-60);
  mkText(cover, new Date().toLocaleDateString("tr-TR"), 32, 148, 11, "Regular", C.light);

  // Teknoloji etiketleri
  const tags = [
    [".NET 8",C.tagDotnet],[" Java 17 ",C.tagJava],["React 18",C.tagFE],
    ["Kafka",C.yellow],["PostgreSQL",C.red],["Redis",C.teal],
    ["Elasticsearch",C.green],["Docker",C.blue],["YARP",C.orange],
  ];
  let tx = CW - 780;
  tags.forEach(([label, color]) => {
    const tw = label.length * 7 + 20;
    const tb = mkBox(cover, tx, 130, tw, 26, color, 13);
    mkText(tb, label, 10, 6, 10, "Bold", C.white);
    tx += tw + 8;
  });
  Y += 180 + GAP;

  // ════════════════════════════════════════════════════════════
  //  BÖLÜM 1 — Genel Bakış & Mimari Felsefesi
  // ════════════════════════════════════════════════════════════
  const s1 = sectionHeader(canvas, PAD, Y, CW, 1, "Genel Bakış & Mimari Felsefesi",
    "Neden mikroservis? Neden event-driven? Temel mimari hedefler.", C.hBlue);
  Y += s1.h + GAP;

  // ─ 1a: Hedefler kartı
  card(canvas, PAD, Y, 460, "Mimari Hedefler", C.hBlue, C.blueL, [
    ["✓  Servisler birbirinden bağımsız deploy edilebilmeli", 11,"Medium",C.dark],
    ["✓  Sipariş yazma, analitik okuma birbirini bloke etmemeli", 11,"Medium",C.dark],
    ["✓  Farklı dil / framework kullanılabilmeli (polyglot)", 11,"Medium",C.dark],
    ["✓  Tüm sistem tek komutla başlamalı: docker compose up", 11,"Medium",C.dark],
    ["✓  Her servis tek sorumluluğa sahip (SRP)", 11,"Medium",C.dark],
  ], 160);

  // ─ 1b: Monolit vs Mikroservis
  const mvs = mkBox(canvas, PAD+480, Y, 720, 160, C.white, 10);
  mkRect(mvs, 0, 0, 720, 32, C.hSlate);
  mkText(mvs, "Monolit  vs  Mikroservis", 16, 9, 12, "Bold", C.white);

  const mono = mkBox(mvs, 16, 44, 320, 104, C.redL, 8);
  mkText(mono, "Monolitik Yaklaşım", 12, 10, 11, "Bold", C.red);
  mkText(mono, "• Bir değişiklik tümünü deploy eder\n• Analytics yükü sipariş yazımını etkiler\n• Tek dil/framework zorunlu\n• Scale sadece bütünü scale eder", 12, 30, 10, "Regular", C.dark, 296);

  const micro = mkBox(mvs, 360, 44, 340, 104, C.greenL, 8);
  mkText(micro, "Mikroservis Yaklaşım", 12, 10, 11, "Bold", C.green);
  mkText(micro, "• Her servis bağımsız deploy/scale\n• Analytics çökmesi siparişi etkilemez\n• Farklı dil serbestliği (polyglot)\n• Yeni servis mevcut kodu bozmaz", 12, 30, 10, "Regular", C.dark, 316);

  // ─ 1c: Senkron vs Asenkron
  const svsa = mkBox(canvas, PAD+1220, Y, 720, 160, C.white, 10);
  mkRect(svsa, 0, 0, 720, 32, C.hSlate);
  mkText(svsa, "Senkron HTTP  vs  Asenkron Kafka Event", 16, 9, 12, "Bold", C.white);

  const sync = mkBox(svsa, 16, 44, 320, 104, C.redL, 8);
  mkText(sync, "Senkron HTTP Zinciri", 12, 10, 11, "Bold", C.red);
  mkText(sync, "• Product çökerse sipariş başarısız olur\n• Analytics gecikmesi latency'ye eklenir\n• Servisler sıkı bağlı (tight coupling)\n• Her yeni servis çağrı eklemeyi gerektirir", 12, 30, 10, "Regular", C.dark, 296);

  const async_ = mkBox(svsa, 360, 44, 340, 104, C.greenL, 8);
  mkText(async_, "Kafka Event (Asenkron)", 12, 10, 11, "Bold", C.green);
  mkText(async_, "• Order Service kimsenin dinleyip\n  dinlemediğini bilmez\n• Consumer çökmesi producer'ı etkilemez\n• Yeni consumer = sıfır mevcut kod değişikliği", 12, 30, 10, "Regular", C.dark, 316);

  Y += 180 + GAP;

  // ════════════════════════════════════════════════════════════
  //  BÖLÜM 2 — Sistem Mimarisi
  // ════════════════════════════════════════════════════════════
  const s2 = sectionHeader(canvas, PAD, Y, CW, 2, "Sistem Mimarisi",
    "Tüm bileşenler, katmanlar ve bağlantılar.", C.hGreen);
  Y += s2.h + GAP;

  // Katman etiketleri (sol ray)
  const layerLabels = [
    [Y+20,  "Giriş",         C.hSlate],
    [Y+150, "Sunum",         C.hGreen],
    [Y+310, "Servisler",     C.hPurple],
    [Y+470, "Veri",          C.hRed],
    [Y+630, "Mesajlaşma",    C.hAmber],
  ];
  layerLabels.forEach(([ly, label, color]) => {
    const lf = mkBox(canvas, PAD, ly, 80, 100, color, 8);
    mkText(lf, label, 8, 36, 10, "Bold", C.white, 64);
  });

  // ─ Katman 1: Nginx
  const nNginx = card(canvas, PAD+100, Y, 340, "Nginx 1.25  —  Giriş Noktası", C.hSlate, C.white, [
    ["Port :80  ·  Reverse Proxy  ·  SPA Routing", 10, "Medium", C.mid],
    ["/* → Frontend :4173", 10, "Regular", C.dark, 8],
    ["/api/* → API Gateway :8080", 10, "Regular", C.dark, 8],
  ], 100);

  // Katman 2: Frontend + Gateway
  const nFE = card(canvas, PAD+100, Y+150, 460, "Frontend", C.hGreen, C.white, [
    ["React 18  ·  Redux Toolkit  ·  TypeScript  ·  Vite", 10,"Medium",C.mid],
    ["Recharts  ·  React Router  ·  Axios", 10,"Regular",C.dark],
    ["Port :4173", 10,"Regular",C.light],
  ], 110);

  const nGW = card(canvas, PAD+580, Y+150, 460, "API Gateway", C.hOrange, C.white, [
    ["ASP.NET Core 8  ·  YARP Reverse Proxy", 10,"Medium",C.mid],
    ["/api/orders → Order Service :8080", 10,"Regular",C.dark],
    ["/api/products → Product Service :8080", 10,"Regular",C.dark],
    ["/api/analytics → Analytics Service :8080", 10,"Regular",C.dark],
  ], 110);

  // Katman 3: Servisler
  const nOrder = card(canvas, PAD+100, Y+310, 420, "Order Service", C.tagDotnet, C.white, [
    [".NET 8  ·  Clean Architecture  ·  EF Core  ·  Confluent.Kafka", 10,"Medium",C.mid],
    ["GET /api/orders  ·  POST /api/orders", 10,"Regular",C.dark],
    ["→ PostgreSQL'e yazar  →  Kafka'ya publish eder", 10,"Regular",C.dark],
  ], 110);

  const nProduct = card(canvas, PAD+540, Y+310, 420, "Product Service", C.tagJava, C.white, [
    ["Spring Boot 3.3  ·  Java 17  ·  spring-kafka", 10,"Medium",C.mid],
    ["GET /api/products", 10,"Regular",C.dark],
    ["Kafka tüketir → stoku in-memory günceller", 10,"Regular",C.dark],
  ], 110);

  const nAnalytic = card(canvas, PAD+980, Y+310, 420, "Analytics Service", C.tagDotnet, C.white, [
    [".NET 8  ·  Background Workers  ·  Confluent.Kafka", 10,"Medium",C.mid],
    ["GET /api/analytics/dashboard", 10,"Regular",C.dark],
    ["Kafka tüketir → Redis cache → ES index", 10,"Regular",C.dark],
  ], 110);

  // Katman 4: Veri
  const nPG = card(canvas, PAD+100, Y+470, 280, "PostgreSQL 16", C.hRed, C.white, [
    ["ordersdb  ·  Kalıcı", 10,"Medium",C.mid],
    ["Port :5432", 10,"Regular",C.light],
    ["ACID garantisi", 10,"Regular",C.dark],
  ], 110);

  const nMem = card(canvas, PAD+400, Y+470, 250, "In-Memory", C.tagJava, C.white, [
    ["Product Stock", 10,"Medium",C.mid],
    ["JVM Heap", 10,"Regular",C.light],
    ["Volatile (restart'ta sıfır)", 10,"Regular",C.dark],
  ], 110);

  const nRedis = card(canvas, PAD+670, Y+470, 260, "Redis 7", C.hTeal, C.white, [
    ["Dashboard Cache", 10,"Medium",C.mid],
    ["TTL: 30 saniye", 10,"Regular",C.light],
    ["Port :6379", 10,"Regular",C.dark],
  ], 110);

  const nES = card(canvas, PAD+950, Y+470, 280, "Elasticsearch 8.14", C.hGreen, C.white, [
    ["order-events index", 10,"Medium",C.mid],
    ["Full-text Search", 10,"Regular",C.light],
    ["Port :9200", 10,"Regular",C.dark],
  ], 110);

  // Katman 5: Kafka + ZK
  const nKafka = card(canvas, PAD+100, Y+630, 820, "Apache Kafka 7.6  —  Dağıtık Message Broker", C.hAmber, C.white, [
    ["Topic: order.created  ·  Producer: Order Service  ·  Consumer: Product Service, Analytics Service", 10,"Medium",C.mid],
    ["Port :9092  ·  cp-kafka 7.6.0", 10,"Regular",C.light],
  ], 90);

  const nZK = card(canvas, PAD+940, Y+630, 280, "Zookeeper 7.6", C.hAmber, C.white, [
    ["Kafka Koordinatörü", 10,"Medium",C.mid],
    ["Port :2181", 10,"Regular",C.light],
  ], 90);

  // Oklar
  const arrowDefs = [
    [nNginx, nFE,       "/* statik",          "BOTTOM","TOP",   C.hGreen,  false],
    [nNginx, nGW,       "/api/* proxy",        "BOTTOM","TOP",   C.hOrange, false],
    [nFE,    nGW,       "REST API",            "RIGHT", "LEFT",  C.blue,    false],
    [nGW,    nOrder,    "REST /orders",        "BOTTOM","TOP",   C.tagDotnet,false],
    [nGW,    nProduct,  "REST /products",      "BOTTOM","TOP",   C.tagJava, false],
    [nGW,    nAnalytic, "REST /analytics",     "BOTTOM","TOP",   C.tagDotnet,false],
    [nOrder, nPG,       "SQL/TCP",             "BOTTOM","TOP",   C.hRed,    false],
    [nOrder, nKafka,    "Publish",             "BOTTOM","TOP",   C.hAmber,  false],
    [nProduct,nMem,     "Stok güncelle",       "BOTTOM","TOP",   C.tagJava, false],
    [nAnalytic,nRedis,  "Cache yaz (30s)",     "BOTTOM","TOP",   C.hTeal,   false],
    [nAnalytic,nES,     "Index event",         "BOTTOM","TOP",   C.hGreen,  false],
    [nKafka, nProduct,  "Consume",             "TOP",   "BOTTOM",C.tagJava, true],
    [nKafka, nAnalytic, "Consume",             "TOP",   "BOTTOM",C.tagDotnet,true],
    [nKafka, nZK,       "Koordinasyon",        "RIGHT", "LEFT",  C.hAmber,  false],
  ];
  arrowDefs.forEach(([from,to,label,fm,tm,color,dashed]) => {
    mkArrow(canvas, from, to, label, fm, tm, color, dashed);
  });

  Y += 790 + GAP;

  // ════════════════════════════════════════════════════════════
  //  BÖLÜM 3 — Sipariş Akış Şeması (Sequence)
  // ════════════════════════════════════════════════════════════
  const s3 = sectionHeader(canvas, PAD, Y, CW, 3,
    "Sipariş Oluşturma — Event Akış Şeması",
    "POST /api/orders isteğinden dashboard güncellemesine kadar tam lifecycle.", C.hPurple);
  Y += s3.h + GAP;

  // Actors (üst bar)
  const actors = [
    ["Kullanıcı",        C.blue,     PAD+40],
    ["Frontend",         C.hGreen,   PAD+260],
    ["API Gateway",      C.hOrange,  PAD+490],
    ["Order Service",    C.tagDotnet,PAD+720],
    ["PostgreSQL",       C.hRed,     PAD+950],
    ["Kafka",            C.hAmber,   PAD+1160],
    ["Product Service",  C.tagJava,  PAD+1370],
    ["Analytics Svc",    C.tagDotnet,PAD+1580],
    ["Redis",            C.hTeal,    PAD+1770],
  ];
  const ACT_W = 160, ACT_H = 44;

  const actorNodes = actors.map(([label, color, ax]) => {
    const af = mkBox(canvas, ax, Y, ACT_W, ACT_H, color, 8);
    mkText(af, label, 8, 13, 10, "Bold", C.white, ACT_W-16);
    return af;
  });

  // Hayat çizgileri (dashed dikey)
  const seqSteps = [
    // [fromActorIdx, toActorIdx, label, yOffset, isReturn]
    [0, 1, "Sipariş formu gönder", 60, false],
    [1, 2, "POST /api/orders", 110, false],
    [2, 3, "POST /api/orders (proxy)", 160, false],
    [3, 4, "INSERT INTO Orders", 210, false],
    [4, 3, "✓ OK", 260, true],
    [3, 5, "Publish: order.created", 310, false],
    [5, 3, "✓ Ack", 360, true],
    [3, 2, "201 Created", 410, true],
    [2, 1, "201 Created", 460, true],
    [1, 0, "\"Sipariş oluşturuldu\"", 510, true],
    [5, 6, "Consume (async)", 580, false],
    [6, 6, "stock[id] -= qty", 620, false],
    [5, 7, "Consume (async)", 660, false],
    [7, 7, "totalSales += amount", 700, false],
    [7, 8, "Cache yaz (30s TTL)", 740, false],
  ];

  const centerOf = (idx) => {
    const [,, ax] = actors[idx];
    return ax + ACT_W/2;
  };

  seqSteps.forEach(([fi, ti, label, yOff]) => {
    const fy = Y + ACT_H + yOff;
    const fx = centerOf(fi), tx = centerOf(ti);
    const isSelf = fi === ti;

    if (!isSelf) {
      // Yatay ok çizgisi (dikdörtgen)
      const lineX = Math.min(fx, tx);
      const lineW = Math.abs(tx - fx);
      mkRect(canvas, lineX, fy, lineW, 1.5, C.mid);
      // Ok başı
      mkRect(canvas, tx > fx ? tx-8 : tx, fy-4, 8, 9, C.mid, 1);
      // Etiket
      if (label) {
        mkText(canvas, label, lineX + 8, fy - 14, 9, "Regular", C.dark);
      }
    } else {
      // Self-referans: küçük döngü
      const lf = mkBox(canvas, fx+2, fy-2, 80, 22, C.yellowL, 4);
      mkText(lf, label, 4, 5, 8, "Regular", C.dark, 72);
    }
  });

  // Hayat çizgileri çiz
  const seqH = 800;
  actors.forEach((_, idx) => {
    const cx = centerOf(idx);
    mkRect(canvas, cx, Y+ACT_H, 1.5, seqH, C.border);
  });

  // "Asenkron sınır" notu
  const asyncNote = mkBox(canvas, PAD+1140, Y+ACT_H+555, 680, 26, C.yellowL, 6);
  mkRect(asyncNote, 0, 0, 680, 26, C.yellow, 0, 0.15);
  mkText(asyncNote, "↓  Asenkron — kullanıcı cevabı almış olabilir", 12, 7, 9, "Medium", C.orange);

  Y += ACT_H + seqH + GAP + 20;

  // ════════════════════════════════════════════════════════════
  //  BÖLÜM 4 — Servis Detayları
  // ════════════════════════════════════════════════════════════
  const s4 = sectionHeader(canvas, PAD, Y, CW, 4, "Servis Detayları",
    "Her servisin sorumlulukları, mimari kararları ve neden bu teknoloji seçildi.", C.hOrange);
  Y += s4.h + GAP;

  const svcW = (CW - GAP*3) / 4;

  // Order Service detay
  card(canvas, PAD, Y, svcW, "Order Service", C.tagDotnet, C.purpleL, [
    ["Teknoloji", 11,"Bold",C.purple],
    [".NET 8 · ASP.NET Core · EF Core 8\nConfluent.Kafka 2.4.0 · Npgsql", 10,"Regular",C.dark],
    ["", 0],
    ["Clean Architecture Katmanları", 11,"Bold",C.purple],
    ["Api       → Controller / DTO", 10,"Regular",C.dark, 8],
    ["Application → Command / Interface", 10,"Regular",C.dark, 8],
    ["Domain    → Order Entity", 10,"Regular",C.dark, 8],
    ["Infrastructure → EF Core + Kafka", 10,"Regular",C.dark, 8],
    ["", 0],
    ["Neden PostgreSQL?", 11,"Bold",C.purple],
    ["Sipariş verisi ilişkisel yapıya uygun.\nACID garantisi kritik: ya tamamen\nyazılır ya hiç.", 10,"Regular",C.dark],
    ["", 0],
    ["Endpoints", 11,"Bold",C.purple],
    ["GET  /api/orders", 10,"Regular",C.dark, 8],
    ["POST /api/orders", 10,"Regular",C.dark, 8],
  ], 400);

  // Product Service detay
  card(canvas, PAD+svcW+GAP, Y, svcW, "Product Service", C.tagJava, C.tealL, [
    ["Teknoloji", 11,"Bold",C.teal],
    ["Spring Boot 3.3 · Java 17\nspring-kafka · jackson-databind", 10,"Regular",C.dark],
    ["", 0],
    ["Neden Java (Spring Boot)?", 11,"Bold",C.teal],
    ["Kasıtlı polyglot seçim:\n• Farklı teknoloji yığınları birlikte\n  çalışabilir\n• spring-kafka olgun ve iyi belgelenmiş\n• Ekip yetkinlik gösterimi", 10,"Regular",C.dark],
    ["", 0],
    ["Neden In-Memory?", 11,"Bold",C.teal],
    ["• Stok = türetilmiş veri (event'ten)\n• Sıfır DB latency\n• Restart'ta Kafka replay mümkün", 10,"Regular",C.dark],
    ["", 0],
    ["Kısıt", 11,"Bold",C.orange],
    ["Restart'ta stok sıfırlanır.\nProduction'da event store\nveya Kafka replay gerekir.", 10,"Regular",C.dark],
  ], 400);

  // Analytics Service detay
  card(canvas, PAD+(svcW+GAP)*2, Y, svcW, "Analytics Service", C.tagDotnet, C.purpleL, [
    ["Teknoloji", 11,"Bold",C.purple],
    [".NET 8 · Confluent.Kafka 2.4.0\nStackExchange.Redis · Elasticsearch.Net", 10,"Regular",C.dark],
    ["", 0],
    ["Neden Redis?", 11,"Bold",C.purple],
    ["Dashboard sık okunur (saniyede\nonlarca istek). 30s TTL ile\nreal-time'a yakın, yük düşük.", 10,"Regular",C.dark],
    ["", 0],
    ["Neden Elasticsearch?", 11,"Bold",C.purple],
    ["Sipariş geçmişinde full-text arama.\nPostgreSQL LIKE büyük tabloda\nyavaş → ES full-text index hızlı.", 10,"Regular",C.dark],
    ["", 0],
    ["Cache-Aside Pattern", 11,"Bold",C.purple],
    ["GET → Redis HIT → cevap ver\nGET → Redis MISS → hesapla\n                → Redis'e yaz (30s)", 10,"Regular",C.dark],
  ], 400);

  // Frontend detay
  card(canvas, PAD+(svcW+GAP)*3, Y, svcW, "Frontend", C.hGreen, C.greenL, [
    ["Teknoloji", 11,"Bold",C.green],
    ["React 18.3 · Redux Toolkit 2.2\nTypeScript 5.4 · Vite 5.1\nAxios · React Router · Recharts", 10,"Regular",C.dark],
    ["", 0],
    ["Neden Redux Toolkit?", 11,"Bold",C.green],
    ["Birden fazla sayfa aynı veriyi\nkullanır. API durumu (loading/\nerror) her component'te tekrar\nyazılmaz. RTK boilerplate'i azaltır.", 10,"Regular",C.dark],
    ["", 0],
    ["Neden Vite?", 11,"Bold",C.green],
    ["Webpack: cold start ~10s\nVite: cold start <1s\nHMR: <100ms", 10,"Regular",C.dark],
    ["", 0],
    ["Sayfalar", 11,"Bold",C.green],
    ["/ → Dashboard (metrikler + grafik)", 10,"Regular",C.dark, 8],
    ["/orders → Sipariş listesi", 10,"Regular",C.dark, 8],
    ["/products → Ürün stok görünümü", 10,"Regular",C.dark, 8],
    ["/search → Elasticsearch arama", 10,"Regular",C.dark, 8],
  ], 400);

  Y += 420 + GAP;

  // ════════════════════════════════════════════════════════════
  //  BÖLÜM 5 — Altyapı Kararları
  // ════════════════════════════════════════════════════════════
  const s5 = sectionHeader(canvas, PAD, Y, CW, 5, "Altyapı Kararları",
    "Kafka, Redis, Elasticsearch, Nginx seçimlerinin gerekçeleri ve alternatiflerin karşılaştırması.", C.hRed);
  Y += s5.h + GAP;

  // Kafka karşılaştırma tablosu
  mkText(canvas, "Neden Kafka? — Alternatiflerle Karşılaştırma", PAD, Y, 14, "Bold", C.dark);
  Y += 28;
  mkTable(canvas, PAD, Y, 960,
    ["Özellik","RabbitMQ","Redis Pub/Sub","✓ Apache Kafka"],
    [
      ["Mesaj kalıcılığı", "✓ Var", "✗ Yok", "✓ Disk'e yazılır"],
      ["Replay (geçmiş okuma)", "✗ Yok", "✗ Yok", "✓ Offset bazlı"],
      ["Throughput", "Orta", "Yüksek", "✓ Çok yüksek"],
      ["Consumer group", "✓ Var", "✗ Yok", "✓ Var"],
      ["Analitik uygunluk", "Düşük", "Düşük", "✓ Yüksek"],
      ["Event sourcing", "✗ Zor", "✗ Zor", "✓ Native"],
    ],
    C.hAmber
  );

  // Redis cache şeması
  const cacheBox = mkBox(canvas, PAD+1000, Y, 960, 220, C.white, 10);
  mkRect(cacheBox, 0, 0, 960, 32, C.hTeal);
  mkText(cacheBox, "Redis Cache — Cache-Aside Pattern", 16, 9, 12, "Bold", C.white);

  // Cache diagram blokları
  const getReq  = mkBox(cacheBox, 20, 52, 140, 40, C.blueL, 8);
  mkText(getReq, "GET /analytics/dashboard", 8, 12, 9, "Regular", C.dark, 124);

  const redis = mkBox(cacheBox, 200, 52, 140, 40, C.tealL, 8);
  mkText(redis, "Redis\nanalytics:dashboard", 8, 6, 9, "Regular", C.dark, 124);

  const hit = mkBox(cacheBox, 380, 52, 140, 40, C.greenL, 8);
  mkText(hit, "✓ Cache HIT\n→ Cevap ver", 8, 6, 9, "Regular", C.green, 124);

  const miss = mkBox(cacheBox, 380, 110, 140, 40, C.redL, 8);
  mkText(miss, "✗ Cache MISS\n→ Hesapla", 8, 6, 9, "Regular", C.red, 124);

  const calc = mkBox(cacheBox, 560, 110, 160, 40, C.purpleL, 8);
  mkText(calc, "In-Memory Metrics\nHesapla", 8, 6, 9, "Regular", C.dark, 144);

  const setCache = mkBox(cacheBox, 760, 110, 160, 40, C.tealL, 8);
  mkText(setCache, "Redis'e yaz\nTTL: 30 saniye", 8, 6, 9, "Regular", C.dark, 144);

  const invalidate = mkBox(cacheBox, 560, 52, 360, 40, C.amberL, 8);
  mkText(invalidate, "order.created event geldiğinde → Cache invalidate edilir", 8, 13, 9, "Regular", C.dark, 344);

  mkText(cacheBox, "→", 164, 64, 14, "Bold", C.mid);
  mkText(cacheBox, "HIT →", 344, 64, 10, "Regular", C.green);
  mkText(cacheBox, "MISS →", 344, 122, 10, "Regular", C.red);
  mkText(cacheBox, "→", 524, 122, 14, "Bold", C.mid);
  mkText(cacheBox, "→", 724, 122, 14, "Bold", C.mid);

  Y += 230 + GAP;

  // ════════════════════════════════════════════════════════════
  //  BÖLÜM 6 — Tasarım Desenleri & Trade-off'lar
  // ════════════════════════════════════════════════════════════
  const s6 = sectionHeader(canvas, PAD, Y, CW, 6, "Tasarım Desenleri & Trade-off'lar",
    "Kullanılan pattern'lar ve bilinçli olarak kabul edilen kısıtlar.", C.hSlate);
  Y += s6.h + GAP;

  // Tasarım desenleri kartları
  const patterns = [
    ["Event-Driven Architecture",  C.hAmber,  C.yellowL,
      "Order Service event yayınlar,\nProduct & Analytics bağımsız tüketir.\nKimse kimden haberdar değil."],
    ["Clean Architecture",         C.tagDotnet, C.purpleL,
      "Order Service'de 4 katman:\nDomain → Application → Infrastructure → API\nTest edilebilirlik ve izolasyon."],
    ["Repository Pattern",         C.hRed,    C.redL,
      "IOrderRepository interface'i\naltyapıyı soyutlar. EF Core'u\nmock'lamak mümkün."],
    ["Cache-Aside",                C.hTeal,   C.tealL,
      "Redis cache'i uygulama yönetir.\nMISS → hesapla → yaz.\nEvent gelince → invalidate."],
    ["Reverse Proxy (2 katman)",   C.hSlate,  C.bg,
      "Nginx: edge (port 80, SPA routing)\nYARP: internal (servis routing)\nİki ayrı sorumluluk."],
    ["Producer-Consumer",          C.hAmber,  C.yellowL,
      "Kafka topic üzerinden.\nOrder: producer\nProduct & Analytics: consumer"],
  ];

  const patW = (CW - GAP*5) / 6;
  patterns.forEach(([title, color, bgColor, desc], i) => {
    const px = PAD + i * (patW + GAP);
    card(canvas, px, Y, patW, title, color, bgColor, [
      [desc, 10, "Regular", C.dark],
    ], 140);
  });

  Y += 180 + GAP;

  // Trade-off tablosu
  mkText(canvas, "Bilinçli Trade-off'lar", PAD, Y, 14, "Bold", C.dark);
  Y += 28;

  mkTable(canvas, PAD, Y, CW,
    ["Karar","✓ Avantaj","Kabul Edilen Kısıt","Production Çözümü"],
    [
      ["Product Service in-memory stok","Sıfır DB latency · Sade kod","Restart'ta stok sıfırlanır","Kafka replay veya Event Store"],
      ["Analytics in-memory metrics","Hızlı hesaplama · Basit kod","Restart'ta metric kaybı","Kafka replay (offset 0'dan)"],
      ["Redis TTL = 30 saniye","Cache baskısını düşürür","Max 30s gecikmiş dashboard","TTL'yi iş ihtiyacına göre ayarla"],
      ["Tek Kafka broker","Kurulum basit · Geliştirme kolaylığı","HA yok · SPOF riski","Kafka cluster (3+ broker)"],
      ["Elasticsearch security=false","Geliştirme kolaylığı","Production'da güvenlik açığı","TLS + X-Pack authentication"],
      ["Zookeeper tabanlı Kafka","Sağlam · İyi belgelenmiş","Ek servis · KRaft'tan ağır","KRaft moduna geçiş (Kafka 3.x+)"],
    ],
    C.hSlate
  );

  Y += 250 + GAP;

  // ── Footer ─────────────────────────────────────────────────
  const footer = mkBox(canvas, PAD, Y, CW, 48, C.hSlate, 10);
  mkText(footer, "Real-Time Sales Analytics Platform  ·  Mimari Manifesto  ·  " + new Date().toLocaleDateString("tr-TR"), 24, 16, 11, "Regular", C.light, CW-48);
  Y += 48 + PAD;

  // Canvas yüksekliğini ayarla
  canvas.resizeWithoutConstraints(CW + PAD*2, Y);

  figma.viewport.scrollAndZoomIntoView([canvas]);
  figma.currentPage.selection = [canvas];
  figma.notify("Mimari Manifesto oluşturuldu!", { timeout: 5000 });
  figma.closePlugin();

})().catch(err => {
  console.error(err);
  figma.notify("Hata: " + err.message, { error: true, timeout: 10000 });
  figma.closePlugin();
});
