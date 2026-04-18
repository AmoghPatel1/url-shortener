### Key Testing Techniques Used
ArgumentCaptor — inspect what was passed to the mock:

```
ArgumentCaptor<ShortUrl> captor = ArgumentCaptor.forClass(ShortUrl.class);
service.createShortUrl(request);

verify(repository).save(captor.capture());
ShortUrl saved = captor.getValue();

// Now assert on the actual object passed to save()
assertThat(saved.getOriginalUrl()).isEqualTo(ORIGINAL_URL);
assertThat(saved.getShortCode()).isEqualTo(SHORT_CODE);
```

verify(repo, never()) — assert something was NOT called:

```
// On update/delete failure — save/delete must never be reached
verify(repository, never()).save(any());
verify(repository, never()).delete(any());
```

@Nested classes — group related tests logically:

```
// Each method gets its own @Nested class
// Test output groups neatly in IDE and CI reports:

// ✅ createShortUrl() > Should return correct ShortenResponse
// ✅ getByShortCode() > Should throw UrlNotFoundException for missing code
// ✅ incrementAccessCount() > Should increment accessCount by 1 and save
```

