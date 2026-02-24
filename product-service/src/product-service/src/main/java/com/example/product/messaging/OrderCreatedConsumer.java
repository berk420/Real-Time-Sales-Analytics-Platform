package com.example.product.messaging;

import com.example.product.model.Product;
import com.example.product.repository.InMemoryProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class OrderCreatedConsumer {

    private final InMemoryProductRepository repo;
    private final ObjectMapper mapper = new ObjectMapper();

    public OrderCreatedConsumer(InMemoryProductRepository repo) {
        this.repo = repo;
    }

    @KafkaListener(topics = "${KAFKA_ORDER_CREATED_TOPIC:order.created}", groupId = "product-service")
    public void handleOrderCreated(ConsumerRecord<String, String> record) throws Exception {
        JsonNode node = mapper.readTree(record.value());
        String productId = node.get("ProductId").asText();
        int quantity = node.get("Quantity").asInt();

        repo.findById(productId).ifPresent(product -> {
            product.setStock(product.getStock() - quantity);
            repo.save(product);
        });
    }
}
