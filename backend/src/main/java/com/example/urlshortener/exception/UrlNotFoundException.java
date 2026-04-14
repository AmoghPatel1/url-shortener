package com.example.urlshortener.exception;

import lombok.Getter;

@Getter
public class UrlNotFoundException extends RuntimeException {

    private final String shortCode;

    public UrlNotFoundException(String shortCode) {
        super("Short URL not found for code " + shortCode);
        this.shortCode = shortCode;
    }

}
