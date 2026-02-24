package com.example.product.controller;

import com.example.product.model.Product;
import com.example.product.repository.InMemoryProductRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final InMemoryProductRepository repo;

    public ProductController(InMemoryProductRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Product> getProducts() {
        return repo.findAll();
    }
}
