import {
  ensurePortalAuth,
  portalCreateAuthUsuario,
  portalCreateIncident,
  portalCreateReservation,
  portalApproveReservation,
  portalGetAmenities,
  portalGetProperties,
  portalGetUnits,
  portalUpdateIncident,
} from "@/lib/portal-api";
import {
  createIncident,
  createReservation,
  createAmenity,
  createBuilding,
  createUnit,
  getAmenityPortalId,
  getAmenityByNameInBuilding,
  getAmenityByPortalId,
  getBuildingPortalId,
  getBuildingByName,
  getBuildingByPortalId,
  getUserPrimaryUnit,
  getUserProfile,
  getUnitPortalId,
  getUnitByNumberInBuilding,
  getUnitByPortalId,
  updateIncident,
  updateIncidentPortalId,
  updateAmenity,
  updateBuilding,
  updateReservationPortalId,
  updateReservationStatus,
  updateUnit,
} from "@/lib/supabase";

type SyncJobType =
  | "reservation"
  | "incident"
  | "incident_update"
  | "approval_reservation"
  | "auth_usuario"
  | "local_reservation"
  | "local_incident"
  | "local_incident_update"
  | "local_reservation_status";

type SyncJob = {
  id: string;
  type: SyncJobType;
  payload: Record<string, unknown>;
  localPayload?: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

const queueKey = "portalSyncQueue";

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sync_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const loadQueue = (): SyncJob[] => {
  try {
    const raw = localStorage.getItem(queueKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQueue = (queue: SyncJob[]) => {
  localStorage.setItem(queueKey, JSON.stringify(queue));
};

export const enqueueSyncJob = (job: Omit<SyncJob, "id" | "createdAt" | "attempts">) => {
  const queue = loadQueue();
  queue.push({
    ...job,
    id: generateId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  saveQueue(queue);
};

export const getSyncQueue = () => loadQueue();

const markJobAttempt = (job: SyncJob, error?: string) => ({
  ...job,
  attempts: job.attempts + 1,
  lastError: error,
});

export const retrySyncQueue = async (email?: string) => {
  const queue = loadQueue();
  if (queue.length === 0) return { processed: 0, remaining: 0 };

  await ensurePortalAuth(email);

  const remaining: SyncJob[] = [];
  let processed = 0;

  for (const job of queue) {
    processed += 1;
    const result = await runSyncJob(job);
    if (result.error) {
      remaining.push(markJobAttempt(job, result.error.message));
    }
  }

  saveQueue(remaining);
  return { processed, remaining: remaining.length };
};

const runSyncJob = async (job: SyncJob) => {
  switch (job.type) {
    case "reservation":
      return portalCreateReservation(job.payload as any);
    case "incident":
      return portalCreateIncident(job.payload as any);
    case "incident_update": {
      const incidentId = job.payload?.incidentId as string | number | undefined;
      if (!incidentId) return { data: null, error: { message: "Missing incidentId" } };
      const { incidentId: _unused, ...body } = job.payload;
      return portalUpdateIncident(incidentId, body as any);
    }
    case "approval_reservation": {
      const reservationId = job.payload?.reservationId as string | number | undefined;
      if (!reservationId) return { data: null, error: { message: "Missing reservationId" } };
      return portalApproveReservation(reservationId);
    }
    case "auth_usuario":
      return portalCreateAuthUsuario(job.payload);
    case "local_reservation": {
      const local = job.localPayload as any;
      return createReservation(
        local.userId,
        local.amenityId,
        local.reservationDate,
        local.startTime,
        local.endTime,
        local.notes,
        local.portalId
      );
    }
    case "local_incident": {
      const local = job.localPayload as any;
      return createIncident(
        local.userId,
        local.buildingId,
        local.type,
        local.title,
        local.description,
        local.location,
        local.priority,
        local.portalId
      );
    }
    case "local_incident_update": {
      const local = job.localPayload as any;
      if (!local?.incidentId) return { data: null, error: { message: "Missing incidentId" } };
      return updateIncident(local.incidentId, local.updates || {});
    }
    case "local_reservation_status": {
      const local = job.localPayload as any;
      if (!local?.reservationId || !local?.status) {
        return { data: null, error: { message: "Missing reservation status data" } };
      }
      return updateReservationStatus(local.reservationId, local.status);
    }
    default:
      return { data: null, error: { message: "Unsupported sync job" } };
  }
};

const toPortalList = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
};

const readString = (record: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
};

const readNumber = (record: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = record?.[key];
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
  }
  return null;
};

const readBoolean = (record: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["1", "true", "si", "yes"].includes(normalized)) return true;
      if (["0", "false", "no"].includes(normalized)) return false;
    }
  }
  return undefined;
};

const normalizeRole = (role?: string | null) => (role || "").trim().toLowerCase();

const getCurrentUserRoles = (): string[] => {
  const storedRoles = localStorage.getItem("userRoles");
  if (storedRoles) {
    try {
      const parsed = JSON.parse(storedRoles);
      if (Array.isArray(parsed)) {
        return parsed.map((role) => normalizeRole(role)).filter(Boolean);
      }
    } catch {
      // Ignore malformed roles data
    }
  }
  const fallbackRole = normalizeRole(localStorage.getItem("userRole"));
  return fallbackRole ? [fallbackRole] : [];
};

const userHasAnyRole = (allowedRoles: string[]) => {
  const roles = getCurrentUserRoles();
  if (!roles.length) return false;
  return allowedRoles.some((role) => roles.includes(normalizeRole(role)));
};

const resolveAssignedUnitId = async (userId: string) => {
  const { primaryUnitId, error: primaryError } = await getUserPrimaryUnit(userId);
  if (primaryError) return { unitId: null, error: primaryError };
  if (primaryUnitId) return { unitId: primaryUnitId, error: null };

  const { profile, error: profileError } = await getUserProfile(userId);
  if (profileError) return { unitId: null, error: profileError };
  return { unitId: profile?.unit_id || null, error: null };
};

export const syncPortalCatalog = async (params?: {
  email?: string;
  properties?: any[];
  includeUnits?: boolean;
  includeAmenities?: boolean;
}) => {
  const authResult = await ensurePortalAuth(params?.email);
  if (authResult.error) {
    return { error: authResult.error, synced: { buildings: 0, units: 0, amenities: 0 }, errors: [] as string[] };
  }

  const includeUnits = params?.includeUnits !== false;
  const includeAmenities = params?.includeAmenities !== false;
  let propertiesPayload = params?.properties;

  if (!propertiesPayload) {
    const propertiesResult = await portalGetProperties();
    if (propertiesResult.error) {
      return {
        error: propertiesResult.error,
        synced: { buildings: 0, units: 0, amenities: 0 },
        errors: [propertiesResult.error.message],
      };
    }
    propertiesPayload = propertiesResult.data;
  }

  const properties = toPortalList(propertiesPayload);
  const errors: string[] = [];
  let syncedBuildings = 0;
  let syncedUnits = 0;
  let syncedAmenities = 0;

  for (const property of properties) {
    const propertyPortalId = readNumber(property, [
      "idPropiedad",
      "id_propiedad",
      "propiedadId",
      "propiedad_id",
    ]);
    if (!propertyPortalId) continue;

    const name =
      readString(property, ["nombre", "name", "razonSocial", "razon_social", "propiedad"]) ||
      `Propiedad ${propertyPortalId}`;
    const address = readString(property, ["direccion", "address", "domicilio", "ubicacion"]) || null;

    const existingBuilding = await getBuildingByPortalId(propertyPortalId);
    let localBuildingId = existingBuilding.building?.id as string | undefined;

    if (existingBuilding.building) {
      const updateResult = await updateBuilding(existingBuilding.building.id, {
        name,
        address,
        portal_id: propertyPortalId,
      });
      if (updateResult.error) {
        errors.push(updateResult.error.message);
      } else {
        syncedBuildings += 1;
      }
    } else {
      const buildingByName = await getBuildingByName(name);
      if (buildingByName.building?.id) {
        const updateResult = await updateBuilding(buildingByName.building.id, {
          name,
          address,
          portal_id: propertyPortalId,
        });
        if (updateResult.error) {
          errors.push(updateResult.error.message);
        } else {
          localBuildingId = buildingByName.building.id;
          syncedBuildings += 1;
        }
      } else {
        const createResult = await createBuilding({ name, address, portal_id: propertyPortalId });
        if (createResult.error) {
          errors.push(createResult.error.message);
        } else {
          localBuildingId = createResult.building?.id;
          syncedBuildings += 1;
        }
      }
    }

    if (!localBuildingId) continue;

    if (includeUnits) {
      const unitsResult = await portalGetUnits(propertyPortalId);
      if (unitsResult.error) {
        if (unitsResult.error.status !== 404) {
          errors.push(unitsResult.error.message);
        }
        continue;
      }

      const units = toPortalList(unitsResult.data);
      for (const unit of units) {
        const unitPortalId = readNumber(unit, ["idUnidad", "id_unidad", "unidadId", "unidad_id"]);
        if (!unitPortalId) continue;

        const unitNumber =
          readString(unit, ["unidad", "unit_number", "numero", "numeroUnidad", "nro_unidad"]) ||
          String(unitPortalId);
        const floor = readNumber(unit, ["piso", "floor"]);
        const area = readNumber(unit, ["area", "area_sqm", "metros2", "m2"]);

        const existingUnit = await getUnitByPortalId(unitPortalId);
        if (existingUnit.unit) {
          const updateResult = await updateUnit(existingUnit.unit.id, {
            building_id: localBuildingId,
            unit_number: unitNumber,
            floor: floor ?? undefined,
            area_sqm: area ?? undefined,
            portal_id: unitPortalId,
          });
          if (updateResult.error) {
            errors.push(updateResult.error.message);
          } else {
            syncedUnits += 1;
          }
        } else {
          const unitByNumber = await getUnitByNumberInBuilding(localBuildingId, unitNumber);
          if (unitByNumber.unit?.id) {
            const updateResult = await updateUnit(unitByNumber.unit.id, {
              building_id: localBuildingId,
              unit_number: unitNumber,
              floor: floor ?? undefined,
              area_sqm: area ?? undefined,
              portal_id: unitPortalId,
            });
            if (updateResult.error) {
              errors.push(updateResult.error.message);
            } else {
              syncedUnits += 1;
            }
          } else {
            const createResult = await createUnit({
              building_id: localBuildingId,
              unit_number: unitNumber,
              floor: floor ?? undefined,
              area_sqm: area ?? undefined,
              portal_id: unitPortalId,
            });
            if (createResult.error) {
              errors.push(createResult.error.message);
            } else {
              syncedUnits += 1;
            }
          }
        }
      }
    }

    if (includeAmenities) {
      const amenitiesResult = await portalGetAmenities(propertyPortalId);
      if (amenitiesResult.error) {
        if (amenitiesResult.error.status !== 404) {
          errors.push(amenitiesResult.error.message);
        }
        continue;
      }

      const amenities = toPortalList(amenitiesResult.data);
      for (const amenity of amenities) {
        const amenityPortalId = readNumber(amenity, [
          "idAmenity",
          "idQuincho",
          "amenity_id",
          "id_amenity",
        ]);
        if (!amenityPortalId) continue;

        const nameEs = readString(amenity, ["nombre", "name", "nombre_es", "nombreEs"]) || `Amenity ${amenityPortalId}`;
        const nameEn = readString(amenity, ["name_en", "nombre_en", "nombreEn"]) || null;
        const descriptionEs = readString(amenity, ["descripcion", "description", "descripcion_es", "descripcionEs"]) || null;
        const descriptionEn = readString(amenity, ["description_en", "descripcion_en", "descripcionEn"]) || null;
        const maxCapacity = readNumber(amenity, ["capacidad", "max_capacity", "maxCapacity"]);
        const requiresApproval = readBoolean(amenity, ["requiere_aprobacion", "requires_approval", "requiresApproval"]);
        const isActive = readBoolean(amenity, ["activo", "is_active", "active", "habilitado"]);

        const existingAmenity = await getAmenityByPortalId(amenityPortalId);
        if (existingAmenity.amenity) {
          const updateResult = await updateAmenity(existingAmenity.amenity.id, {
            building_id: localBuildingId,
            portal_id: amenityPortalId,
            name_es: nameEs,
            name_en: nameEn,
            description_es: descriptionEs,
            description_en: descriptionEn,
            max_capacity: maxCapacity ?? undefined,
            requires_approval: requiresApproval,
            is_active: isActive,
          });
          if (updateResult.error) {
            errors.push(updateResult.error.message);
          } else {
            syncedAmenities += 1;
          }
        } else {
          const amenityByName = await getAmenityByNameInBuilding(localBuildingId, nameEs);
          if (amenityByName.amenity?.id) {
            const updateResult = await updateAmenity(amenityByName.amenity.id, {
              building_id: localBuildingId,
              portal_id: amenityPortalId,
              name_es: nameEs,
              name_en: nameEn,
              description_es: descriptionEs,
              description_en: descriptionEn,
              max_capacity: maxCapacity ?? undefined,
              requires_approval: requiresApproval,
              is_active: isActive,
            });
            if (updateResult.error) {
              errors.push(updateResult.error.message);
            } else {
              syncedAmenities += 1;
            }
          } else {
            const createResult = await createAmenity({
              building_id: localBuildingId,
              portal_id: amenityPortalId,
              name_es: nameEs,
              name_en: nameEn,
              description_es: descriptionEs,
              description_en: descriptionEn,
              max_capacity: maxCapacity ?? undefined,
              requires_approval: requiresApproval ?? false,
              is_active: isActive ?? true,
            });
            if (createResult.error) {
              errors.push(createResult.error.message);
            } else {
              syncedAmenities += 1;
            }
          }
        }
      }
    }
  }

  return {
    error: null,
    synced: { buildings: syncedBuildings, units: syncedUnits, amenities: syncedAmenities },
    errors,
  };
};

export const syncPortalUnitsForBuilding = async (params: {
  buildingId: string;
  unitsPayload: any;
}) => {
  const { buildingId, unitsPayload } = params;
  const units = toPortalList(unitsPayload);
  const errors: string[] = [];
  let syncedUnits = 0;

  for (const unit of units) {
    const unitPortalId = readNumber(unit, ["idUnidad", "id_unidad", "unidadId", "unidad_id"]);
    if (!unitPortalId) continue;

    const unitNumber =
      readString(unit, ["unidad", "unit_number", "numero", "numeroUnidad", "nro_unidad"]) ||
      String(unitPortalId);
    const floor = readNumber(unit, ["piso", "floor"]);
    const area = readNumber(unit, ["area", "area_sqm", "metros2", "m2"]);

    const existingUnit = await getUnitByPortalId(unitPortalId);
    if (existingUnit.unit) {
      const updateResult = await updateUnit(existingUnit.unit.id, {
        building_id: buildingId,
        unit_number: unitNumber,
        floor: floor ?? undefined,
        area_sqm: area ?? undefined,
        portal_id: unitPortalId,
      });
      if (updateResult.error) {
        errors.push(updateResult.error.message);
      } else {
        syncedUnits += 1;
      }
    } else {
      const unitByNumber = await getUnitByNumberInBuilding(buildingId, unitNumber);
      if (unitByNumber.unit?.id) {
        const updateResult = await updateUnit(unitByNumber.unit.id, {
          building_id: buildingId,
          unit_number: unitNumber,
          floor: floor ?? undefined,
          area_sqm: area ?? undefined,
          portal_id: unitPortalId,
        });
        if (updateResult.error) {
          errors.push(updateResult.error.message);
        } else {
          syncedUnits += 1;
        }
      } else {
        const createResult = await createUnit({
          building_id: buildingId,
          unit_number: unitNumber,
          floor: floor ?? undefined,
          area_sqm: area ?? undefined,
          portal_id: unitPortalId,
        });
        if (createResult.error) {
          errors.push(createResult.error.message);
        } else {
          syncedUnits += 1;
        }
      }
    }
  }

  return { error: errors.length ? { message: errors[0] } : null, syncedUnits, errors };
};

export const syncPortalAmenitiesForBuilding = async (params: {
  buildingId: string;
  amenitiesPayload: any;
}) => {
  const { buildingId, amenitiesPayload } = params;
  const amenities = toPortalList(amenitiesPayload);
  const errors: string[] = [];
  let syncedAmenities = 0;

  for (const amenity of amenities) {
    const amenityPortalId = readNumber(amenity, ["idAmenity", "idQuincho", "amenity_id", "id_amenity"]);
    if (!amenityPortalId) continue;

    const nameEs = readString(amenity, ["nombre", "name", "nombre_es", "nombreEs"]) || `Amenity ${amenityPortalId}`;
    const nameEn = readString(amenity, ["name_en", "nombre_en", "nombreEn"]) || null;
    const descriptionEs = readString(amenity, ["descripcion", "description", "descripcion_es", "descripcionEs"]) || null;
    const descriptionEn = readString(amenity, ["description_en", "descripcion_en", "descripcionEn"]) || null;
    const maxCapacity = readNumber(amenity, ["capacidad", "max_capacity", "maxCapacity"]);
    const requiresApproval = readBoolean(amenity, ["requiere_aprobacion", "requires_approval", "requiresApproval"]);
    const isActive = readBoolean(amenity, ["activo", "is_active", "active", "habilitado"]);

    const existingAmenity = await getAmenityByPortalId(amenityPortalId);
    if (existingAmenity.amenity) {
      const updateResult = await updateAmenity(existingAmenity.amenity.id, {
        building_id: buildingId,
        portal_id: amenityPortalId,
        name_es: nameEs,
        name_en: nameEn,
        description_es: descriptionEs,
        description_en: descriptionEn,
        max_capacity: maxCapacity ?? undefined,
        requires_approval: requiresApproval,
        is_active: isActive,
      });
      if (updateResult.error) {
        errors.push(updateResult.error.message);
      } else {
        syncedAmenities += 1;
      }
    } else {
      const amenityByName = await getAmenityByNameInBuilding(buildingId, nameEs);
      if (amenityByName.amenity?.id) {
        const updateResult = await updateAmenity(amenityByName.amenity.id, {
          building_id: buildingId,
          portal_id: amenityPortalId,
          name_es: nameEs,
          name_en: nameEn,
          description_es: descriptionEs,
          description_en: descriptionEn,
          max_capacity: maxCapacity ?? undefined,
          requires_approval: requiresApproval,
          is_active: isActive,
        });
        if (updateResult.error) {
          errors.push(updateResult.error.message);
        } else {
          syncedAmenities += 1;
        }
      } else {
        const createResult = await createAmenity({
          building_id: buildingId,
          portal_id: amenityPortalId,
          name_es: nameEs,
          name_en: nameEn,
          description_es: descriptionEs,
          description_en: descriptionEn,
          max_capacity: maxCapacity ?? undefined,
          requires_approval: requiresApproval ?? false,
          is_active: isActive ?? true,
        });
        if (createResult.error) {
          errors.push(createResult.error.message);
        } else {
          syncedAmenities += 1;
        }
      }
    }
  }

  return { error: errors.length ? { message: errors[0] } : null, syncedAmenities, errors };
};

export const createReservationSynced = async (params: {
  email?: string;
  portalFields: {
    razonSocial: string;
    cantidadPersonas: number;
    correo: string;
    celular: string;
    observacion?: string;
    abonado?: string;
  };
  localPayload: {
    userId: string;
    amenityId: string;
    unitId: string;
    reservationDate: string;
    startTime: string;
    endTime: string;
    notes?: string;
  };
}) => {
  const { email, portalFields, localPayload } = params;
  const razonSocial = (portalFields.razonSocial || "").trim();
  const correo = (portalFields.correo || "").trim();
  const celular = (portalFields.celular || "").trim();
  const cantidadPersonas = Number(portalFields.cantidadPersonas);
  const observacion = (portalFields.observacion || "").trim();
  const abonado = (portalFields.abonado || "").trim() || "NO";

  if (!razonSocial || !correo || !celular || !Number.isFinite(cantidadPersonas) || cantidadPersonas <= 0) {
    return { reservation: null, error: { message: "Missing or invalid reservation fields" }, queued: false };
  }

  if (!userHasAnyRole(["tenant", "owner"])) {
    return { reservation: null, error: { message: "User role not permitted to create reservations" }, queued: false };
  }

  const { unitId: assignedUnitId, error: unitError } = await resolveAssignedUnitId(localPayload.userId);
  if (unitError) {
    return { reservation: null, error: unitError, queued: false };
  }
  if (!assignedUnitId) {
    return { reservation: null, error: { message: "User has no assigned unit" }, queued: false };
  }
  if (assignedUnitId !== localPayload.unitId) {
    return {
      reservation: null,
      error: { message: "Reservations must use the user's assigned unit" },
      queued: false,
    };
  }

  const unitPortalId = await getUnitPortalId(localPayload.unitId);
  const amenityPortalId = await getAmenityPortalId(localPayload.amenityId);

  if (!unitPortalId || !amenityPortalId) {
    return { reservation: null, error: { message: "Missing portal mapping for unit or amenity" }, queued: false };
  }

  const portalPayload = {
    razonSocial,
    idUnidad: unitPortalId,
    cantidadPersonas,
    idQuincho: amenityPortalId,
    fecha: localPayload.reservationDate,
    horaInicio: localPayload.startTime,
    horaFin: localPayload.endTime,
    correo,
    celular,
    observacion,
    abonado,
  };

  const authResult = await ensurePortalAuth(email);
  if (authResult.error) {
    enqueueSyncJob({ type: "reservation", payload: portalPayload, localPayload });
    return { reservation: null, error: authResult.error, queued: true };
  }

  const portalResult = await portalCreateReservation(portalPayload);
  if (portalResult.error) {
    enqueueSyncJob({ type: "reservation", payload: portalPayload, localPayload });
    return { reservation: null, error: portalResult.error, queued: true };
  }

  const localResult = await createReservation(
    localPayload.userId,
    localPayload.amenityId,
    localPayload.reservationDate,
    localPayload.startTime,
    localPayload.endTime,
    localPayload.notes,
    (portalResult.data as any)?.data?.idReserva ?? undefined
  );

  if (localResult.error) {
    enqueueSyncJob({
      type: "local_reservation",
      payload: {},
      localPayload: {
        ...localPayload,
        portalId: (portalResult.data as any)?.data?.idReserva ?? undefined,
      },
    });
  } else if ((portalResult.data as any)?.data?.idReserva && localResult.reservation?.id) {
    await updateReservationPortalId(localResult.reservation.id, (portalResult.data as any).data.idReserva);
  }

  return { reservation: localResult.reservation, error: localResult.error, queued: false };
};

export const createIncidentSynced = async (params: {
  email?: string;
  portalFields: {
    titulo: string;
    descripcion: string;
    prioridad: string;
  };
  localPayload: {
    userId: string;
    buildingId: string;
    unitId: string;
    amenityId?: string;
    type: "maintenance" | "complaint" | "suggestion";
    title: string;
    description: string;
    location?: string;
    priority?: string;
  };
}) => {
  const { email, portalFields, localPayload } = params;

  if (!userHasAnyRole(["tenant"])) {
    return { incident: null, error: { message: "User role not permitted to create incidents" }, queued: false };
  }

  const buildingPortalId = await getBuildingPortalId(localPayload.buildingId);
  const unitPortalId = await getUnitPortalId(localPayload.unitId);
  const amenityPortalId = localPayload.amenityId ? await getAmenityPortalId(localPayload.amenityId) : null;

  if (!buildingPortalId || !unitPortalId) {
    return { incident: null, error: { message: "Missing portal mapping for building or unit" }, queued: false };
  }

  const portalPayload = {
    idPropiedad: buildingPortalId,
    idUnidad: unitPortalId,
    titulo: portalFields.titulo,
    descripcion: portalFields.descripcion,
    prioridad: portalFields.prioridad,
    idQuincho: amenityPortalId || undefined,
  };

  const authResult = await ensurePortalAuth(email);
  if (authResult.error) {
    enqueueSyncJob({ type: "incident", payload: portalPayload, localPayload });
    return { incident: null, error: authResult.error, queued: true };
  }

  const portalResult = await portalCreateIncident(portalPayload);
  if (portalResult.error) {
    enqueueSyncJob({ type: "incident", payload: portalPayload, localPayload });
    return { incident: null, error: portalResult.error, queued: true };
  }

  const localResult = await createIncident(
    localPayload.userId,
    localPayload.buildingId,
    localPayload.type,
    localPayload.title,
    localPayload.description,
    localPayload.location,
    localPayload.priority,
    (portalResult.data as any)?.data?.idIncidencia ?? undefined
  );

  if (localResult.error) {
    enqueueSyncJob({
      type: "local_incident",
      payload: {},
      localPayload: {
        ...localPayload,
        portalId: (portalResult.data as any)?.data?.idIncidencia ?? undefined,
      },
    });
  } else if ((portalResult.data as any)?.data?.idIncidencia && localResult.incident?.id) {
    await updateIncidentPortalId(localResult.incident.id, (portalResult.data as any).data.idIncidencia);
  }

  return { incident: localResult.incident, error: localResult.error, queued: false };
};

const mapPortalStatusToLocal = (status?: string) => {
  switch (status) {
    case "ABIERTA":
      return "open";
    case "EN_PROCESO":
      return "in_progress";
    case "RESUELTA":
      return "resolved";
    case "CERRADA":
    case "RECHAZADA":
      return "closed";
    default:
      return undefined;
  }
};

export const updateIncidentSynced = async (params: {
  email?: string;
  incidentId: number | string;
  portalPayload: {
    titulo?: string;
    descripcion?: string;
    prioridad?: string;
    estado?: string;
  };
  localPayload?: {
    incidentId: string;
    updates: {
      title?: string;
      description?: string;
      priority?: string;
      status?: "open" | "in_progress" | "resolved" | "closed";
    };
  };
}) => {
  const { email, incidentId, portalPayload, localPayload } = params;

  const authResult = await ensurePortalAuth(email);
  if (authResult.error) {
    enqueueSyncJob({
      type: "incident_update",
      payload: { incidentId, ...portalPayload },
      localPayload,
    });
    return { incident: null, error: authResult.error, queued: true };
  }

  const portalResult = await portalUpdateIncident(incidentId, portalPayload);
  if (portalResult.error) {
    enqueueSyncJob({
      type: "incident_update",
      payload: { incidentId, ...portalPayload },
      localPayload,
    });
    return { incident: null, error: portalResult.error, queued: true };
  }

  const localStatus = mapPortalStatusToLocal(portalPayload.estado);
  const mergedLocal =
    localPayload || (localStatus ? { incidentId: String(incidentId), updates: { status: localStatus } } : undefined);

  if (mergedLocal) {
    const localResult = await updateIncident(mergedLocal.incidentId, mergedLocal.updates);
    if (localResult.error) {
      enqueueSyncJob({
        type: "local_incident_update",
        payload: {},
        localPayload: mergedLocal,
      });
      return { incident: localResult.incident, error: localResult.error, queued: true };
    }
    return { incident: localResult.incident, error: null, queued: false };
  }

  return { incident: null, error: null, queued: false };
};

export const approveReservationSynced = async (params: {
  email?: string;
  reservationId: number | string;
  localReservationId?: string;
  localStatus?: "approved" | "rejected" | "cancelled" | "pending";
}) => {
  const { email, reservationId, localReservationId, localStatus } = params;

  const authResult = await ensurePortalAuth(email);
  if (authResult.error) {
    enqueueSyncJob({
      type: "approval_reservation",
      payload: { reservationId },
      localPayload: localReservationId && localStatus ? { reservationId: localReservationId, status: localStatus } : undefined,
    });
    return { error: authResult.error, queued: true };
  }

  const portalResult = await portalApproveReservation(reservationId);
  if (portalResult.error) {
    enqueueSyncJob({
      type: "approval_reservation",
      payload: { reservationId },
      localPayload: localReservationId && localStatus ? { reservationId: localReservationId, status: localStatus } : undefined,
    });
    return { error: portalResult.error, queued: true };
  }

  if (localReservationId && localStatus) {
    const localResult = await updateReservationStatus(localReservationId, localStatus);
    if (localResult.error) {
      enqueueSyncJob({
        type: "local_reservation_status",
        payload: {},
        localPayload: { reservationId: localReservationId, status: localStatus },
      });
      return { error: localResult.error, queued: true };
    }
  }

  return { error: null, queued: false };
};

export const createAuthUsuarioSynced = async (params: {
  email?: string;
  payload: Record<string, unknown>;
}) => {
  const { email, payload } = params;
  const nombreCompleto = readString(payload as Record<string, any>, [
    "nombreCompleto",
    "nombre",
    "fullName",
    "full_name",
    "name",
  ]);
  const correo = readString(payload as Record<string, any>, ["correo", "email"]);
  if (!nombreCompleto || !correo) {
    return { error: { message: "Missing nombreCompleto or correo" }, queued: false };
  }
  const portalPayload = { nombreCompleto, correo };

  const authResult = await ensurePortalAuth(email);
  if (authResult.error) {
    enqueueSyncJob({ type: "auth_usuario", payload: portalPayload });
    return { error: authResult.error, queued: true };
  }

  const portalResult = await portalCreateAuthUsuario(portalPayload);
  if (portalResult.error) {
    enqueueSyncJob({ type: "auth_usuario", payload: portalPayload });
    return { error: portalResult.error, queued: true };
  }

  return { error: null, queued: false };
};
