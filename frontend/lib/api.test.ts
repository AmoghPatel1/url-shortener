import { createShortUrl, listUrls, getUrl, getStats, updateUrl, deleteUrl } from "./api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockResponse = {
  id: 1,
  url: "https://example.com",
  shortCode: "abc123",
  accessCount: 5,
  createdAt: "2026-01-01T00:00:00",
  updatedAt: "2026-01-01T00:00:00",
};

beforeEach(() => mockFetch.mockReset());

test("createShortUrl posts to /api/shorten", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => mockResponse });
  const result = await createShortUrl("https://example.com");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ url: "https://example.com" }) })
  );
  expect(result.shortCode).toBe("abc123");
});

test("listUrls calls GET /api/shorten", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => [mockResponse] });
  const result = await listUrls();
  expect(mockFetch).toHaveBeenCalledWith("http://localhost:8081/api/shorten", expect.any(Object));
  expect(result).toHaveLength(1);
});

test("getUrl calls GET /api/shorten/{code}", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => mockResponse });
  const result = await getUrl("abc123");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten/abc123",
    expect.objectContaining({ method: "GET" })
  );
  expect(result.id).toBe(1);
});

test("getStats calls GET /api/shorten/{code}/stats", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => mockResponse });
  const result = await getStats("abc123");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten/abc123/stats",
    expect.objectContaining({ method: "GET" })
  );
  expect(result.accessCount).toBe(5);
});

test("updateUrl calls PUT /api/shorten/{code}", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ...mockResponse, url: "https://updated.com" }) });
  const result = await updateUrl("abc123", "https://updated.com");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten/abc123",
    expect.objectContaining({ method: "PUT", body: JSON.stringify({ url: "https://updated.com" }) })
  );
  expect(result.url).toBe("https://updated.com");
});

test("deleteUrl calls DELETE /api/shorten/{code} and handles 204", async () => {
  mockFetch.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
  const result = await deleteUrl("abc123");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten/abc123",
    expect.objectContaining({ method: "DELETE" })
  );
  expect(result).toBeUndefined();
});
