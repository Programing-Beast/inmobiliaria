import type { UserRole } from "@/lib/database.types";
import { setUserRoles, updateUserProfile } from "@/lib/supabase";

const DEFAULT_BASE_URL = "https://desarrollo.app.kove.com.py/ords/inmobiliaria_view/portal";

const portalBaseUrl = import.meta.env.VITE_PORTAL_API_BASE_URL || DEFAULT_BASE_URL;
const dashboardIncidentsPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_INCIDENTS_PATH || "dashboard/incidencias";
const dashboardExpensasPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_EXPENSAS_PATH || "dashboard/expensas";
const dashboardReservationsPath =
  import.meta.env.VITE_PORTAL_DASHBOARD_RESERVAS_PATH || "dashboard/reservas";
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

type PortalError = {
  message: string;
  status?: number;
  details?: string;
};

type PortalResponse<T> = {
  data: T | null;
  error: PortalError | null;
};

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(path, portalBaseUrl.endsWith("/") ? portalBaseUrl : `${portalBaseUrl}/`);
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

const getPortalAuth = () => {
  const token = localStorage.getItem(portalTokenKey);
  const tokenType = localStorage.getItem(portalTokenTypeKey) || "Bearer";
  if (!token) return null;
  return { token, tokenType };
};

const getPortalAuthEmail = () => localStorage.getItem(portalAuthEmailKey) || undefined;

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

export const setPortalAuth = (token: string, tokenType: string = "Bearer") => {
  localStorage.setItem(portalTokenKey, token);
  localStorage.setItem(portalTokenTypeKey, tokenType);
};

export const clearPortalAuth = () => {
  localStorage.removeItem(portalTokenKey);
  localStorage.removeItem(portalTokenTypeKey);
  localStorage.removeItem(portalRoleKey);
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
  let auth = getPortalAuth();
  if (!auth && path !== "auth/login") {
    const email = getPortalAuthEmail();
    if (email) {
      await portalLogin(email);
      auth = getPortalAuth();
    }
  }
  if (!auth && path !== "auth/login") {
    return { data: null, error: { message: "Missing portal auth token" } };
  }
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    requestHeaders.Authorization = `${auth.tokenType} ${auth.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.status === "error") {
      return { data: null, error: normalizePortalError(payload, response.status) };
    }

    return { data: payload as T, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error?.message || "Network error" } };
  }
};

export const portalLogin = async (email: string) => {
  const result = await portalRequest<{
    status: number;
    message: string;
    data: { rol: string; token: string; tokenType: string };
  }>("auth/login", { method: "POST", body: { correo: email } });

  if (!result.error && result.data?.data?.token) {
    setPortalAuth(result.data.data.token, result.data.data.tokenType);
    if (result.data.data.rol) {
      localStorage.setItem(portalRoleKey, result.data.data.rol);
      await syncPortalRoleToLocalUser(result.data.data.rol);
    }
  }

  return result;
};

export const ensurePortalAuth = async (email?: string) => {
  const auth = getPortalAuth();
  if (auth) return { token: auth.token, error: null };
  if (!email) {
    return { token: null, error: { message: "Missing portal auth token" } };
  }

  const loginResult = await portalLogin(email);
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
  idUnidad: number | string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  idQuincho?: number | string;
}) => portalRequest("incidencias", { method: "POST", body: payload });

export const portalUpdateIncident = (
  incidentId: number | string,
  payload: {
    titulo?: string;
    descripcion?: string;
    prioridad?: string;
    estado?: string;
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

export const portalGetApprovalsReservations = (params?: { page?: number; limit?: number }) =>
  portalRequest(approvalsReservationsPath, { params });

export const portalApproveReservation = (reservationId: number | string) =>
  portalRequest(`${approvalsReservationsPath}/${reservationId}`, { method: "PUT" });
