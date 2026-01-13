import {
  ensurePortalAuth,
  portalCreateAuthUsuario,
  portalCreateIncident,
  portalCreateReservation,
  portalApproveReservation,
  portalUpdateIncident,
} from "@/lib/portal-api";
import {
  createIncident,
  createReservation,
  getAmenityPortalId,
  getBuildingPortalId,
  getUnitPortalId,
  updateIncident,
  updateIncidentPortalId,
  updateReservationPortalId,
  updateReservationStatus,
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

  const unitPortalId = await getUnitPortalId(localPayload.unitId);
  const amenityPortalId = await getAmenityPortalId(localPayload.amenityId);

  if (!unitPortalId || !amenityPortalId) {
    return { reservation: null, error: { message: "Missing portal mapping for unit or amenity" }, queued: false };
  }

  const portalPayload = {
    razonSocial: portalFields.razonSocial,
    idUnidad: unitPortalId,
    cantidadPersonas: portalFields.cantidadPersonas,
    idQuincho: amenityPortalId,
    fecha: localPayload.reservationDate,
    horaInicio: localPayload.startTime,
    horaFin: localPayload.endTime,
    correo: portalFields.correo,
    celular: portalFields.celular,
    observacion: portalFields.observacion,
    abonado: portalFields.abonado,
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

  const authResult = await ensurePortalAuth(email);
  if (authResult.error) {
    enqueueSyncJob({ type: "auth_usuario", payload });
    return { error: authResult.error, queued: true };
  }

  const portalResult = await portalCreateAuthUsuario(payload);
  if (portalResult.error) {
    enqueueSyncJob({ type: "auth_usuario", payload });
    return { error: portalResult.error, queued: true };
  }

  return { error: null, queued: false };
};
