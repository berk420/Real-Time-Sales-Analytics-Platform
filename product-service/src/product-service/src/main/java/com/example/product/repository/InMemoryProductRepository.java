package com.example.product.repository;

import com.example.product.model.Product;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryProductRepository {
    private final Map<String, Product> store = new ConcurrentHashMap<>();

    public InMemoryProductRepository() {
        addProduct("p1",  "iPhone 15 Pro",         "Telefon",       47,  64999);
        addProduct("p2",  "Samsung Galaxy S24",     "Telefon",       63,  24999);
        addProduct("p3",  "MacBook Air M3",         "Laptop",        19,  54999);
        addProduct("p4",  "Dell XPS 15",            "Laptop",        12,  47999);
        addProduct("p5",  "Sony WH-1000XM5",        "Kulaklık",      88,  12499);
        addProduct("p6",  "AirPods Pro 2",          "Kulaklık",       5,   7999);
        addProduct("p7",  "iPad Pro 12.9",          "Tablet",        34,  39999);
        addProduct("p8",  "Samsung Galaxy Tab S9",  "Tablet",        27,  23999);
        addProduct("p9",  "PlayStation 5",          "Oyun Konsolu",   0,  19999);
        addProduct("p10", "Xbox Series X",          "Oyun Konsolu",   8,  18999);
        addProduct("p11", "LG OLED C3 55",          "Televizyon",    15,  34999);
        addProduct("p12", "Dyson V15 Detect",       "Ev Aletleri",   41,  14999);
        addProduct("p13", "Kindle Paperwhite",      "E-Okuyucu",    102,   4999);
        addProduct("p14", "GoPro Hero 12",          "Kamera",        23,  21999);
        addProduct("p15", "Apple Watch Ultra 2",    "Akıllı Saat",   16,  39999);
    }

    private void addProduct(String id, String name, String category, int stock, double price) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setCategory(category);
        p.setStock(stock);
        p.setPrice(price);
        store.put(id, p);
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
