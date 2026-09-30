import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the necessary modules and functions
const { fetchMock, getMock, listenMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  getMock: vi.fn(),
  listenMock: vi.fn(),
}));

vi.mock("express", () => ({
  default: vi.fn(() => ({
    get: getMock,
    listen: listenMock,
  })),
}));

vi.mock("./config", () => ({
  tmdbAccessToken: "test-access-token",
}));

vi.stubGlobal("fetch", fetchMock);

// Import the code under test after setting up the mocks
import "./index";

// Define types for the request and response objects used in the route handlers
type RouteHandler = (req: Request, res: Response) => void | Promise<void>;

// Create a map of route handlers for easy access in tests
const routeHandlers = new Map<string, RouteHandler>(
  getMock.mock.calls.map(([path, handler]) => [path as string, handler as RouteHandler]),
);

// Check if the server was started on the expected port
const serverWasStarted = listenMock.mock.calls.some(([port]) => port === 3000);

describe("back-end server routes", () => {
  // Clear mocks before each test to ensure isolation
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("server setup", () => {
    describe("server listening", () => {
      it("starts the server on port 3000", () => {
        expect(serverWasStarted).toBe(true);
      });
    });
  });

  describe("route registration", () => {
    it("registers the /api/movies/:id route", () => {
      expect(routeHandlers.has("/api/movies/:id")).toBe(true);
    });

    it("registers the /api/movies/popular route", () => {
      expect(routeHandlers.has("/api/movies/popular")).toBe(true);
    });

    it("registers the /api/health route", () => {
      expect(routeHandlers.has("/api/health")).toBe(true);
    });
  });

  describe("movie details route", () => {
    it.each([
      ["12345", "First movie"],
      ["67890", "Second movie"],
    ])("returns transformed details for movie %s", async (movieId, title) => {
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            adult: true,
            id: Number(movieId),
            production_companies: [{ id: 1, name: "Production company" }],
            title,
            video: false,
          }),
          { status: 200 },
        ),
      );

      const response = {
        json: vi.fn(),
        status: vi.fn(),
      };
      const detailHandler = routeHandlers.get("/api/movies/:id");

      await detailHandler?.(
        {
          params: { id: movieId },
          query: { language: "fr-FR" },
        } as unknown as Request,
        response as unknown as Response,
      );

      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.themoviedb.org/3/movie/${movieId}?language=fr-FR`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-access-token",
          }),
        }),
      );
      expect(response.json).toHaveBeenCalledWith({
        id: Number(movieId),
        title,
      });
    });
  });
});