import { createShortUrl, listUrls, getUrl, updateUrl, deleteUrl } from "./api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockResponse = {
  id: 1,
  url: "https://example.com",
  shortCode: "abc123",
  accessCount: 0,
  createdAt: "2026-01-01T00:00:00",
  updatedAt: "2026-01-01T00:00:00",
};

beforeEach(() => mockFetch.mockReset());

test("createShortUrl posts to /api/shorten", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => mockResponse });
  const result = await createShortUrl("https://example.com");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ url: "https://example.com" }) })
  );
  expect(result.shortCode).toBe("abc123");
});

test("listUrls calls GET /api/shorten", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => [mockResponse] });
  const result = await listUrls();
  expect(mockFetch).toHaveBeenCalledWith("http://localhost:8081/api/shorten", expect.any(Object));
  expect(result).toHaveLength(1);
});

test("deleteUrl calls DELETE /api/shorten/abc123", async () => {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await deleteUrl("abc123");
  expect(mockFetch).toHaveBeenCalledWith(
    "http://localhost:8081/api/shorten/abc123",
    expect.objectContaining({ method: "DELETE" })
  );
});
