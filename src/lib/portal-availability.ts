export type AvailabilitySlot = {
  start: string;
  end: string;
};

type AvailabilityPayload = {
  slots: AvailabilitySlot[];
  startTimes: string[];
  endTimes: string[];
};

const toPortalList = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
};

const readString = (record: Record<string, any> | null | undefined, keys: string[]) => {
  if (!record) return "";

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
};

export const normalizePortalTime = (value: string) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";

  const hmsMatch = trimmed.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (hmsMatch) {
    return `${hmsMatch[1]}:${hmsMatch[2]}`;
  }

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
};

const uniqueTimes = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = normalizePortalTime(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

const normalizeTimeList = (payload: any) => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return uniqueTimes(
      payload
        .map((item) => {
          if (typeof item === "string" || typeof item === "number") {
            return String(item);
          }

          if (item && typeof item === "object") {
            return readString(item, [
              "horaDisponible",
              "hora",
              "time",
              "horaInicio",
              "hora_inicio",
              "start",
              "horaFin",
              "hora_fin",
              "end",
            ]);
          }

          return "";
        })
        .filter(Boolean)
    );
  }

  if (typeof payload === "string" || typeof payload === "number") {
    return uniqueTimes([String(payload)]);
  }

  return [];
};

const normalizeSlotsFromPayload = (payload: any): AvailabilitySlot[] => {
  const candidates: Record<string, any>[] = [];

  const appendRecord = (value: any) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      candidates.push(value);
    }
  };

  appendRecord(payload);
  appendRecord(payload?.data);
  toPortalList(payload).forEach((item) => appendRecord(item));
  toPortalList(payload?.data).forEach((item) => appendRecord(item));

  const seen = new Set<string>();
  const slots: AvailabilitySlot[] = [];

  candidates.forEach((candidate) => {
    const start = normalizePortalTime(
      readString(candidate, ["horaInicio", "hora_inicio", "start", "desde", "inicio"])
    );
    const end = normalizePortalTime(
      readString(candidate, ["horaFin", "hora_fin", "end", "hasta", "fin"])
    );

    if (!start || !end) return;

    const signature = `${start}-${end}`;
    if (seen.has(signature)) return;
    seen.add(signature);
    slots.push({ start, end });
  });

  return slots;
};

const readTimeGroup = (record: Record<string, any> | null | undefined, keys: string[]) => {
  if (!record) return [];

  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) {
      return normalizeTimeList(record[key]);
    }
  }

  return [];
};

export const normalizePortalAvailability = (payload: any): AvailabilityPayload => {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : null;
  const data =
    root?.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, any>)
      : null;

  const slots = normalizeSlotsFromPayload(payload);
  const startTimes = uniqueTimes([
    ...readTimeGroup(root, ["startTimes", "start_times", "horasInicio", "availableStartTimes"]),
    ...readTimeGroup(data, ["startTimes", "start_times", "horasInicio", "availableStartTimes"]),
    ...slots.map((slot) => slot.start),
  ]);
  const endTimes = uniqueTimes([
    ...readTimeGroup(root, ["endTimes", "end_times", "horasFin", "availableEndTimes"]),
    ...readTimeGroup(data, ["endTimes", "end_times", "horasFin", "availableEndTimes"]),
    ...slots.map((slot) => slot.end),
  ]);

  return { slots, startTimes, endTimes };
};

export const isReservationWithinAvailabilitySlots = (
  startTime: string,
  endTime: string,
  slots: AvailabilitySlot[]
) => {
  const normalizedStart = normalizePortalTime(startTime);
  const normalizedEnd = normalizePortalTime(endTime);

  if (!normalizedStart || !normalizedEnd || normalizedStart >= normalizedEnd) {
    return false;
  }

  return slots.some((slot) => normalizedStart >= slot.start && normalizedEnd <= slot.end);
};
