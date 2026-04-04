package com.example.urlshortener.dto;

import com.example.urlshortener.entity.ShortUrl;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortenResponse {

    private Long id;
    private String url;
    private String shortCode;
    private Long accessCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Converts ShortUrl entity to ShortenResponse DTO for API responses
    public static ShortenResponse from(ShortUrl shortUrl) {
        return ShortenResponse.builder()
                .id(shortUrl.getId())
                .url(shortUrl.getOriginalUrl())
                .shortCode(shortUrl.getShortCode())
                .accessCount(shortUrl.getAccessCount())
                .createdAt(shortUrl.getCreatedAt())
                .updatedAt(shortUrl.getUpdatedAt())
                .build();
    }
}
