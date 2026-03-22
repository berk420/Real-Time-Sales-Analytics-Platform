# Mimari Manifesto — Real-Time Sales Analytics Platform

> Bu belge projenin mimari kararlarını, teknoloji seçimlerini ve tasarım prensiplerini açıklar.
> Her karar "neden bu?" sorusuna yanıt verir.

---

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Mimari Felsefesi](#2-mimari-felsefesi)
3. [Sistem Mimarisi](#3-sistem-mimarisi)
4. [Servis Bağımlılıkları ve Başlatma Sırası](#4-servis-bağımlılıkları-ve-başlatma-sırası)
5. [Event-Driven Akış — Sipariş Oluşturma](#5-event-driven-akış--sipariş-oluşturma)
6. [Veri Akışı ve Katmanlar](#6-veri-akışı-ve-katmanlar)
7. [Servis Detayları](#7-servis-detayları)
   - [API Gateway](#71-api-gateway)
   - [Order Service](#72-order-service)
   - [Product Service](#73-product-service)
   - [Analytics Service](#74-analytics-service)
   - [Frontend](#75-frontend)
8. [Altyapı Kararları](#8-altyapı-kararları)
9. [Tasarım Desenleri](#9-tasarım-desenleri)
10. [Trade-off'lar ve Bilinçli Kısıtlamalar](#10-trade-offlar-ve-bilinçli-kısıtlamalar)

---

## 1. Genel Bakış

Bu platform **gerçek zamanlı satış analitik** ihtiyacını karşılamak için tasarlanmış
**polyglot mikroservis** mimarisine sahiptir.

```
Kullanıcı sipariş verir
    → Anlık olarak stok güncellenir
    → Anlık olarak dashboard metrikleri güncellenir
    → Tüm eventler aranabilir şekilde indekslenir
```

**Temel hedefler:**
- Servisler birbirinden **bağımsız deploy** edilebilmeli
- Sipariş yazma, analitik okuma birbirini **bloke etmemeli**
- Sistem bileşenleri **farklı dillerde/framework'lerde** yazılabilmeli (polyglot)
- Tüm ortam **tek komutla** ayağa kalkmalı (`docker compose up`)

---

## 2. Mimari Felsefesi

### Neden Mikroservis?

```
Monolitik Alternatif:
┌─────────────────────────────────────┐
│  Tek uygulama: Order + Product      │
│  + Analytics + API + Frontend       │
│                                     │
│  ✗ Bir değişiklik tümünü deploy eder│
│  ✗ Analytics yükü order'ı etkiler   │
│  ✗ Tek dil/tek framework zorunlu    │
└─────────────────────────────────────┘

Mikroservis Yaklaşımı:
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Order   │  │ Product  │  │Analytics │
│ Service  │  │ Service  │  │ Service  │
│ (.NET 8) │  │(Java 17) │  │ (.NET 8) │
└──────────┘  └──────────┘  └──────────┘
     ↑              ↑              ↑
✓ Bağımsız deploy  ✓ Bağımsız scale  ✓ Farklı dil
```

### Neden Event-Driven?

Alternatif: **Senkron HTTP zinciri**

```
Order Service ──HTTP──► Product Service ──HTTP──► Analytics Service
     ↑                        ↑                         ↑
✗ Product Service çökerse order başarısız olur
✗ Analytics gecikmesi order latency'sine eklenir
✗ Servisler sıkı bağlı (tight coupling)
```

Seçilen: **Asenkron Kafka event'leri**

```
Order Service ──Kafka──► Product Service  (bağımsız tüketir)
                  └────► Analytics Service (bağımsız tüketir)
     ↑
✓ Order Service sadece "event yayınla" der, kimsenin dinleyip dinlemediğini bilmez
✓ Product veya Analytics çökerse order etkilenmez
✓ Yeni servis eklemek için mevcut kodu değiştirmeye gerek yok
```

---

## 3. Sistem Mimarisi

```mermaid
graph TB
    User(["🌐 Kullanıcı / Tarayıcı"])

    subgraph Entry["Giriş Katmanı"]
        Nginx["Nginx 1.25\nReverse Proxy\nPort :80"]
    end

    subgraph Presentation["Sunum Katmanı"]
        FE["Frontend\nReact 18 · Redux · TypeScript\nVite · Recharts\nPort :4173"]
        GW["API Gateway\nASP.NET Core 8 · YARP\nPort :8080"]
    end

    subgraph Services["Servis Katmanı"]
        OS["Order Service\n.NET 8 · Clean Architecture\nEF Core · Confluent.Kafka"]
        PS["Product Service\nSpring Boot 3.3 · Java 17\nspring-kafka"]
        AS["Analytics Service\n.NET 8 · Background Workers\nConfluent.Kafka · StackExchange.Redis"]
    end

    subgraph DataStores["Veri Katmanı"]
        PG[("PostgreSQL 16\nordersdb\nPort :5432")]
        MEM[("In-Memory\nProduct Stock\nJVM Heap")]
        RD[("Redis 7\nDashboard Cache\nTTL: 30s · Port :6379")]
        ES[("Elasticsearch 8.14\norder-events index\nPort :9200")]
    end

    subgraph Messaging["Mesajlaşma Katmanı"]
        KF["Apache Kafka 7.6\nTopic: order.created\nPort :9092"]
        ZK["Zookeeper 7.6\nKoordinatör\nPort :2181"]
    end

    User -->|"HTTPS"| Nginx
    Nginx -->|"/* statik"| FE
    Nginx -->|"/api/* proxy"| GW

    FE -->|"REST API çağrıları"| GW
    GW -->|"/api/orders"| OS
    GW -->|"/api/products"| PS
    GW -->|"/api/analytics"| AS

    OS -->|"SQL yazma"| PG
    OS -->|"Publish: order.created"| KF
    PS -->|"Stok güncelle"| MEM
    AS -->|"Cache yaz (30s)"| RD
    AS -->|"Event indeksle"| ES

    KF -->|"Consume"| PS
    KF -->|"Consume"| AS
    KF ---|"Koordinasyon"| ZK

    style Entry fill:#e8eaf6
    style Presentation fill:#e8f5e9
    style Services fill:#fff3e0
    style DataStores fill:#fce4ec
    style Messaging fill:#fff8e1
```

---

## 4. Servis Bağımlılıkları ve Başlatma Sırası

Docker Compose `depends_on` zinciri:

```mermaid
graph LR
    ZK["Zookeeper"]
    KF["Kafka"]
    PG["PostgreSQL"]
    RD["Redis"]
    ES["Elasticsearch"]
    OS["Order Service"]
    PS["Product Service"]
    AS["Analytics Service"]
    GW["API Gateway"]
    FE["Frontend"]
    NG["Nginx"]

    ZK --> KF
    PG --> OS
    KF --> OS
    KF --> PS
    KF --> AS
    RD --> AS
    ES --> AS
    OS --> GW
    PS --> GW
    AS --> GW
    GW --> FE
    GW --> NG
    FE --> NG
```

**Başlatma sırası (paralel gruplar):**

| Aşama | Servisler | Neden |
|-------|-----------|-------|
| 1 | Zookeeper, PostgreSQL, Redis, Elasticsearch | Bağımlısı yok |
| 2 | Kafka | Zookeeper hazır olmalı |
| 3 | Order, Product, Analytics Service | Kafka + kendi DB'leri hazır olmalı |
| 4 | API Gateway | Tüm backend servisler hazır olmalı |
| 5 | Frontend | Gateway hazır olmalı |
| 6 | Nginx | Hem Gateway hem Frontend hazır olmalı |

---

## 5. Event-Driven Akış — Sipariş Oluşturma

Bir siparişin sistemdeki tam yaşam döngüsü:

```mermaid
sequenceDiagram
    actor Kullanıcı
    participant FE as Frontend<br/>(React)
    participant GW as API Gateway<br/>(YARP)
    participant OS as Order Service<br/>(.NET 8)
    participant PG as PostgreSQL
    participant KF as Kafka<br/>(order.created)
    participant PS as Product Service<br/>(Spring Boot)
    participant AS as Analytics Service<br/>(.NET 8)
    participant RD as Redis
    participant ES as Elasticsearch

    Kullanıcı->>FE: Sipariş formu gönder
    FE->>GW: POST /api/orders
    GW->>OS: POST /api/orders (proxy)

    OS->>PG: INSERT INTO Orders (...)
    PG-->>OS: ✓ Kayıt tamamlandı

    OS->>KF: Publish → order.created<br/>{ orderId, productId, quantity, total }
    KF-->>OS: ✓ Ack alındı

    OS-->>GW: 201 Created { order }
    GW-->>FE: 201 Created { order }
    FE-->>Kullanıcı: "Sipariş oluşturuldu ✓"

    Note over KF,AS: Asenkron — kullanıcı cevabı almış bile

    par Kafka Consumer'ları (paralel)
        KF->>PS: Consume: order.created
        PS->>PS: productStock[productId] -= quantity
        PS-->>KF: ✓ Offset commit

        KF->>AS: Consume: order.created
        AS->>AS: totalSales += amount<br/>totalOrders += 1<br/>salesPerProduct[id] += amount
        AS->>RD: SET analytics:dashboard {...} EX 30
        AS->>ES: POST /order-events/_doc { event }
        AS-->>KF: ✓ Offset commit
    end

    Note over FE,RD: Sonraki dashboard GET isteği
    FE->>GW: GET /api/analytics/dashboard
    GW->>AS: GET /api/analytics/dashboard
    AS->>RD: GET analytics:dashboard
    RD-->>AS: Cache HIT → { totalSales, totalOrders, topProduct }
    AS-->>GW: 200 { metrics }
    GW-->>FE: 200 { metrics }
    FE-->>Kullanıcı: Dashboard güncellendi
```

---

## 6. Veri Akışı ve Katmanlar

```mermaid
flowchart TD
    subgraph Write["✍️ Yazma Yolu (Command)"]
        direction LR
        W1["POST /api/orders"] --> W2["Order Service"]
        W2 --> W3[("PostgreSQL\nKalıcı depo")]
        W2 --> W4[["Kafka\norder.created"]]
    end

    subgraph ReadSync["📖 Senkron Okuma"]
        R1["GET /api/orders"] --> R2["Order Service"]
        R2 --> R3[("PostgreSQL\nSorgu")]

        R4["GET /api/products"] --> R5["Product Service"]
        R5 --> R6[("In-Memory\nJVM Heap")]
    end

    subgraph ReadAsync["⚡ Asenkron Okuma (Cache)"]
        RA1["GET /api/analytics/dashboard"] --> RA2["Analytics Service"]
        RA2 -->|"Cache HIT"| RA3[("Redis\nTTL: 30s")]
        RA2 -->|"Cache MISS"| RA4["In-Memory Metrics\nHesapla"]
        RA4 --> RA3
    end

    subgraph Search["🔍 Arama"]
        S1["GET /api/search?q=..."] --> S2["Analytics Service"]
        S2 --> S3[("Elasticsearch\nFull-text sorgu")]
    end

    W4 -->|"Consume"| PS_Update["Product Service\nStok -=qty"]
    W4 -->|"Consume"| AS_Update["Analytics Service\nMetrik güncelle\n+ Redis invalidate\n+ ES index"]

    PS_Update --> R6
    AS_Update --> RA4
    AS_Update --> RA3
```

---

## 7. Servis Detayları

### 7.1 API Gateway

**Neden YARP (Yet Another Reverse Proxy)?**

```mermaid
graph LR
    subgraph "Alternatifler"
        A1["Nginx\n✗ Statik config\n✗ .NET ekosistemi dışı"]
        A2["Ocelot\n✗ Bakımı azaldı\n✗ .NET 8 desteği zayıf"]
        A3["YARP ✓\n✓ Microsoft destekli\n✓ Kod tabanlı config\n✓ Middleware pipeline\n✓ .NET 8 native"]
    end
```

**Routing kuralları:**

```
İstek                       → Hedef Servis
/api/orders/**              → order-service:8080
/api/products/**            → product-service:8080
/api/analytics/**           → analytics-service:8080
```

**Gateway'in sorumluluğu YALNIZCA routing'dir** — auth, rate limiting gibi
cross-cutting concern'ler production'da buraya eklenecek şekilde tasarlanmıştır.

---

### 7.2 Order Service

**Clean Architecture katmanları:**

```mermaid
graph TD
    subgraph API["API Katmanı (OrderService.Api)"]
        CTRL["OrdersController\nGET /api/orders\nPOST /api/orders"]
    end

    subgraph App["Uygulama Katmanı (OrderService.Application)"]
        CMD["CreateOrderCommand"]
        DTO["OrderDto"]
        IORD["IOrderRepository interface"]
        IKAF["IKafkaProducer interface"]
    end

    subgraph Domain["Domain Katmanı (OrderService.Domain)"]
        ENT["Order Entity\nId · CustomerName\nProductId · Quantity\nTotalAmount · CreatedAt"]
    end

    subgraph Infra["Altyapı Katmanı (OrderService.Infrastructure)"]
        REPO["OrderRepository\n(EF Core + PostgreSQL)"]
        KAFP["KafkaProducer\n(Confluent.Kafka)"]
        CTX["AppDbContext\n(EF Core)"]
    end

    CTRL --> CMD
    CMD --> IORD
    CMD --> IKAF
    IORD -.->|"implements"| REPO
    IKAF -.->|"implements"| KAFP
    REPO --> CTX
    CTX --> ENT
```

**Neden Clean Architecture?**
- `Application` katmanı `Infrastructure`'a **bağımlı değil** → test edilebilir
- `IOrderRepository` interface'i `PostgreSQL`'i mock'lamayı sağlar
- Domain logic, framework veya DB'den izole

**Neden PostgreSQL?**
- Sipariş verisi **ilişkisel** yapıya uygun (CustomerName, ProductId, Amount)
- ACID garantisi kritik: Sipariş ya tamamen yazılır ya hiç
- EF Core ile migration yönetimi kolay

---

### 7.3 Product Service

**Neden Spring Boot (Java) — .NET değil?**

```
Kasıtlı polyglot seçim:
✓ Farklı teknoloji yığınlarının birlikte çalışabileceğini göstermek
✓ Microservices'in dil bağımsızlığını somutlaştırmak
✓ Kafka consumer Spring ekosisteminde (spring-kafka) son derece olgun
```

**Neden In-Memory storage?**

```mermaid
graph LR
    subgraph "Neden DB yok?"
        P1["Stok = Türetilmiş veri\norder.created event'lerinden hesaplanır"]
        P2["Kalıcılık gerekmez\nServis restart'ta Kafka'dan replay edilebilir"]
        P3["Okuma hızı kritik\nHerhangi bir DB lookup'tan hızlı"]
    end
```

> **Kısıt:** Servis restart'ında stok sıfırlanır. Production'da
> Kafka'dan replay veya bir event store ile çözülür.

---

### 7.4 Analytics Service

**Neden iki farklı cache/search katmanı?**

```mermaid
graph TD
    subgraph "Redis — Neden?"
        R1["Dashboard metrikleri sık okunur\n(saniyede onlarca istek)"]
        R2["30 saniye TTL yeterli\n(real-time'a yakın)"]
        R3["In-memory hesaplama ucuz\ncache miss maliyeti düşük"]
        R1 --> R2 --> R3
    end

    subgraph "Elasticsearch — Neden?"
        E1["Sipariş geçmişinde\nfull-text arama gereksinimi"]
        E2["customerName, productId\nüzerinde esnek sorgu"]
        E3["PostgreSQL LIKE sorgusu\nbüyük tablolarda yavaş"]
        E1 --> E2 --> E3
    end
```

**Background Worker mimarisi:**

```mermaid
sequenceDiagram
    participant KF as Kafka
    participant BG as OrderCreatedConsumer<br/>(IHostedService)
    participant AS as AnalyticsService<br/>(In-Memory)
    participant RD as RedisCacheService
    participant ES as ElasticsearchIndexer

    loop Her yeni event
        KF->>BG: order.created mesajı
        BG->>AS: UpdateMetrics(event)
        AS->>AS: totalSales += amount<br/>totalOrders++<br/>salesPerProduct[id] += amount
        BG->>RD: Invalidate (cache sil)
        Note over RD: Sonraki GET isteği<br/>yeni metrikleri cache'ler
        BG->>ES: IndexDocument(event)
    end
```

---

### 7.5 Frontend

**State yönetimi mimarisi:**

```mermaid
graph LR
    subgraph Store["Redux Store"]
        AS["analyticsSlice\n{ totalSales, totalOrders\ntopProduct }"]
        OS["ordersSlice\n{ orders[], loading, error }"]
        PS["productsSlice\n{ products[], loading, error }"]
    end

    subgraph Pages
        DB["Dashboard\n/"]
        ORD["Orders\n/orders"]
        PRD["Products\n/products"]
        SRC["Search\n/search"]
    end

    subgraph API["API Layer (Axios)"]
        AX["baseURL: /api\n↓\nNginx → Gateway → Service"]
    end

    DB -->|"dispatch fetchDashboard"| AS
    ORD -->|"dispatch fetchOrders"| OS
    PRD -->|"dispatch fetchProducts"| PS
    SRC -->|"Axios direkt"| AX
    AS & OS & PS --> AX
```

**Neden Redux Toolkit?**

- Birden fazla sayfa aynı veriyi kullanır (Dashboard + Orders)
- API durumu (loading/error) her component'te tekrar yazılmaz
- RTK'nın `createSlice` ile boilerplate minimumda

**Neden Vite (Webpack değil)?**

```
Geliştirme deneyimi:
Webpack: cold start ~8-15s, HMR ~2-5s
Vite:    cold start <1s,    HMR <100ms  ✓
```

---

## 8. Altyapı Kararları

### Nginx — Neden giriş noktası?

```mermaid
graph LR
    subgraph "Nginx olmadan"
        U1["Kullanıcı"] -->|":4173"| F1["Frontend"]
        U1 -->|":8080"| G1["Gateway"]
        X["✗ İki farklı port\n✗ CORS sorunu\n✗ Production'da imkansız"]
    end

    subgraph "Nginx ile"
        U2["Kullanıcı"] -->|":80 /*"| NG["Nginx"]
        NG -->|"/* → :4173"| F2["Frontend"]
        NG -->|"/api/* → :8080"| G2["Gateway"]
        Y["✓ Tek port (80/443)\n✓ CORS sorunu yok\n✓ SPA routing desteği\n✓ Statik dosya sunumu"]
    end
```

### Kafka — Neden diğer alternatiflere tercih edildi?

| Özellik | RabbitMQ | Redis Pub/Sub | **Kafka** |
|---------|----------|---------------|-----------|
| Mesaj kalıcılığı | ✓ | ✗ | **✓** |
| Replay (geçmiş okuma) | ✗ | ✗ | **✓** |
| Yüksek throughput | Orta | Yüksek | **Çok Yüksek** |
| Consumer group | ✓ | ✗ | **✓** |
| Analitik için uygunluk | Düşük | Düşük | **Yüksek** |

> **Kritik avantaj:** Kafka event'leri disk'e yazılır. Analytics Service yeniden başladığında
> geçmiş event'leri replay ederek in-memory metriklerini yeniden oluşturabilir.

### Redis Cache Stratejisi

```
Cache-Aside Pattern:
                     ┌──────────────┐
GET /analytics  ───► │   Redis      │──── HIT ──► Response
                     │ analytics:   │
                     │ dashboard    │──── MISS ──► In-Memory Hesapla
                     └──────────────┘                    │
                                                         ▼
order.created   ───► Cache Invalidate              SET Redis (30s)
```

**TTL = 30 saniye** seçimi:
- Real-time hissi verir (kullanıcı max 30s eski veri görür)
- Backend'e her istek için hesaplama yaptırmaz
- Yoğun dashboard kullanımında Redis baskıyı emer

---

## 9. Tasarım Desenleri

```mermaid
mindmap
  root((Tasarım<br/>Desenleri))
    Event-Driven Architecture
      Publisher Order Service
      Consumer Product Service
      Consumer Analytics Service
      Broker Kafka
    Clean Architecture
      Domain Order Entity
      Application IRepository Interface
      Infrastructure EF Core PostgreSQL
      API Controller
    Repository Pattern
      IOrderRepository
      OrderRepository EF Core
      Test edilebilirlik
    Cache-Aside Pattern
      Redis
      30s TTL
      Invalidation on event
    Reverse Proxy Pattern
      YARP Gateway
      Nginx Edge
    CQRS lite
      Yazma Order Service + PostgreSQL
      Okuma Analytics Service + Redis
    Producer-Consumer
      Kafka topic
      Multiple consumers
```

---

## 10. Trade-off'lar ve Bilinçli Kısıtlamalar

| Karar | Avantaj | Kabul Edilen Kısıt |
|-------|---------|-------------------|
| **Product Service in-memory** | Sıfır DB latency, sade kod | Restart'ta stok sıfırlanır |
| **Analytics in-memory metrics** | Hızlı hesaplama | Restart'ta Kafka replay gerekir |
| **Redis TTL=30s** | Cache baskısını düşürür | Max 30s gecikmiş veri |
| **Single Kafka broker** | Kurulumu basit | HA yok, single point of failure |
| **Elasticsearch security=false** | Geliştirme kolaylığı | Production'da TLS + auth şart |
| **Zookeeper based Kafka** | Sağlam, iyi belgelenmiş | KRaft moduna kıyasla ek servis |
| **EF Core migrations** | Kod tabanlı schema yönetimi | Migration çakışma riski (takımda) |

---

## Özet

```
Kullanıcı → Nginx → Gateway → Servisler
                                  │
                      ┌───────────┼───────────┐
                      ▼           ▼           ▼
                   Order       Product    Analytics
                  (.NET 8)   (Java 17)   (.NET 8)
                      │                      │
                   PostgreSQL              Redis
                      │                  Elasticsearch
                      └──── Kafka ───────────┘
                         (order.created)
```

Her servis **tek bir sorumluluğa** sahiptir.
Servisler **event üzerinden** haberleşir, doğrudan birbirini çağırmaz.
Okuma ve yazma yolları **birbirini bloke etmez**.
Tüm sistem **docker compose up** ile ayağa kalkar.
