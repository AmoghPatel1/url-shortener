package com.example.urlshortener.service;

import com.example.urlshortener.dto.ShortenRequest;
import com.example.urlshortener.dto.ShortenResponse;
import com.example.urlshortener.entity.ShortUrl;
import com.example.urlshortener.exception.UrlNotFoundException;
import com.example.urlshortener.repository.ShortUrlRepository;
import com.example.urlshortener.util.ShortCodeGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UrlShortenerService Tests")
class UrlShortenerServiceTest {

    @Mock
    private ShortUrlRepository repository;

    @Mock
    private ShortCodeGenerator generator;

    @InjectMocks
    private UrlShortenerService service;

    // ── Shared Test Fixtures ──────────────────────────
    private static final String SHORT_CODE   = "aB3kZ9";
    private static final String ORIGINAL_URL = "https://www.google.com";
    private static final String UPDATED_URL  = "https://www.github.com";

    private ShortUrl mockShortUrl;

    @BeforeEach
    void setUp() {
        mockShortUrl = ShortUrl.builder()
                .id(1L)
                .shortCode(SHORT_CODE)
                .originalUrl(ORIGINAL_URL)
                .accessCount(0L)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ════════════════════════════════════════════════
    // CREATE
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("createShortUrl()")
    class CreateShortUrl {

        @Test
        @DisplayName("Should return correct ShortenResponse when URL is valid")
        void shouldReturnCorrectResponse() {
            // Arrange
            ShortenRequest request = new ShortenRequest(ORIGINAL_URL);
            when(generator.generate()).thenReturn(SHORT_CODE);
            when(repository.save(any(ShortUrl.class))).thenReturn(mockShortUrl);

            // Act
            ShortenResponse response = service.createShortUrl(request);

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getId()).isEqualTo(1L);
            assertThat(response.getUrl()).isEqualTo(ORIGINAL_URL);
            assertThat(response.getShortCode()).isEqualTo(SHORT_CODE);
            assertThat(response.getAccessCount()).isEqualTo(0L);
            assertThat(response.getCreatedAt()).isNotNull();
            assertThat(response.getUpdatedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should call generator.generate() exactly once")
        void shouldCallGeneratorOnce() {
            // Arrange
            when(generator.generate()).thenReturn(SHORT_CODE);
            when(repository.save(any(ShortUrl.class))).thenReturn(mockShortUrl);

            // Act
            service.createShortUrl(new ShortenRequest(ORIGINAL_URL));

            // Assert
            verify(generator, times(1)).generate();
        }

        @Test
        @DisplayName("Should save entity with correct originalUrl and shortCode")
        void shouldSaveEntityWithCorrectFields() {
            // Arrange
            when(generator.generate()).thenReturn(SHORT_CODE);
            when(repository.save(any(ShortUrl.class))).thenReturn(mockShortUrl);

            ArgumentCaptor<ShortUrl> captor = ArgumentCaptor.forClass(ShortUrl.class);

            // Act
            service.createShortUrl(new ShortenRequest(ORIGINAL_URL));

            // Assert — inspect what was actually passed to repository.save()
            verify(repository).save(captor.capture());
            ShortUrl saved = captor.getValue();

            assertThat(saved.getOriginalUrl()).isEqualTo(ORIGINAL_URL);
            assertThat(saved.getShortCode()).isEqualTo(SHORT_CODE);
        }

        @Test
        @DisplayName("Should call repository.save() exactly once")
        void shouldCallRepositorySaveOnce() {
            // Arrange
            when(generator.generate()).thenReturn(SHORT_CODE);
            when(repository.save(any(ShortUrl.class))).thenReturn(mockShortUrl);

            // Act
            service.createShortUrl(new ShortenRequest(ORIGINAL_URL));

            // Assert
            verify(repository, times(1)).save(any(ShortUrl.class));
        }

    }

    // ════════════════════════════════════════════════
    // READ
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("getByShortCode()")
    class GetByShortCode {

        @Test
        @DisplayName("Should return ShortenResponse when short code exists")
        void shouldReturnResponseWhenFound() {
            // Arrange
            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));

            // Act
            ShortenResponse response = service.getByShortCode(SHORT_CODE);

            // Assert
            assertThat(response).isNotNull();
            assertThat(response.getShortCode()).isEqualTo(SHORT_CODE);
            assertThat(response.getUrl()).isEqualTo(ORIGINAL_URL);
        }

        @Test
        @DisplayName("Should throw UrlNotFoundException when short code does not exist")
        void shouldThrowUrlNotFoundExceptionForMissingCode() {
            // Arrange
            when(repository.findByShortCode(anyString()))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.getByShortCode("missing"))
                    .isInstanceOf(UrlNotFoundException.class)
                    .hasMessageContaining("missing");
        }

        @Test
        @DisplayName("Should call findByShortCode with exact code")
        void shouldCallRepositoryWithExactCode() {
            // Arrange
            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));

            // Act
            service.getByShortCode(SHORT_CODE);

            // Assert
            verify(repository, times(1)).findByShortCode(SHORT_CODE);
        }

    }

    // ════════════════════════════════════════════════
    // UPDATE
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("updateShortUrl()")
    class UpdateShortUrl {

        @Test
        @DisplayName("Should update originalUrl and return updated response")
        void shouldUpdateOriginalUrl() {
            // Arrange
            ShortUrl updated = ShortUrl.builder()
                    .id(1L)
                    .shortCode(SHORT_CODE)
                    .originalUrl(UPDATED_URL)
                    .accessCount(0L)
                    .createdAt(mockShortUrl.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));
            when(repository.save(any(ShortUrl.class)))
                    .thenReturn(updated);

            // Act
            ShortenResponse response = service.updateShortUrl(
                    SHORT_CODE, new ShortenRequest(UPDATED_URL));

            // Assert
            assertThat(response.getUrl()).isEqualTo(UPDATED_URL);
            assertThat(response.getShortCode()).isEqualTo(SHORT_CODE);
        }

        @Test
        @DisplayName("Should throw UrlNotFoundException when updating missing code")
        void shouldThrowWhenCodeNotFoundOnUpdate() {
            // Arrange
            when(repository.findByShortCode(anyString()))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.updateShortUrl(
                    "missing", new ShortenRequest(UPDATED_URL)))
                    .isInstanceOf(UrlNotFoundException.class)
                    .hasMessageContaining("missing");

            // repository.save() should never be called
            verify(repository, never()).save(any());
        }

    }

    // ════════════════════════════════════════════════
    // DELETE
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("deleteShortUrl()")
    class DeleteShortUrl {

        @Test
        @DisplayName("Should call repository.delete() when code exists")
        void shouldDeleteWhenFound() {
            // Arrange
            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));

            // Act
            service.deleteShortUrl(SHORT_CODE);

            // Assert
            verify(repository, times(1)).delete(mockShortUrl);
        }

        @Test
        @DisplayName("Should throw UrlNotFoundException when deleting missing code")
        void shouldThrowWhenCodeNotFoundOnDelete() {
            // Arrange
            when(repository.findByShortCode(anyString()))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.deleteShortUrl("missing"))
                    .isInstanceOf(UrlNotFoundException.class)
                    .hasMessageContaining("missing");

            // repository.delete() should never be called
            verify(repository, never()).delete(any());
        }

    }

    // ════════════════════════════════════════════════
    // STATS
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("getStats()")
    class GetStats {

        @Test
        @DisplayName("Should return response with accessCount when code exists")
        void shouldReturnStatsWithAccessCount() {
            // Arrange
            ShortUrl withClicks = ShortUrl.builder()
                    .id(1L)
                    .shortCode(SHORT_CODE)
                    .originalUrl(ORIGINAL_URL)
                    .accessCount(42L)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(withClicks));

            // Act
            ShortenResponse response = service.getStats(SHORT_CODE);

            // Assert
            assertThat(response.getAccessCount()).isEqualTo(42L);
            assertThat(response.getShortCode()).isEqualTo(SHORT_CODE);
        }

        @Test
        @DisplayName("Should throw UrlNotFoundException for missing code on getStats")
        void shouldThrowWhenCodeNotFoundOnStats() {
            // Arrange
            when(repository.findByShortCode(anyString()))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.getStats("missing"))
                    .isInstanceOf(UrlNotFoundException.class)
                    .hasMessageContaining("missing");
        }

    }

    // ════════════════════════════════════════════════
    // INCREMENT ACCESS COUNT
    // ════════════════════════════════════════════════
    @Nested
    @DisplayName("incrementAccessCount()")
    class IncrementAccessCount {

        @Test
        @DisplayName("Should increment accessCount by 1 and save")
        void shouldIncrementAndSave() {
            // Arrange
            ShortUrl incremented = ShortUrl.builder()
                    .id(1L)
                    .shortCode(SHORT_CODE)
                    .originalUrl(ORIGINAL_URL)
                    .accessCount(1L)
                    .createdAt(mockShortUrl.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));
            when(repository.save(any(ShortUrl.class)))
                    .thenReturn(incremented);

            // Act
            ShortenResponse response = service.incrementAccessCount(SHORT_CODE);

            // Assert — accessCount went from 0 → 1
            assertThat(response.getAccessCount()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Should save entity with accessCount incremented by 1")
        void shouldSaveWithIncrementedCount() {
            // Arrange
            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));
            when(repository.save(any(ShortUrl.class)))
                    .thenReturn(mockShortUrl);

            ArgumentCaptor<ShortUrl> captor = ArgumentCaptor.forClass(ShortUrl.class);

            // Act
            service.incrementAccessCount(SHORT_CODE);

            // Assert — capture what was saved and check count
            verify(repository).save(captor.capture());
            assertThat(captor.getValue().getAccessCount()).isEqualTo(1L);
        }

        @Test
        @DisplayName("Should throw UrlNotFoundException for missing code")
        void shouldThrowWhenCodeNotFound() {
            // Arrange
            when(repository.findByShortCode(anyString()))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.incrementAccessCount("missing"))
                    .isInstanceOf(UrlNotFoundException.class)
                    .hasMessageContaining("missing");

            verify(repository, never()).save(any());
        }

        @Test
        @DisplayName("Should call repository.save() exactly once on increment")
        void shouldCallSaveExactlyOnce() {
            // Arrange
            when(repository.findByShortCode(SHORT_CODE))
                    .thenReturn(Optional.of(mockShortUrl));
            when(repository.save(any(ShortUrl.class)))
                    .thenReturn(mockShortUrl);

            // Act
            service.incrementAccessCount(SHORT_CODE);

            // Assert
            verify(repository, times(1)).save(any(ShortUrl.class));
        }

    }

}