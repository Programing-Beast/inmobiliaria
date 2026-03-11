import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mockEnsurePortalAuth = vi.hoisted(() => vi.fn());
const mockPortalGetAmenityAvailability = vi.hoisted(() => vi.fn());
const mockPortalCreateReservation = vi.hoisted(() => vi.fn());
const mockCreateReservation = vi.hoisted(() => vi.fn());
const mockGetAmenityPortalId = vi.hoisted(() => vi.fn());
const mockGetUserPrimaryUnit = vi.hoisted(() => vi.fn());
const mockGetUserProfile = vi.hoisted(() => vi.fn());
const mockGetUnitPortalId = vi.hoisted(() => vi.fn());
const mockUpdateReservationPortalId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/portal-api", () => ({
  ensurePortalAuth: mockEnsurePortalAuth,
  portalCreateAuthUsuario: vi.fn(),
  portalCreateIncident: vi.fn(),
  portalCreateReservation: mockPortalCreateReservation,
  portalApproveReservation: vi.fn(),
  portalGetAmenityAvailability: mockPortalGetAmenityAvailability,
  portalGetAmenities: vi.fn(),
  portalGetProperties: vi.fn(),
  portalGetUnits: vi.fn(),
  portalUpdateIncident: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createIncident: vi.fn(),
  createReservation: mockCreateReservation,
  createAmenity: vi.fn(),
  createBuilding: vi.fn(),
  createUnit: vi.fn(),
  getAmenityPortalId: mockGetAmenityPortalId,
  getAmenityByNameInBuilding: vi.fn(),
  getAmenityByPortalId: vi.fn(),
  getBuildingPortalId: vi.fn(),
  getBuildingByName: vi.fn(),
  getBuildingByPortalId: vi.fn(),
  getUserPrimaryUnit: mockGetUserPrimaryUnit,
  getUserProfile: mockGetUserProfile,
  getUnitPortalId: mockGetUnitPortalId,
  getUnitByNumberInBuilding: vi.fn(),
  getUnitByPortalId: vi.fn(),
  updateIncident: vi.fn(),
  updateIncidentPortalId: vi.fn(),
  updateAmenity: vi.fn(),
  updateBuilding: vi.fn(),
  updateReservationPortalId: mockUpdateReservationPortalId,
  updateReservationStatus: vi.fn(),
  updateUnit: vi.fn(),
}));

vi.unmock("@/lib/portal-sync");

let createReservationSynced: typeof import("@/lib/portal-sync").createReservationSynced;

beforeAll(async () => {
  ({ createReservationSynced } = await import("@/lib/portal-sync"));
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  localStorage.setItem("userRoles", JSON.stringify(["owner"]));

  mockEnsurePortalAuth.mockResolvedValue({ token: "portal-token", error: null });
  mockPortalGetAmenityAvailability.mockResolvedValue({
    data: { data: [{ horaInicio: "10:00", horaFin: "12:00" }] },
    error: null,
  });
  mockPortalCreateReservation.mockResolvedValue({
    data: { data: { idReserva: 321 } },
    error: null,
  });
  mockCreateReservation.mockResolvedValue({
    reservation: { id: "reservation-1" },
    error: null,
  });
  mockGetAmenityPortalId.mockResolvedValue(202);
  mockGetUserPrimaryUnit.mockResolvedValue({ primaryUnitId: "unit-1", error: null });
  mockGetUserProfile.mockResolvedValue({
    profile: { id: "user-1", unit_id: "unit-1" },
    error: null,
  });
  mockGetUnitPortalId.mockResolvedValue(101);
  mockUpdateReservationPortalId.mockResolvedValue({ error: null });
});

const buildParams = () => ({
  email: "user@example.com",
  portalFields: {
    razonSocial: "Test User",
    cantidadPersonas: 2,
    correo: "user@example.com",
    celular: "123456789",
  },
  localPayload: {
    userId: "user-1",
    amenityId: "amenity-1",
    unitId: "unit-1",
    reservationDate: "2026-03-20",
    startTime: "10:00",
    endTime: "11:00",
  },
});

describe("createReservationSynced", () => {
  it("blocks reservation creation when the selected date has no available slots", async () => {
    mockPortalGetAmenityAvailability.mockResolvedValue({
      data: { data: [] },
      error: null,
    });

    const result = await createReservationSynced(buildParams());

    expect(result.error).toMatchObject({
      message: "No hay horarios disponibles para esta fecha",
    });
    expect(mockPortalCreateReservation).not.toHaveBeenCalled();
    expect(mockCreateReservation).not.toHaveBeenCalled();
  });

  it("blocks reservation creation when the selected time is outside the available slot", async () => {
    mockPortalGetAmenityAvailability.mockResolvedValue({
      data: { data: [{ horaInicio: "08:00", horaFin: "09:00" }] },
      error: null,
    });

    const result = await createReservationSynced({
      ...buildParams(),
      localPayload: {
        ...buildParams().localPayload,
        startTime: "10:00",
        endTime: "11:00",
      },
    });

    expect(result.error).toMatchObject({
      message: "El horario seleccionado no esta disponible",
    });
    expect(mockPortalCreateReservation).not.toHaveBeenCalled();
    expect(mockCreateReservation).not.toHaveBeenCalled();
  });

  it("preserves queued local creation when portal auth is unavailable", async () => {
    mockEnsurePortalAuth.mockResolvedValue({
      token: null,
      error: { message: "Missing portal auth token" },
    });

    const result = await createReservationSynced(buildParams());

    expect(result.error).toBeNull();
    expect(result.queued).toBe(true);
    expect(mockPortalGetAmenityAvailability).not.toHaveBeenCalled();
    expect(mockCreateReservation).toHaveBeenCalledOnce();
  });
});
