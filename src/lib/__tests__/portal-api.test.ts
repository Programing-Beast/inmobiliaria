import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/portal-api");

describe("portalGetAllDashboardIncidents", () => {
  const createJwt = (expSeconds: number) => {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url");
    return `${header}.${payload}.signature`;
  };

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubEnv("VITE_APEX_API_USER", "INMOBILIARIA_VIEW");
    vi.stubEnv("VITE_APEX_API_PASSWORD", "secret");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

    localStorage.setItem("currentUserEmail", "user@example.com");
    setPortalAuth("test-token", "Bearer", "user@example.com");

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

  it("refreshes an expired stored token before requesting portal data", async () => {
    const expiredToken = createJwt(Math.floor(Date.now() / 1000) - 60);
    const freshToken = createJwt(Math.floor(Date.now() / 1000) + 60 * 60);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: {
            rol: "owner",
            token: freshToken,
            tokenType: "Bearer",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: [{ idPropiedad: 3, nombre: "EDIFICIO HOME HERRERA" }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { portalGetProperties, setPortalAuth } = await import("@/lib/portal-api");

    localStorage.setItem("currentUserEmail", "user@example.com");
    setPortalAuth(expiredToken, "Bearer", "user@example.com");

    const result = await portalGetProperties();

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal/auth/login"
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: `Bearer ${freshToken}`,
      }),
    });
  });

  it("retries the request with a fresh token after an auth failure response", async () => {
    const oldToken = createJwt(Math.floor(Date.now() / 1000) + 60 * 60);
    const freshToken = createJwt(Math.floor(Date.now() / 1000) + 2 * 60 * 60);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: 401,
          message: "Token expired",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: {
            rol: "owner",
            token: freshToken,
            tokenType: "Bearer",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          data: [{ idPropiedad: 3, nombre: "EDIFICIO HOME HERRERA" }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { portalGetProperties, setPortalAuth } = await import("@/lib/portal-api");

    localStorage.setItem("currentUserEmail", "user@example.com");
    setPortalAuth(oldToken, "Bearer", "user@example.com");

    const result = await portalGetProperties();

    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: `Bearer ${oldToken}`,
      }),
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal/auth/login"
    );
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: `Bearer ${freshToken}`,
      }),
    });
  });

  it("applies Basic Auth to auth/login requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 200,
        data: { token: "new-token", tokenType: "Bearer", rol: "owner" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    
    vi.stubEnv("VITE_APEX_API_USER", "TEST_USER");
    vi.stubEnv("VITE_APEX_API_PASSWORD", "TEST_PASS");

    const { portalLogin } = await import("@/lib/portal-api");
    await portalLogin("test@example.com");

    const expectedBasicAuth = `Basic ${Buffer.from("TEST_USER:TEST_PASS").toString("base64")}`;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("auth/login"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expectedBasicAuth,
        }),
      })
    );
  });

  it("applies Basic Auth to auth/usuarios requests and skips Bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 200, message: "Created" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.stubEnv("VITE_APEX_API_USER", "TEST_USER");
    vi.stubEnv("VITE_APEX_API_PASSWORD", "TEST_PASS");

    const { portalCreateAuthUsuario, setPortalAuth } = await import("@/lib/portal-api");
    
    // Even if we have a token, it should be skipped for auth/ endpoints
    setPortalAuth("some-token");
    localStorage.setItem("currentUserEmail", "admin@example.com");

    await portalCreateAuthUsuario({ correo: "new@example.com" });

    const expectedBasicAuth = `Basic ${Buffer.from("TEST_USER:TEST_PASS").toString("base64")}`;
    const call = fetchMock.mock.calls[0];
    const headers = call?.[1]?.headers;

    expect(headers).toMatchObject({
      Authorization: expectedBasicAuth,
    });
    // Ensure Bearer token is NOT present
    expect(headers.Authorization).not.toContain("Bearer");
  });
});
