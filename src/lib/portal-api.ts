import type { UserRole } from "@/lib/database.types";
import { setUserRoles, updateUserProfile } from "@/lib/supabase";

const DEFAULT_BASE_URL = "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal";

const portalBaseUrl = import.meta.env.VITE_PORTAL_API_BASE_URL || DEFAULT_BASE_URL;
const apexApiUser = import.meta.env.VITE_APEX_API_USER;
const apexApiPassword = import.meta.env.VITE_APEX_API_PASSWORD;
const dashboardIncidentsPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_INCIDENTS_PATH || "dashboard/incidencias";
const dashboardExpensasPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_EXPENSAS_PATH || "dashboard/expensas";
const dashboardReservationsPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_RESERVAS_PATH || "dashboard/reservas";
const apexAuthToken =
  apexApiUser && apexApiPassword ? btoa(`${apexApiUser}:${apexApiPassword}`) : "";
const dashboardComunicadosPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_COMUNICADOS_PATH || "dashboard/comunicados";
const approvalsReservationsPath =
  import.meta.env.VITE_PORTAL_APPROVALS_RESERVATIONS_PATH || "approvals/reservations";
const finanzasResumenPath =
  import.meta.env.VITE_PORTAL_FINANZAS_RESUMEN_PATH || "finanzas/resumen";
const finanzasPagosPath =
  import.meta.env.VITE_PORTAL_FINANZAS_PAGOS_PATH || "finanzas";
const finanzasPdfPath = import.meta.env.VITE_PORTAL_FINANZAS_PDF_PATH || "download/pdf";
const portalAuthEmailKey = "currentUserEmail";
const portalTokenKey = "token";
const portalTokenTypeKey = "Bearer";
const portalRoleKey = "portalRole";
const portalPropertiesKey = "userProperties";
const portalTokenOwnerEmailKey = "portalTokenOwnerEmail";
const portalTokenExpiresAtKey = "portalTokenExpiresAt";
const portalTokenIssuedAtKey = "portalTokenIssuedAt";
const portalAuthDebugKey = "portalAuthDebug";

type PortalError = {
  message: string;
  status?: number;
  details?: string;
};

type PortalResponse<T> = {
  data: T | null;
  error: PortalError | null;
};

type PortalAuth = {
  token: string;
  tokenType: string;
  ownerEmail?: string;
  expiresAt: number | null;
};

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const isAbsoluteUrl = /^https?:\/\//i.test(path);
  const url = isAbsoluteUrl
    ? new URL(path)
    : new URL(path, portalBaseUrl.endsWith("/") ? portalBaseUrl : `${portalBaseUrl}/`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const buildPaginationHeaders = (params?: { page?: number; limit?: number }) => {
  const headers: Record<string, string> = {};
  if (params?.page) {
    headers.page = String(params.page);
  }
  if (params?.limit) {
    headers.limit = String(params.limit);
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
};

const normalizePortalList = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
};

const getPortalNextLink = (payload: any): string | null => {
  const nextLink = payload?.links?.next ?? payload?.next;
  return typeof nextLink === "string" && nextLink.trim() ? nextLink.trim() : null;
};

const getPortalNextPageParams = (
  payload: any,
  baseParams?: Record<string, string | number | undefined>,
  limit?: number
) => {
  const currentPage = Number(payload?.page);
  const totalPages = Number(payload?.total_pages);
  const hasMore = payload?.has_more === true;

  if (!Number.isFinite(currentPage)) {
    return null;
  }

  if (Number.isFinite(totalPages) && currentPage >= totalPages) {
    return null;
  }

  if (!hasMore && !Number.isFinite(totalPages)) {
    return null;
  }

  return {
    ...(baseParams || {}),
    page: currentPage + 1,
    ...(limit !== undefined ? { limit } : {}),
  };
};

const getPortalAuth = (expectedEmailOverride?: string) => {
  const token = localStorage.getItem(portalTokenKey);
  const tokenType = localStorage.getItem(portalTokenTypeKey) || "Bearer";
  const ownerEmail = localStorage.getItem(portalTokenOwnerEmailKey) || undefined;
  if (!token) return null;

  const expiresAt = getStoredPortalTokenExpiry(token);
  const normalizedOwnerEmail = ownerEmail?.trim().toLowerCase();
  const expectedEmail = expectedEmailOverride?.trim().toLowerCase() || getPortalAuthEmail()?.trim().toLowerCase();

  if (!normalizedOwnerEmail && expectedEmail) {
    debugPortalAuth("Discarding legacy token without owner binding", {
      expectedEmail,
      auth: getPortalAuthDebugState(expectedEmail),
    });
    clearPortalAuth();
    return null;
  }

  if (normalizedOwnerEmail && expectedEmail && normalizedOwnerEmail !== expectedEmail) {
    debugPortalAuth("Discarding token for different user", {
      ownerEmail: normalizedOwnerEmail,
      expectedEmail,
      auth: getPortalAuthDebugState(expectedEmail),
    });
    clearPortalAuth();
    return null;
  }

  if (expiresAt && expiresAt <= Date.now()) {
    debugPortalAuth("Discarding expired token", getPortalAuthDebugState(expectedEmail));
    clearPortalAuth();
    return null;
  }

  return {
    token,
    tokenType,
    ownerEmail: normalizedOwnerEmail,
    expiresAt,
  };
};

const getPortalAuthEmail = () => localStorage.getItem(portalAuthEmailKey) || undefined;

const shouldDebugPortalAuth = () => {
  try {
    return import.meta.env.DEV || localStorage.getItem(portalAuthDebugKey) === "1";
  } catch {
    return false;
  }
};

const debugPortalAuth = (message: string, details?: Record<string, unknown>) => {
  if (!shouldDebugPortalAuth()) return;
  if (details) {
    console.debug(`[portal auth] ${message}`, details);
    return;
  }
  console.debug(`[portal auth] ${message}`);
};

const maskPortalToken = (token?: string | null) => {
  if (!token) return null;
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
};

const encodeBase64 = (value: string) => {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64");
  }

  throw new Error("No base64 encoder available");
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  throw new Error("No base64 decoder available");
};

const parseJwtExpiry = (token: string): number | null => {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const decoded = JSON.parse(decodeBase64Url(payload));
    const exp = Number(decoded?.exp);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const getStoredPortalTokenExpiry = (token?: string | null) => {
  const stored = Number(localStorage.getItem(portalTokenExpiresAtKey));
  if (Number.isFinite(stored) && stored > 0) {
    return stored;
  }

  const parsed = token ? parseJwtExpiry(token) : null;
  if (parsed) {
    localStorage.setItem(portalTokenExpiresAtKey, String(parsed));
  }
  return parsed;
};

export const getPortalAuthDebugState = (expectedEmail?: string) => {
  const token = localStorage.getItem(portalTokenKey);
  const ownerEmail = localStorage.getItem(portalTokenOwnerEmailKey) || undefined;
  const tokenType = localStorage.getItem(portalTokenTypeKey) || "Bearer";
  const expiresAt = getStoredPortalTokenExpiry(token);
  const now = Date.now();

  return {
    hasToken: Boolean(token),
    tokenType,
    tokenPreview: maskPortalToken(token),
    tokenLength: token?.length || 0,
    ownerEmail,
    expectedEmail: expectedEmail || getPortalAuthEmail(),
    expiresAt,
    expiresAtIso: expiresAt ? new Date(expiresAt).toISOString() : null,
    isExpired: expiresAt ? expiresAt <= now : null,
    issuedAt: localStorage.getItem(portalTokenIssuedAtKey),
  };
};

const mapPortalRoleToLocalRole = (role?: string | null): UserRole | null => {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  if (["super_admin", "superadmin", "admin", "administrador", "administrator"].includes(normalized)) {
    return "super_admin";
  }
  if (["owner", "propietario", "dueno"].includes(normalized)) {
    return "owner";
  }
  if (["tenant", "inquilino", "arrendatario"].includes(normalized)) {
    return "tenant";
  }
  if (["regular_user", "resident", "residente", "usuario"].includes(normalized)) {
    return "regular_user";
  }
  return null;
};

const syncPortalRoleToLocalUser = async (portalRole?: string | null) => {
  const mappedRole = mapPortalRoleToLocalRole(portalRole);
  if (!mappedRole) return;

  const userId = localStorage.getItem("currentUserId");
  if (!userId) return;

  await updateUserProfile(userId, { role: mappedRole });
  await setUserRoles(userId, [mappedRole]);
  localStorage.setItem("userRole", mappedRole);
  localStorage.setItem("userRoles", JSON.stringify([mappedRole]));
};

export const setPortalAuth = (token: string, tokenType: string = "Bearer", ownerEmail?: string) => {
  localStorage.setItem(portalTokenKey, token);
  localStorage.setItem(portalTokenTypeKey, tokenType || "Bearer");
  if (ownerEmail) {
    localStorage.setItem(portalTokenOwnerEmailKey, ownerEmail.trim().toLowerCase());
  } else {
    localStorage.removeItem(portalTokenOwnerEmailKey);
  }

  const expiresAt = parseJwtExpiry(token);
  if (expiresAt) {
    localStorage.setItem(portalTokenExpiresAtKey, String(expiresAt));
  } else {
    localStorage.removeItem(portalTokenExpiresAtKey);
  }
  localStorage.setItem(portalTokenIssuedAtKey, new Date().toISOString());

  debugPortalAuth("Stored portal token", getPortalAuthDebugState(ownerEmail));
};

export const clearPortalAuth = () => {
  localStorage.removeItem(portalTokenKey);
  localStorage.removeItem(portalTokenTypeKey);
  localStorage.removeItem(portalRoleKey);
  localStorage.removeItem(portalPropertiesKey);
  localStorage.removeItem(portalTokenOwnerEmailKey);
  localStorage.removeItem(portalTokenExpiresAtKey);
  localStorage.removeItem(portalTokenIssuedAtKey);
};

const normalizePortalError = (payload: any, status?: number): PortalError => {
  if (payload?.error?.message) {
    return {
      message: payload.error.message,
      status: payload.error.code || status,
      details: payload.error.description,
    };
  }
  if (payload?.message) {
    return { message: payload.message, status };
  }
  if (status === 404) {
    return { message: "No record found", status };
  }
  return { message: "Unexpected portal API error", status };
};

const isPortalAuthFailure = (status?: number, payload?: any) => {
  if (status === 401 || status === 403) {
    return true;
  }

  const text = `${payload?.message || ""} ${payload?.error?.message || ""} ${payload?.error?.description || ""}`
    .toLowerCase()
    .trim();

  if (!text) return false;

  const authTerms = ["token", "jwt", "bearer", "authorization", "autoriz"];
  const failureTerms = ["expired", "expir", "invalid", "invalido", "missing", "falt", "unauthorized", "forbidden"];

  return authTerms.some((term) => text.includes(term)) && failureTerms.some((term) => text.includes(term));
};

const portalRequest = async <T>(
  path: string,
  options?: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    params?: Record<string, string | number | undefined>;
  }
): Promise<PortalResponse<T>> => {
  const { method = "GET", body, headers, params } = options || {};
  const url = buildUrl(path, params);
  const email = getPortalAuthEmail();
  const buildRequestHeaders = (auth?: PortalAuth | null) => {
    const requestHeaders: Record<string, string> = {
      Accept: "application/json",
      ...headers,
    };

    const isAuthEndpoint = path.startsWith("auth/");

    if (isAuthEndpoint && apexAuthToken) {
      requestHeaders.Authorization = `Basic ${apexAuthToken}`;
    }

    if (email && !isAuthEndpoint && !requestHeaders.correo) {
      requestHeaders.correo = email;
    }

    if (body) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (auth && !isAuthEndpoint) {
      requestHeaders.Authorization = `${auth.tokenType} ${auth.token}`;
    }

    return requestHeaders;
  };

  const executeRequest = async (auth?: PortalAuth | null) => {
    const requestHeaders = buildRequestHeaders(auth);
    debugPortalAuth("Portal request", {
      method,
      path,
      url,
      email,
      hasAuthorization: Boolean(requestHeaders.Authorization),
      authorizationPreview: requestHeaders.Authorization
        ? `${auth?.tokenType || "Bearer"} ${maskPortalToken(auth?.token)}`
        : null,
    });

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  };

  let auth: PortalAuth | null = null;
  const isPublicAuthEndpoint = path.startsWith("auth/") && path !== "auth/change-password";

  if (!isPublicAuthEndpoint) {
    const authResult = await ensurePortalAuth(email, { reason: `request:${path}` });
    if (authResult.error) {
      return { data: null, error: authResult.error };
    }
    auth = getPortalAuth(email);
    if (!auth) {
      return { data: null, error: { message: "Missing portal auth token" } };
    }
  }

  try {
    let { response, payload } = await executeRequest(auth);

    if (path !== "auth/login" && email && isPortalAuthFailure(response.status, payload)) {
      debugPortalAuth("Portal request rejected auth, refreshing token", {
        path,
        status: response.status,
        message: payload?.message || payload?.error?.message || null,
        auth: getPortalAuthDebugState(email),
      });
      clearPortalAuth();
      const loginResult = await portalLogin(email, undefined, { reason: `retry:${path}` });
      const refreshedAuth = getPortalAuth(email);
      if (loginResult.error || !refreshedAuth) {
        return {
          data: null,
          error: loginResult.error || normalizePortalError(payload, response.status),
        };
      }

      ({ response, payload } = await executeRequest(refreshedAuth));
    }

    if (!response.ok || payload?.status === "error") {
      return { data: null, error: normalizePortalError(payload, response.status) };
    }

    return { data: payload as T, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error?.message || "Network error" } };
  }
};

export const portalLogin = async (email: string, password?: string, options?: { reason?: string }) => {
  debugPortalAuth("Portal login requested", { email, reason: options?.reason || "direct" });

  const result = await portalRequest<{
    status: number;
    message: string;
    data: {
      propiedades: { idPropiedad: number; nombre: string }[];
      rol: string;
      token: string;
      tokenType: string;
    };
  }>("auth/login", { method: "POST", body: { correo: email, password } });

  if (!result.error && result.data?.data?.token) {
    setPortalAuth(result.data.data.token, result.data.data.tokenType, email);
    if (result.data.data.rol) {
      localStorage.setItem(portalRoleKey, result.data.data.rol);
      await syncPortalRoleToLocalUser(result.data.data.rol);
    }
    if (result.data.data.propiedades) {
      localStorage.setItem(portalPropertiesKey, JSON.stringify(result.data.data.propiedades));
    }
    debugPortalAuth("Portal login succeeded", {
      email,
      auth: getPortalAuthDebugState(email),
    });
  } else {
    debugPortalAuth("Portal login failed", {
      email,
      reason: options?.reason || "direct",
      error: result.error,
    });
  }

  return result;
};
export const portalRegister = async (payload: { nombreCompleto: string; correo: string; password: string }) => {
  return portalRequest<{
    status: number;
    message: string;
    data: { idUsuario: number };
  }>("auth/register", { method: "POST", body: payload });
};

export const portalForgotPassword = async (email: string) => {
  return portalRequest<{
    status: number;
    message: string;
  }>("auth/forgot-password", { method: "POST", body: { email } });
};

export const portalResetPassword = async (payload: { token: string; newPassword: string }) => {
  return portalRequest<{
    status: number;
    message: string;
  }>("auth/reset-password", { method: "POST", body: payload });
};

export const portalChangePassword = async (payload: { oldPassword: string; newPassword: string }) => {
  return portalRequest<{
    status: number;
    message: string;
  }>("auth/change-password", { method: "POST", body: payload });
};

export const ensurePortalAuth = async (email?: string, options?: { reason?: string; forceRefresh?: boolean; password?: string }) => {
  if (options?.forceRefresh) {
    clearPortalAuth();
  }

  const auth = getPortalAuth(email);
  if (auth) return { token: auth.token, error: null };
  if (!email) {
    return { token: null, error: { message: "Missing portal auth token" } };
  }

  const loginResult = await portalLogin(email, options?.password, { reason: options?.reason || "ensure" });
  if (loginResult.error || !loginResult.data?.data?.token) {
    return { token: null, error: loginResult.error || { message: "Portal login failed" } };
  }
  return { token: loginResult.data.data.token, error: null };
};

export const portalGetProperties = (params?: { page?: number; limit?: number }) =>
  portalRequest("mis-propiedades", { headers: buildPaginationHeaders(params) });

export const portalGetMyProperties = (params?: { page?: number; limit?: number }) =>
  portalRequest("mis-propiedades", { headers: buildPaginationHeaders(params) });

export const portalGetUnits = (propertyId: number | string, params?: { page?: number; limit?: number }) =>
  portalRequest(`unidades/${propertyId}`, { headers: buildPaginationHeaders(params) });

export const portalGetAmenities = (propertyId: number | string, params?: { page?: number; limit?: number }) =>
  portalRequest(`amenity/${propertyId}`, { headers: buildPaginationHeaders(params) });

export const portalGetAllPages = async <T>(
  path: string,
  options?: {
    params?: Record<string, string | number | undefined>;
    headers?: Record<string, string>;
    limit?: number;
    maxPages?: number;
  }
): Promise<PortalResponse<T[]>> => {
  const limit = options?.limit ?? 200;
  const maxPages = options?.maxPages ?? 50;
  const collected: T[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await portalRequest<any>(path, {
      params: options?.params,
      headers: {
        ...options?.headers,
        ...buildPaginationHeaders({ page, limit }),
      },
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    const items = normalizePortalList(result.data) as T[];
    if (items.length === 0) break;
    collected.push(...items);

    if (items.length < limit) break;
  }

  return { data: collected, error: null };
};

export const portalGetAllMyProperties = (params?: { limit?: number; maxPages?: number }) =>
  portalGetAllPages("mis-propiedades", { limit: params?.limit, maxPages: params?.maxPages });

export const portalGetAllUnits = (
  propertyId: number | string,
  params?: { limit?: number; maxPages?: number }
) => portalGetAllPages(`unidades/${propertyId}`, { limit: params?.limit, maxPages: params?.maxPages });

export const portalGetAllAmenities = (
  propertyId: number | string,
  params?: { limit?: number; maxPages?: number }
) => portalGetAllPages(`amenity/${propertyId}`, { limit: params?.limit, maxPages: params?.maxPages });

export const portalGetAmenityInfo = (amenityId: number | string) =>
  portalRequest(`reservas/amenities/${amenityId}/info`);

export const portalGetAmenityAvailability = (
  amenityId: number | string,
  params: { fecha: string; slot_min?: string; start?: string }
) => portalRequest(`reservas/amenities/${amenityId}/availability`, { params });

export const portalCreateReservation = (payload: {
  razonSocial: string;
  idUnidad: number | string;
  cantidadPersonas: number;
  idQuincho: number | string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  correo: string;
  celular: string;
  observacion?: string;
}) => portalRequest("reservas", { method: "POST", body: payload });

export const portalCreateIncident = (payload: {
  idPropiedad: number | string;
  idUnidad?: number | string | null;
  titulo: string;
  descripcion: string;
}) => portalRequest("incidencias", { method: "POST", body: payload });

export const portalUpdateIncident = (
  incidentId: number | string,
  payload: {
    titulo?: string;
    descripcion?: string;
  }
) => portalRequest(`incidencias/${incidentId}`, { method: "PUT", body: payload });

export const portalCreateAuthUsuario = (payload: Record<string, unknown>) =>
  portalRequest("auth/usuarios", { method: "POST", body: payload });

export const portalGetDashboardIncidents = (params?: {
  estado?: string;
  titulo?: string;
  page?: number;
  limit?: number;
}) => portalRequest(dashboardIncidentsPath, { params });

export const portalGetAllDashboardIncidents = async <T = any>(params?: {
  estado?: string;
  titulo?: string;
  page?: number;
  limit?: number;
  maxPages?: number;
}): Promise<PortalResponse<T[]>> => {
  const maxPages = params?.maxPages ?? 50;
  const baseParams = {
    estado: params?.estado,
    titulo: params?.titulo,
  };
  const collected: T[] = [];
  const visitedLinks = new Set<string>();
  let nextPath: string | null = dashboardIncidentsPath;
  let nextParams: Record<string, string | number | undefined> | undefined = {
    ...baseParams,
    page: params?.page ?? 1,
    ...(params?.limit !== undefined ? { limit: params.limit } : {}),
  };

  for (let requestCount = 0; requestCount < maxPages && nextPath; requestCount += 1) {
    const result = await portalRequest<any>(nextPath, { params: nextParams });
    if (result.error) {
      return { data: null, error: result.error };
    }

    collected.push(...(normalizePortalList(result.data) as T[]));

    const nextLink = getPortalNextLink(result.data);
    if (nextLink) {
      if (visitedLinks.has(nextLink)) {
        break;
      }
      visitedLinks.add(nextLink);
      nextPath = nextLink;
      nextParams = undefined;
      continue;
    }

    const fallbackParams = getPortalNextPageParams(result.data, baseParams, params?.limit);
    if (!fallbackParams) {
      break;
    }

    nextPath = dashboardIncidentsPath;
    nextParams = fallbackParams;
  }

  return { data: collected, error: null };
};

export const portalGetDashboardExpensas = (params?: { page?: number; limit?: number }) =>
  portalRequest(dashboardExpensasPath, { params });

export const portalGetDashboardReservations = (params?: { page?: number; limit?: number }) =>
  portalRequest(dashboardReservationsPath, { params });

export const portalGetDashboardComunicados = (params?: { page?: number; limit?: number }) =>
  portalRequest(dashboardComunicadosPath, { params });

export const portalGetComunicado = (comunicadoId: number | string) =>
  portalRequest(`comunicados/${comunicadoId}`);

export const portalGetFinanzasResumen = (params?: {
  page?: number;
  limit?: number;
  correo?: string;
}) => portalRequest(finanzasResumenPath, { params });

export const portalGetFinanzasPagos = (params?: {
  page?: number;
  limit?: number;
  correo?: string;
}) => portalRequest(finanzasPagosPath, { params });

export const portalGetFinanzasPdfUrl = (
  companyId: number | string,
  invoiceId: number | string
) => buildUrl(`${finanzasPdfPath}/${companyId}/${invoiceId}`);

export const portalDownloadFinanzasPdf = async (
  companyId: number | string,
  invoiceId: number | string,
  email?: string
): Promise<{ blob: Blob | null; error: PortalError | null }> => {
  const url = buildUrl(`${finanzasPdfPath}/${companyId}/${invoiceId}`);

  try {
    const authResult = await ensurePortalAuth(email, { reason: "download:finanzas-pdf" });
    if (authResult.error) {
      return { blob: null, error: authResult.error };
    }

    let auth = getPortalAuth(email);
    if (!auth) {
      return { blob: null, error: { message: "Missing portal auth token" } };
    }

    const buildHeaders = (currentAuth: PortalAuth) => ({
      Accept: "application/pdf",
      Authorization: `${currentAuth.tokenType} ${currentAuth.token}`,
    });

    let response = await fetch(url, { method: "GET", headers: buildHeaders(auth) });
    if ((response.status === 401 || response.status === 403) && email) {
      debugPortalAuth("PDF download rejected auth, refreshing token", {
        path: `${finanzasPdfPath}/${companyId}/${invoiceId}`,
        email,
        status: response.status,
        auth: getPortalAuthDebugState(email),
      });
      clearPortalAuth();
      const loginResult = await portalLogin(email, undefined, { reason: "retry:download:finanzas-pdf" });
      auth = getPortalAuth(email);
      if (loginResult.error || !auth) {
        return { blob: null, error: loginResult.error || { message: "Portal login failed" } };
      }
      response = await fetch(url, { method: "GET", headers: buildHeaders(auth) });
    }

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = await response.json().catch(() => ({}));
        return { blob: null, error: normalizePortalError(payload, response.status) };
      }
      const message = await response.text().catch(() => "");
      return {
        blob: null,
        error: { message: message || "Failed to download PDF", status: response.status },
      };
    }

    const blob = await response.blob();
    return { blob, error: null };
  } catch (error: any) {
    return { blob: null, error: { message: error?.message || "Network error" } };
  }
};

export const portalGetApprovalsReservations = (params?: { page?: number; limit?: number }) =>
  portalRequest(approvalsReservationsPath, { params });

export const portalApproveReservation = (reservationId: number | string) =>
  portalRequest(`${approvalsReservationsPath}/${reservationId}`, { method: "PUT" });
