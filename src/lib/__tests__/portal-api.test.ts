import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/portal-api");

describe("portalGetAllDashboardIncidents", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("follows links.next and merges paginated incident data", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: [{ idIncidencia: 21, titulo: "Primera" }],
          page: 1,
          total_pages: 2,
          has_more: true,
          links: {
            next: "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal/dashboard/incidencias?page=2",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: [{ idIncidencia: 22, titulo: "Segunda" }],
          page: 2,
          total_pages: 2,
          has_more: false,
          links: {
            next: null,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { portalGetAllDashboardIncidents, setPortalAuth } = await import("@/lib/portal-api");

    setPortalAuth("test-token");
    localStorage.setItem("currentUserEmail", "user@example.com");

    const result = await portalGetAllDashboardIncidents();

    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      { idIncidencia: 21, titulo: "Primera" },
      { idIncidencia: 22, titulo: "Segunda" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal/dashboard/incidencias?page=1"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal/dashboard/incidencias?page=2"
    );
  });
});
