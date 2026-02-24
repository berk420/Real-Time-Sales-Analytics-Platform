## Real-Time Sales Analytics Platform

Polyglot (ASP.NET Core + Spring Boot) mikro servis tabanlı gerçek zamanlı satış analitik dashboard'u.

### Mimari

- **API Gateway**: .NET 8 + YARP, `/api/orders`, `/api/products`, `/api/analytics` routing.
- **Order Service**: .NET 8, Clean Architecture, PostgreSQL, Kafka producer (`order.created`).
- **Product Service**: Spring Boot, Kafka consumer, stok güncelleme.
- **Analytics Service**: .NET 8, Kafka consumer, Redis cache, Elasticsearch indeksleme, `/api/analytics/dashboard`.
- **Frontend**: React + Redux Toolkit, Axios, basit chart (Recharts).
- **Infra**: Kafka, Zookeeper, Redis, Elasticsearch, PostgreSQL, Nginx reverse proxy.

### Çalıştırma

1. `.env.example` dosyasını kopyalayın:

```bash
cp .env.example .env
```

2. Docker Compose ile tüm stack'i ayağa kaldırın:

```bash
docker compose up --build
```

3. Tarayıcıdan:

- UI: `http://localhost/`
- API (gateway üzerinden):
  - `POST http://localhost/api/orders`
  - `GET http://localhost/api/orders`
  - `GET http://localhost/api/products`
  - `GET http://localhost/api/analytics/dashboard`

### Örnek Event Flow

1. `POST /api/orders`:
   - Order Service, PostgreSQL'e yazar.
   - `order.created` event'ini Kafka'ya publish eder.
2. Product Service (Spring):
   - Kafka'dan `order.created` okur, ilgili ürün stokunu azaltır.
3. Analytics Service:
   - Kafka'dan `order.created` okur.
   - Bellekte toplam satış ve ürün başına satışları günceller.
   - Redis'e dashboard metriklerini cache eder.
   - Elasticsearch'e event dokümanını indeksler.
4. Frontend Dashboard:
   - `/api/analytics/dashboard` çağrısı ile anlık metrikleri gösterir.

### Geliştirme

- .NET servisleri için:
  - `dotnet run` (ilgili proje klasöründe)
- Product Service için:
  - `mvn spring-boot:run -f product-service/src/product-service/pom.xml`
- Frontend için:
  - `cd frontend && npm install && npm run dev`
