import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Plus, Info, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { getBuildingAmenities, getBuildingByPortalId, getBuilding, getUserReservations } from "@/lib/supabase";
import { createReservationSynced, syncPortalAmenitiesForBuilding, syncPortalCatalog } from "@/lib/portal-sync";
import {
  portalGetAllAmenities,
  portalGetAllMyProperties,
  portalGetAmenityAvailability,
  portalGetAmenityInfo,
} from "@/lib/portal-api";
import { useLocalizedField } from "@/lib/i18n-helpers";
import { toast } from "sonner";
import type { ReservationStatus } from "@/lib/database.types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Amenity {
  id: string;
  portal_id?: number | null;
  name: string;
  type: string;
  display_name_es: string;
  display_name_en: string | null;
  rules_es: string | null;
  rules_en: string | null;
  max_capacity: number | null;
  is_active: boolean;
}

interface Reservation {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  notes: string | null;
  amenity: Amenity;
}

type PortalProperty = {
  portalId: number;
  name: string;
  raw: Record<string, any>;
};

const Reservas = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const getLocalizedField = useLocalizedField();
  const [properties, setProperties] = useState<PortalProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [showNewReservationDialog, setShowNewReservationDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amenityInfo, setAmenityInfo] = useState<Record<string, any> | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<{ start: string; end: string }[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reservationsSort, setReservationsSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const normalizeText = (value?: string | null) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // New reservation form
  const getDefaultReservation = () => ({
    date: "",
    startTime: "",
    endTime: "",
    notes: "",
    razonSocial: profile?.full_name || "",
    correo: profile?.email || "",
    celular: "",
    cantidadPersonas: "",
  });

  const [newReservation, setNewReservation] = useState(getDefaultReservation);

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      if (!profile) return;

      setLoading(true);
      setPropertiesLoading(true);
      try {
        const propertiesResult = await portalGetAllMyProperties();
        if (propertiesResult.error) {
          console.error("Error fetching portal properties:", propertiesResult.error);
          toast.error(t("reservations.error.load"));
          setProperties([]);
          setSelectedPropertyId("");
          return;
        }

        const portalProperties = toPortalList(propertiesResult.data);
        const mappedProperties = portalProperties
          .map((property) => {
            const portalId = readNumber(property, ["idPropiedad", "id_propiedad", "propiedadId", "propiedad_id"]);
            if (!portalId) return null;
            const name =
              readString(property, ["nombre", "name", "razonSocial", "razon_social", "propiedad"]) ||
              `Propiedad ${portalId}`;
            return { portalId, name, raw: property };
          })
          .filter((item): item is PortalProperty => item !== null);

        let filteredProperties = mappedProperties;
        let assignedPortalId: number | null = null;
        let assignedName = "";
        if (profile.building_id) {
          const { building } = await getBuilding(profile.building_id);
          assignedPortalId = building?.portal_id ?? null;
          assignedName = normalizeText(building?.name || "");
          if (assignedPortalId || assignedName) {
            filteredProperties = mappedProperties.filter((property) => {
              if (assignedPortalId && property.portalId === assignedPortalId) return true;
              if (assignedName && normalizeText(property.name) === assignedName) return true;
              return false;
            });
          } else {
            filteredProperties = [];
          }
        }

        setProperties(filteredProperties);

        if (!selectedPropertyId) {
          let defaultPortalId: string | null = null;
          if (profile.building_id) {
            const { building } = await getBuilding(profile.building_id);
            if (building?.portal_id) {
              defaultPortalId = String(building.portal_id);
            } else if (building?.name) {
              const match = filteredProperties.find(
                (property) => normalizeText(property.name) === normalizeText(building.name)
              );
              if (match) {
                defaultPortalId = String(match.portalId);
              }
            }
          }
          setSelectedPropertyId(defaultPortalId || (filteredProperties[0] ? String(filteredProperties[0].portalId) : ""));
        }
        if (profile.building_id && filteredProperties.length === 0) {
          toast.error("No hay propiedades asignadas para este usuario");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("reservations.error.load"));
      } finally {
        setPropertiesLoading(false);
      }
    };

    fetchProperties();
  }, [profile, t]);

  // Fetch amenities for selected property
  useEffect(() => {
    const fetchAmenitiesForProperty = async () => {
      if (!selectedPropertyId) {
        setAmenities([]);
        setSelectedAmenity(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setAmenitiesLoading(true);
      setSelectedAmenity(null);
      setAmenityInfo(null);
      setAvailabilitySlots([]);
      setAvailabilityError(null);

      try {
        const amenitiesResult = await portalGetAllAmenities(selectedPropertyId);
        if (amenitiesResult.error) {
          console.error("Error fetching portal amenities:", amenitiesResult.error);
          toast.error(t("reservations.error.load"));
          setAmenities([]);
          return;
        }

        let buildingId: string | null = null;
        const existingBuilding = await getBuildingByPortalId(Number(selectedPropertyId));
        if (existingBuilding.building?.id) {
          buildingId = existingBuilding.building.id;
        } else {
          const propertyRecord = properties.find((property) => String(property.portalId) === selectedPropertyId);
          const syncResult = await syncPortalCatalog({
            email: profile?.email || undefined,
            properties: propertyRecord ? [propertyRecord.raw] : undefined,
            includeUnits: false,
            includeAmenities: false,
          });
          if (syncResult.error) {
            toast.error(syncResult.error.message || "No se pudo sincronizar la propiedad");
          }
          const syncedBuilding = await getBuildingByPortalId(Number(selectedPropertyId));
          if (syncedBuilding.building?.id) {
            buildingId = syncedBuilding.building.id;
          }
        }

        if (!buildingId) {
          toast.error("No hay mapeo de edificio para esta propiedad");
          setAmenities([]);
          return;
        }

        const syncAmenitiesResult = await syncPortalAmenitiesForBuilding({
          buildingId,
          amenitiesPayload: amenitiesResult.data,
        });
        if (syncAmenitiesResult.error) {
          console.error("Error syncing amenities:", syncAmenitiesResult.error);
          toast.error(t("reservations.error.load"));
        }

        const { amenities: fetchedAmenities, error } = await getBuildingAmenities(buildingId);
        if (error) {
          console.error("Error fetching amenities:", error);
          toast.error(t("reservations.error.load"));
          setAmenities([]);
          return;
        }

        setAmenities(fetchedAmenities || []);
        if (fetchedAmenities && fetchedAmenities.length > 0) {
          setSelectedAmenity(fetchedAmenities[0]);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("reservations.error.load"));
      } finally {
        setAmenitiesLoading(false);
        setLoading(false);
      }
    };

    fetchAmenitiesForProperty();
  }, [profile?.email, properties, selectedPropertyId, t]);

  useEffect(() => {
    if (!profile) return;
    setNewReservation((prev) => ({
      ...prev,
      razonSocial: prev.razonSocial || profile.full_name || "",
      correo: prev.correo || profile.email || "",
    }));
  }, [profile]);

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
    return "";
  };

  const readNumber = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      const asNumber = Number(value);
      if (Number.isFinite(asNumber)) return asNumber;
    }
    return null;
  };

  useEffect(() => {
    const fetchAmenityInfo = async () => {
      if (!selectedAmenity?.portal_id) {
        setAmenityInfo(null);
        return;
      }
      const result = await portalGetAmenityInfo(selectedAmenity.portal_id);
      if (result.error) {
        console.error("Error fetching amenity info:", result.error);
        setAmenityInfo(null);
        return;
      }
      const record = toPortalList(result.data)[0] || (result.data as any);
      setAmenityInfo(record || null);
    };

    fetchAmenityInfo();
  }, [selectedAmenity?.portal_id]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!selectedAmenity?.portal_id || !newReservation.date) {
        setAvailabilitySlots([]);
        setAvailabilityError(null);
        return;
      }

      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const result = await portalGetAmenityAvailability(selectedAmenity.portal_id, {
          fecha: newReservation.date,
        });

        if (result.error) {
          setAvailabilityError(result.error.message || "Error checking availability");
          setAvailabilitySlots([]);
          return;
        }

        const slots = toPortalList(result.data).map((slot: Record<string, any>) => ({
          start: readString(slot, ["horaInicio", "hora_inicio", "start", "desde", "inicio"]),
          end: readString(slot, ["horaFin", "hora_fin", "end", "hasta", "fin"]),
        }));

        setAvailabilitySlots(slots.filter((slot) => slot.start && slot.end));
      } catch (error: any) {
        setAvailabilityError(error?.message || "Error checking availability");
        setAvailabilitySlots([]);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [newReservation.date, selectedAmenity?.portal_id]);

  // Fetch user reservations
  useEffect(() => {
    const fetchReservations = async () => {
      if (!profile?.id) return;

      try {
        const { reservations: fetchedReservations, error } = await getUserReservations(profile.id);

        if (error) {
          console.error('Error fetching reservations:', error);
          return;
        }

        setReservations(fetchedReservations || []);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchReservations();
  }, [profile]);

  // Handle new reservation
  const handleCreateReservation = async () => {
    if (!profile?.id || !selectedAmenity?.id) return;

    // Validation
    if (
      !newReservation.date ||
      !newReservation.startTime ||
      !newReservation.endTime ||
      !newReservation.razonSocial ||
      !newReservation.correo ||
      !newReservation.celular ||
      !newReservation.cantidadPersonas
    ) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (availabilitySlots.length > 0 && !isSlotAvailable()) {
      toast.error(t("reservations.error.notAvailable"));
      return;
    }

    setSubmitting(true);
    try {
      const unitId = profile.currentUnit?.unit_id || profile.unit_id;
      if (!unitId) {
        toast.error("No hay unidad asignada");
        return;
      }

      const { reservation, error } = await createReservationSynced({
        email: profile.email || undefined,
        portalFields: {
          razonSocial: newReservation.razonSocial,
          cantidadPersonas: Number(newReservation.cantidadPersonas),
          correo: newReservation.correo,
          celular: newReservation.celular,
          observacion: newReservation.notes || undefined,
        },
        localPayload: {
          userId: profile.id,
          amenityId: selectedAmenity.id,
          unitId,
          reservationDate: newReservation.date,
          startTime: newReservation.startTime,
          endTime: newReservation.endTime,
          notes: newReservation.notes || undefined,
        },
      });

      if (error) {
        console.error('Error creating reservation:', error);
        toast.error(t('reservations.error.create'));
        return;
      }

      toast.success(t('reservations.success.created'));
      setShowNewReservationDialog(false);
      setNewReservation(getDefaultReservation());

      // Refresh reservations
      const { reservations: updatedReservations } = await getUserReservations(profile.id);
      setReservations(updatedReservations || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('reservations.error.create'));
    } finally {
      setSubmitting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: ReservationStatus) => {
    const statusConfig = {
      confirmed: {
        icon: CheckCircle2,
        className: "bg-green-100 text-green-700 border-green-200",
        label: t('reservations.confirmed')
      },
      pending: {
        icon: AlertCircle,
        className: "bg-yellow-100 text-yellow-700 border-yellow-200",
        label: t('reservations.pending')
      },
      rejected: {
        icon: XCircle,
        className: "bg-red-100 text-red-700 border-red-200",
        label: t('reservations.rejected')
      },
      cancelled: {
        icon: XCircle,
        className: "bg-gray-100 text-gray-700 border-gray-200",
        label: t('reservations.cancelled')
      }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get amenity icon
  const getAmenityIcon = (type: string) => {
    const icons: Record<string, string> = {
      quincho: "🍖",
      piscina: "🏊",
      gym: "💪",
      sum: "🎉",
      sports_court: "⚽",
    };
    return icons[type] || "📍";
  };

  const isSlotAvailable = () => {
    if (availabilitySlots.length === 0) return true;
    if (!newReservation.startTime || !newReservation.endTime) return true;
    return availabilitySlots.some((slot) => {
      return newReservation.startTime >= slot.start && newReservation.endTime <= slot.end;
    });
  };

  const canSubmit = !availabilityLoading && (availabilitySlots.length === 0 || isSlotAvailable());

  const getReservationDate = (reservation: Reservation) =>
    reservation.reservation_date ? new Date(reservation.reservation_date).getTime() : 0;

  const sortedReservations = [...reservations].sort((a, b) => {
    const diff = getReservationDate(a) - getReservationDate(b);
    return reservationsSort === "newest" ? -diff : diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedReservations.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedReservations = sortedReservations.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [reservations.length, reservationsSort]);

  const amenityStart = amenityInfo ? readString(amenityInfo, ["horaInicio", "hora_inicio", "start"]) : "";
  const amenityEnd = amenityInfo ? readString(amenityInfo, ["horaFin", "hora_fin", "end"]) : "";
  const amenityNotes = amenityInfo ? readString(amenityInfo, ["descripcion", "description", "detalle"]) : "";

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.building_id) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('reservations.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('reservations.subtitle')}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 shadow-lg gap-2" disabled>
            <Plus className="h-5 w-5" />
            {t('reservations.newReservation')}
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No Building Assigned</p>
            <p className="text-sm text-muted-foreground mt-1">Please contact your administrator to assign you to a building.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('reservations.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reservations.subtitle')}</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 shadow-lg gap-2"
          onClick={() => setShowNewReservationDialog(true)}
          disabled={!selectedAmenity}
        >
          <Plus className="h-5 w-5" />
          {t('reservations.newReservation')}
        </Button>
      </div>

      {/* Property Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="property_id">{t("reservations.property")} *</Label>
              <Select
                value={selectedPropertyId}
                onValueChange={(value) => {
                  setSelectedPropertyId(value);
                  setSelectedAmenity(null);
                  setAmenityInfo(null);
                  setAvailabilitySlots([]);
                  setAvailabilityError(null);
                }}
                disabled={propertiesLoading || properties.length === 0}
              >
                <SelectTrigger id="property_id">
                  <SelectValue placeholder={t("reservations.selectProperty")} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.portalId} value={String(property.portalId)}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenity Selector Cards */}
      {amenitiesLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </CardContent>
        </Card>
      ) : amenities.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {amenities.map((amenity) => (
              <Card
                key={amenity.id}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2",
                  selectedAmenity?.id === amenity.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-transparent hover:border-primary/30"
                )}
                onClick={() => setSelectedAmenity(amenity)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{getAmenityIcon(amenity.type)}</div>
                  <p className={cn(
                    "text-sm font-semibold mb-1",
                    selectedAmenity?.id === amenity.id ? "text-primary" : "text-foreground"
                  )}>
                    {getLocalizedField(amenity, 'display_name')}
                  </p>
                  <Badge
                    variant="outline"
                    className={amenity.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                  >
                    {amenity.is_active ? t('reservations.available') : t('reservations.notAvailable')}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Amenity Info */}
          {selectedAmenity && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{getAmenityIcon(selectedAmenity.type)}</div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">
                        {getLocalizedField(selectedAmenity, 'display_name')}
                      </h3>
                      {selectedAmenity.max_capacity && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          {t('reservations.capacity')}: {selectedAmenity.max_capacity} personas
                        </p>
                      )}
                      {(amenityStart || amenityEnd) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Horario: {amenityStart || "--"} - {amenityEnd || "--"}
                        </p>
                      )}
                      {amenityNotes && (
                        <p className="text-sm text-muted-foreground">{amenityNotes}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRulesDialog(true)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t('reservations.viewRules')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

      {/* My Reservations */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>{t('reservations.myReservations')}</CardTitle>
            <Select value={reservationsSort} onValueChange={(value) => setReservationsSort(value as "newest" | "oldest")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("common.sortByDate")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("common.newestFirst")}</SelectItem>
                <SelectItem value="oldest">{t("common.oldestFirst")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription>
            {reservations.length} {reservations.length === 1 ? 'reserva' : 'reservas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pagedReservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tienes reservas activas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedReservations.map((reservation) => (
                <Card key={reservation.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-2xl">{getAmenityIcon(reservation.amenity.type)}</div>
                            <div>
                              <p className="font-semibold">
                                {getLocalizedField(reservation.amenity, 'display_name')}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {formatDate(reservation.reservation_date)}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {reservation.start_time} - {reservation.end_time}
                              </p>
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(reservation.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>{page}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No hay amenities disponibles en este edificio</p>
          </CardContent>
        </Card>
      )}

      {/* New Reservation Dialog */}
      <Dialog open={showNewReservationDialog} onOpenChange={setShowNewReservationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reservations.newReservation')}</DialogTitle>
            <DialogDescription>
              Reserva: {selectedAmenity && getLocalizedField(selectedAmenity, 'display_name')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">{t('reservations.selectDate')}</Label>
              <Input
                id="date"
                type="date"
                value={newReservation.date}
                onChange={(e) => setNewReservation({ ...newReservation, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">{t('reservations.startTime')}</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={newReservation.startTime}
                  onChange={(e) => setNewReservation({ ...newReservation, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">{t('reservations.endTime')}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={newReservation.endTime}
                  onChange={(e) => setNewReservation({ ...newReservation, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              {availabilityLoading ? (
                <p className="text-muted-foreground">Verificando disponibilidad...</p>
              ) : availabilityError ? (
                <p className="text-muted-foreground">{availabilityError}</p>
              ) : availabilitySlots.length > 0 ? (
                <>
                  <p className="font-medium text-foreground mb-2">Horarios disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {availabilitySlots.map((slot, index) => (
                      <span key={`${slot.start}-${slot.end}-${index}`} className="rounded-full border px-3 py-1 text-xs">
                        {slot.start} - {slot.end}
                      </span>
                    ))}
                  </div>
                  {!isSlotAvailable() && newReservation.startTime && newReservation.endTime && (
                    <p className="text-xs text-red-600 mt-2">{t("reservations.error.notAvailable")}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No hay horarios disponibles para esta fecha</p>
              )}
            </div>
            <div>
              <Label htmlFor="notes">{t('reservations.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('reservations.notesPlaceholder')}
                value={newReservation.notes}
                onChange={(e) => setNewReservation({ ...newReservation, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="razonSocial">Razón social *</Label>
              <Input
                id="razonSocial"
                value={newReservation.razonSocial}
                onChange={(e) => setNewReservation({ ...newReservation, razonSocial: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="correo">Correo *</Label>
              <Input
                id="correo"
                type="email"
                value={newReservation.correo}
                onChange={(e) => setNewReservation({ ...newReservation, correo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  value={newReservation.celular}
                  onChange={(e) => setNewReservation({ ...newReservation, celular: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cantidadPersonas">Cantidad de personas *</Label>
                <Input
                  id="cantidadPersonas"
                  type="number"
                  min="1"
                  value={newReservation.cantidadPersonas}
                  onChange={(e) => setNewReservation({ ...newReservation, cantidadPersonas: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReservationDialog(false)}>
              {t('reservations.cancel')}
            </Button>
            <Button onClick={handleCreateReservation} disabled={submitting || !canSubmit}>
              {submitting ? "Creando..." : t('reservations.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('reservations.rulesTitle')}</DialogTitle>
            <DialogDescription>
              {selectedAmenity && getLocalizedField(selectedAmenity, 'display_name')}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm">
              {selectedAmenity && (
                i18n.language === 'en' && selectedAmenity.rules_en
                  ? selectedAmenity.rules_en
                  : selectedAmenity.rules_es || 'No hay reglamento disponible'
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowRulesDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reservas;
