package com.example.product.repository;

import com.example.product.model.Product;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryProductRepository {
    private final Map<String, Product> store = new ConcurrentHashMap<>();

    public InMemoryProductRepository() {
        Product p1 = new Product();
        p1.setId("p1");
        p1.setName("Demo Product 1");
        p1.setCategory("Category A");
        p1.setStock(100);
        store.put(p1.getId(), p1);
    }

    public List<Product> findAll() {
        return new ArrayList<>(store.values());
    }

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(store.get(id));
    }

    public void save(Product product) {
        store.put(product.getId(), product);
    }
}
