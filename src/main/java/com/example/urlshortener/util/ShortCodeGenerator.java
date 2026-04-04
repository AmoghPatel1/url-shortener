package com.example.urlshortener.util;

import com.example.urlshortener.repository.ShortUrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Slf4j
@Component
@RequiredArgsConstructor
public class ShortCodeGenerator {

    // --- Base62 Alphabet -------------------------------------------
    private static final String ALPHABET =
            "abcdefghijklmnopqrstuvwxyz"    // a-z  : 26
            + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"  // A-Z  : 26
            + "0123456789";                 // 0-9  : 10
                                            // Total: 62 chars

    private static final int CODE_LENGTH = 6;
    private static final int MAX_ATTEMPTS = 10;

    // --- SecureRandom (thread-safe, cryptographically strong) ------
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ShortUrlRepository shortUrlRepository;

    // ── Public API ────────────────────────────────────
    /**
     * Generates a unique 6-character Base62 short code.
     * Retries up to MAX_ATTEMPTS times if a collision is found in DB.
     *
     * @throws IllegalStateException if unable to generate unique code
     */
    public String generate() {
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String code = generateCode();

            if (!shortUrlRepository.existsByShortCode(code)) {
                log.debug("Short code generated in {} attempt(s): {}", attempt, code);
                return code;
            }

            log.warn("Short code collision detected: '{}' (attempt {}/{})",
                    code, attempt, MAX_ATTEMPTS);
        }

        throw new IllegalStateException(
                "Failed to generate unique short code after " + MAX_ATTEMPTS + " attempts"
        );
    }

    // ── Private Helpers ───────────────────────────────
    /**
     * Generates a random 6-character Base62 string.
     * 62^6 = 56,800,235,584 possible combinations.
     */
    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

//    With 56 billion possible codes, collisions are extremely rare — the retry loop is a safety net, not a frequent path.
}
