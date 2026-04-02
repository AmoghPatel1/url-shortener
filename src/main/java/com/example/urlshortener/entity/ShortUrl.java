package com.example.urlshortener.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "short_urls",
    indexes = {
        @Index(name = "idx_short_code", columnList = "short_code", unique = true)
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortUrl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false, updatable = false)                   // updatable = false on id — prevents accidental ID changes:
    private Long id;

    @Column(name = "short_code",  nullable = false, unique = true, length = 20)
    private String shortCode;

    @Column(name = "original_url", nullable = false, length = 2048)
    private String originalUrl;

    @Builder.Default                                                            // @Builder.Default is needed because Lombok's @Builder ignores field initializers without it
    @Column(name = "access_count", nullable = false)                            // (without this, it will be null, this way it'll we 0)
    private Long accessCount = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)           // createdAt is not updatable because it will be created only once.
    private LocalDateTime createdAt;                                            // It prevents Hibernate from ever updating the creation timestamp.

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {                                                 // **`@PrePersist` vs `@PreUpdate`**:
        this.createdAt = LocalDateTime.now();                                   // INSERT → @PrePersist fires → sets both createdAt + updatedAt
        this.updatedAt = LocalDateTime.now();                                   // UPDATE → @PreUpdate fires  → sets only updatedAt
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

}
