package com.example.urlshortener.util;

import com.example.urlshortener.repository.ShortUrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ShortCodeGenerator Tests")
public class ShortCodeGeneratorTest {

    @Mock
    private ShortUrlRepository repository;

    @InjectMocks
    private ShortCodeGenerator generator;

    private static final String BASE62_PATTERN = "^[a-zA-Z0-9]+$";
    private static final int    CODE_LENGTH    = 6;
    private static final int    SAMPLE_SIZE    = 1000;

    @BeforeEach
    void setUp() {
        // Default: no collisions unless overridden per test
        when(repository.existsByShortCode(anyString())).thenReturn(false);
    }

    @Test
    @DisplayName("Generated code should always be exactly 6 characters")
    void shouldGenerateCodeOfExactLength() {
        String code = generator.generate();

        assertThat(code)
                .isNotNull()
                .hasSize(CODE_LENGTH);
    }

    @RepeatedTest(20)
    @DisplayName("Generated code is always 6 characters across repeated calls")
    void shouldAlwaysGenerateCorrectLength() {
        String code = generator.generate();

        assertThat(code.length())
                .as("Code '%s' should be exactly %d characters", code, CODE_LENGTH)
                .isEqualTo(CODE_LENGTH);
    }

    // ── Base62 Characters ─────────────────────────────

    @Test
    @DisplayName("Generated code should contain only Base62 characters (a-zA-Z0-9)")
    void shouldContainOnlyBase62Characters() {
        String code = generator.generate();

        assertThat(code)
                .as("Code '%s' should match Base62 pattern", code)
                .matches(BASE62_PATTERN);
    }

    @Test
    @DisplayName("All characters in generated code must be from Base62 alphabet")
    void shouldUseOnlyValidAlphabetCharacters() {
        Pattern base62 = Pattern.compile(BASE62_PATTERN);

        for (int i = 0; i < 100; i++) {
            String code = generator.generate();

            assertThat(base62.matcher(code).matches())
                    .as("Code '%s' contains invalid characters", code)
                    .isTrue();
        }
    }

    @Test
    @DisplayName("Generated code should not contain special characters")
    void shouldNotContainSpecialCharacters() {
        for (int i = 0; i < 100; i++) {
            String code = generator.generate();

            assertThat(code)
                    .doesNotContain("-", "_", "+", "/", "=", " ", "!", "@");
        }
    }

    // ── Uniqueness ────────────────────────────────────

    @Test
    @DisplayName("1000 generated codes should all be unique")
    void shouldGenerateUniqueCodes() {
        Set<String> codes = new HashSet<>();

        for (int i = 0; i < SAMPLE_SIZE; i++) {
            String code = generator.generate();
            codes.add(code);
        }

        assertThat(codes)
                .as("Expected %d unique codes but got %d", SAMPLE_SIZE, codes.size())
                .hasSize(SAMPLE_SIZE);
    }

    @Test
    @DisplayName("Generated codes should have high entropy (no obvious patterns)")
    void shouldHaveHighEntropy() {
        Set<String> codes = new HashSet<>();

        for (int i = 0; i < SAMPLE_SIZE; i++) {
            codes.add(generator.generate());
        }

        // All 1000 codes unique → collision rate is 0%
        double uniquenessRate = (double) codes.size() / SAMPLE_SIZE * 100;

        assertThat(uniquenessRate)
                .as("Uniqueness rate should be 100%% but was %.2f%%", uniquenessRate)
                .isEqualTo(100.0);
    }

    // ── Collision Retry ───────────────────────────────

    @Test
    @DisplayName("Should retry and return a new code on single collision")
    void shouldRetryOnCollision() {
        // First call → collision, second call → success
        when(repository.existsByShortCode(anyString()))
                .thenReturn(true)   // 1st attempt — collides
                .thenReturn(false); // 2nd attempt — success

        String code = generator.generate();

        assertThat(code)
                .isNotNull()
                .hasSize(CODE_LENGTH)
                .matches(BASE62_PATTERN);

        // existsByShortCode must have been called at least twice
        verify(repository, atLeast(2)).existsByShortCode(anyString());
    }

    @Test
    @DisplayName("Should retry multiple times and succeed on last allowed attempt")
    void shouldRetryMultipleTimesAndSucceed() {
        // Collide 9 times, succeed on 10th (MAX_ATTEMPTS = 10)
        when(repository.existsByShortCode(anyString()))
                .thenReturn(true)   // attempt 1
                .thenReturn(true)   // attempt 2
                .thenReturn(true)   // attempt 3
                .thenReturn(true)   // attempt 4
                .thenReturn(true)   // attempt 5
                .thenReturn(true)   // attempt 6
                .thenReturn(true)   // attempt 7
                .thenReturn(true)   // attempt 8
                .thenReturn(true)   // attempt 9
                .thenReturn(false); // attempt 10 — success

        String code = generator.generate();

        assertThat(code)
                .isNotNull()
                .hasSize(CODE_LENGTH);

        verify(repository, times(10)).existsByShortCode(anyString());
    }

    @Test
    @DisplayName("Should throw IllegalStateException after exceeding max retry attempts")
    void shouldThrowAfterMaxRetries() {
        // Always collide — exhaust all attempts
        when(repository.existsByShortCode(anyString()))
                .thenReturn(true);

        assertThatThrownBy(() -> generator.generate())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Failed to generate unique short code after");

        // Verify all 10 attempts were made
        verify(repository, times(10)).existsByShortCode(anyString());
    }

    @Test
    @DisplayName("Should call existsByShortCode exactly once when no collision")
    void shouldCallRepositoryOnceOnNoCollision() {
        when(repository.existsByShortCode(anyString())).thenReturn(false);

        generator.generate();

        verify(repository, times(1)).existsByShortCode(anyString());
    }

    // ── Format ────────────────────────────────────────

    @Test
    @DisplayName("Generated code should not be blank or empty")
    void shouldNotBeBlankOrEmpty() {
        String code = generator.generate();

        assertThat(code)
                .isNotBlank()
                .isNotEmpty();
    }

    @Test
    @DisplayName("Generated code should not have leading or trailing whitespace")
    void shouldNotHaveWhitespace() {
        for (int i = 0; i < 50; i++) {
            String code = generator.generate();

            assertThat(code)
                    .isEqualTo(code.trim())
                    .doesNotContain(" ");
        }
    }

}
