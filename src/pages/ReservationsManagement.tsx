import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Plus, Edit, Trash2, Search, Clock, User, CheckCircle, XCircle, AlertCircle, Dumbbell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import Unauthorized from "@/components/Unauthorized";
import {
  getAllReservations,
  updateReservation,
  deleteReservation,
  updateReservationStatus,
  getAllAmenities,
  getBuildingAmenities,
  getAllUsersWithRoles,
  getBuilding,
  getBuildingByPortalId,
} from "@/lib/supabase";
import { createReservationSynced } from "@/lib/portal-sync";
import { syncPortalAmenitiesForBuilding, syncPortalCatalog } from "@/lib/portal-sync";
import { toast } from "sonner";
import { portalGetAllAmenities, portalGetAllMyProperties } from "@/lib/portal-api";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface Reservation {
  id: string;
  user_id: string;
  amenity_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  amenity?: {
    id: string;
    name_es: string;
    name_en: string | null;
    building_id: string;
    building?: {
      id: string;
      name: string;
    } | null;
  } | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

interface Amenity {
  id: string;
  name_es: string;
  name_en: string | null;
  building_id: string;
  building?: {
    id: string;
    name: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  unit?: {
    id: string;
    unit_number?: string;
    portal_id?: number | null;
  } | null;
}

type PortalProperty = {
  portalId: number;
  name: string;
  raw: Record<string, any>;
};

const ReservationsManagement = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();

  // State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [formAmenities, setFormAmenities] = useState<Amenity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [amenitiesLoading, setAmenitiesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAmenity, setFilterAmenity] = useState<string>("all");
  const [properties, setProperties] = useState<PortalProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const getDefaultReservationForm = () => ({
    user_id: "",
    amenity_id: "",
    reservation_date: "",
    start_time: "",
    end_time: "",
    status: "pending" as ReservationStatus,
    notes: "",
    razonSocial: "",
    correo: "",
    celular: "",
    cantidadPersonas: "",
    idUnidad: "",
    property_id: "",
  });

  const [reservationForm, setReservationForm] = useState(getDefaultReservationForm);

  // Check if user can access this page
  const canAccess = profile?.role === "super_admin";
  const isOwner = profile?.role === "owner" || profile?.roles?.includes("owner");
  const ownerBuildingId = profile?.currentUnit?.building_id || profile?.building_id || null;

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

  const normalizeText = (value?: string | null) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        const [reservationsResult, amenitiesResult, usersResult] = await Promise.all([
          getAllReservations(),
          getAllAmenities(),
          getAllUsersWithRoles(),
        ]);

        if (reservationsResult.error) {
          console.error("Error fetching reservations:", reservationsResult.error);
          toast.error(t("reservationsManagement.errorLoading"));
        } else {
          setReservations(reservationsResult.reservations || []);
          setFilteredReservations(reservationsResult.reservations || []);
        }

        if (amenitiesResult.error) {
          console.error("Error fetching amenities:", amenitiesResult.error);
        } else {
          setAmenities(amenitiesResult.amenities || []);
        }

        if (usersResult.error) {
          console.error("Error fetching users:", usersResult.error);
        } else if (isOwner && profile) {
          const ownerUnit = profile.currentUnit
            ? {
                id: profile.currentUnit.unit_id,
                unit_number: profile.currentUnit.unit_number,
                portal_id: profile.currentUnit.portal_id ?? null,
              }
            : profile.unit_id
              ? { id: profile.unit_id }
              : null;
          setUsers([
            {
              id: profile.id,
              full_name: profile.full_name,
              email: profile.email,
              unit: ownerUnit,
            },
          ]);
        } else {
          setUsers(usersResult.users || []);
        }

        setPropertiesLoading(true);
        const propertiesResult = await portalGetAllMyProperties();
        if (propertiesResult.error) {
          console.error("Error fetching portal properties:", propertiesResult.error);
          toast.error("No se pudieron cargar las propiedades");
          setProperties([]);
          setSelectedPropertyId("");
        } else {
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
          if (isOwner && ownerBuildingId) {
            const { building } = await getBuilding(ownerBuildingId);
            const ownerPortalId = building?.portal_id ?? null;
            const ownerName = normalizeText(building?.name || "");
            filteredProperties = mappedProperties.filter((property) => {
              if (ownerPortalId && property.portalId === ownerPortalId) return true;
              if (ownerName && normalizeText(property.name) === ownerName) return true;
              return false;
            });
          }

          setProperties(filteredProperties);

          if (!selectedPropertyId) {
            let defaultPortalId: string | null = null;
            if (ownerBuildingId) {
              const { building } = await getBuilding(ownerBuildingId);
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
          if (isOwner && ownerBuildingId && filteredProperties.length === 0) {
            toast.error("No hay propiedades asignadas para este propietario");
          }
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("reservationsManagement.errorLoading"));
      } finally {
        setLoading(false);
        setPropertiesLoading(false);
      }
    };

    fetchData();
  }, [profile, t, ownerBuildingId]);

  useEffect(() => {
    if (!selectedPropertyId) {
      setFormAmenities([]);
      return;
    }

    const fetchAmenitiesForProperty = async () => {
      setAmenitiesLoading(true);
      setFormAmenities([]);
      try {
        const amenitiesResult = await portalGetAllAmenities(selectedPropertyId);
        if (amenitiesResult.error) {
          console.error("Error fetching portal amenities:", amenitiesResult.error);
          toast.error(t("reservationsManagement.errorLoading"));
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
          return;
        }

        const syncAmenitiesResult = await syncPortalAmenitiesForBuilding({
          buildingId,
          amenitiesPayload: amenitiesResult.data,
        });
        if (syncAmenitiesResult.error) {
          console.error("Error syncing amenities:", syncAmenitiesResult.error);
          toast.error(t("amenities.errorLoading"));
        }

        const { amenities: localAmenities } = await getBuildingAmenities(buildingId);
        setFormAmenities(localAmenities || []);
        setReservationForm((prev) => ({
          ...prev,
          amenity_id: localAmenities.some((amenity) => amenity.id === prev.amenity_id) ? prev.amenity_id : "",
          property_id: selectedPropertyId,
        }));
      } catch (error) {
        console.error("Error fetching amenities:", error);
        toast.error(t("amenities.errorLoading"));
      } finally {
        setAmenitiesLoading(false);
      }
    };

    fetchAmenitiesForProperty();
  }, [properties, profile?.email, selectedPropertyId, t]);

  // Filter reservations
  useEffect(() => {
    let filtered = [...reservations];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (res) =>
          res.user?.full_name?.toLowerCase().includes(search) ||
          res.user?.email?.toLowerCase().includes(search) ||
          res.amenity?.name_es?.toLowerCase().includes(search) ||
          res.amenity?.name_en?.toLowerCase().includes(search)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((res) => res.status === filterStatus);
    }

    if (filterAmenity !== "all") {
      filtered = filtered.filter((res) => res.amenity_id === filterAmenity);
    }

    setFilteredReservations(filtered);
    setPage(1);
  }, [searchTerm, filterStatus, filterAmenity, reservations]);

  // Reset form
  const resetForm = (overrides: Partial<typeof reservationForm> = {}) => {
    setReservationForm({ ...getDefaultReservationForm(), ...overrides });
  };

  useEffect(() => {
    if (!reservationForm.user_id) return;
    const selectedUser = users.find((user) => user.id === reservationForm.user_id);
    if (!selectedUser) return;
    setReservationForm((prev) => ({
      ...prev,
      razonSocial: prev.razonSocial || selectedUser.full_name || "",
      correo: prev.correo || selectedUser.email || "",
      idUnidad: prev.idUnidad || selectedUser.unit?.id || "",
    }));
  }, [reservationForm.user_id, users]);

  useEffect(() => {
    if (!showCreateDialog || !isOwner || !profile?.id) return;
    setReservationForm((prev) => ({ ...prev, user_id: profile.id }));
  }, [isOwner, profile?.id, showCreateDialog]);


  // Handle create reservation
  const handleCreateReservation = async () => {
    const userIdToUse = isOwner && profile?.id ? profile.id : reservationForm.user_id;
    if (
      !userIdToUse ||
      !reservationForm.amenity_id ||
      !reservationForm.reservation_date ||
      !reservationForm.start_time ||
      !reservationForm.end_time ||
      !reservationForm.razonSocial ||
      !reservationForm.correo ||
      !reservationForm.celular ||
      !reservationForm.cantidadPersonas
    ) {
      toast.error(t("reservationsManagement.fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const selectedUser = users.find((user) => user.id === userIdToUse);
      const unitId = selectedUser?.unit?.id;
      if (!unitId) {
        toast.error("Selected user has no unit mapping");
        setSubmitting(false);
        return;
      }
      if (isOwner && ownerBuildingId) {
        const selectedAmenity =
          formAmenities.find((amenity) => amenity.id === reservationForm.amenity_id) ||
          amenities.find((amenity) => amenity.id === reservationForm.amenity_id);
        if (!selectedAmenity || selectedAmenity.building_id !== ownerBuildingId) {
          toast.error(t("reservationsManagement.selectAmenity"));
          setSubmitting(false);
          return;
        }
      }

      const { reservation, error } = await createReservationSynced({
        email: profile?.email || undefined,
        portalFields: {
          razonSocial: reservationForm.razonSocial,
          cantidadPersonas: Number(reservationForm.cantidadPersonas),
          correo: reservationForm.correo,
          celular: reservationForm.celular,
          observacion: reservationForm.notes || undefined,
        },
        localPayload: {
          userId: userIdToUse,
          amenityId: reservationForm.amenity_id,
          unitId,
          reservationDate: reservationForm.reservation_date,
          startTime: reservationForm.start_time,
          endTime: reservationForm.end_time,
          notes: reservationForm.notes || undefined,
        },
      });

      if (error) {
        console.error("Error creating reservation:", error);
        toast.error(error.message || t("reservationsManagement.errorCreating"));
        return;
      }

      toast.success(t("reservationsManagement.created"));
      setShowCreateDialog(false);
      resetForm();

      // Refresh reservations
      const { reservations: updatedReservations } = await getAllReservations();
      setReservations(updatedReservations || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("reservationsManagement.errorCreating"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit reservation
  const handleEditReservation = async () => {
    if (!selectedReservation || !reservationForm.amenity_id || !reservationForm.reservation_date || !reservationForm.start_time || !reservationForm.end_time) {
      toast.error(t("reservationsManagement.fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { reservation, error } = await updateReservation(selectedReservation.id, {
        amenity_id: reservationForm.amenity_id,
        reservation_date: reservationForm.reservation_date,
        start_time: reservationForm.start_time,
        end_time: reservationForm.end_time,
        status: reservationForm.status,
        notes: reservationForm.notes || null,
      });

      if (error) {
        console.error("Error updating reservation:", error);
        toast.error(error.message || t("reservationsManagement.errorUpdating"));
        return;
      }

      toast.success(t("reservationsManagement.updated"));
      setShowEditDialog(false);
      setSelectedReservation(null);
      resetForm();

      // Refresh reservations
      const { reservations: updatedReservations } = await getAllReservations();
      setReservations(updatedReservations || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("reservationsManagement.errorUpdating"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete reservation
  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;

    setSubmitting(true);
    try {
      const { error } = await deleteReservation(selectedReservation.id);

      if (error) {
        console.error("Error deleting reservation:", error);
        toast.error(error.message || t("reservationsManagement.errorDeleting"));
        return;
      }

      toast.success(t("reservationsManagement.deleted"));
      setShowDeleteDialog(false);
      setSelectedReservation(null);

      // Refresh reservations
      const { reservations: updatedReservations } = await getAllReservations();
      setReservations(updatedReservations || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("reservationsManagement.errorDeleting"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status change (approve/reject)
  const handleStatusChange = async (reservation: Reservation, newStatus: ReservationStatus) => {
    try {
      const { error } = await updateReservationStatus(reservation.id, newStatus);

      if (error) {
        console.error("Error updating status:", error);
        toast.error(t("reservationsManagement.errorUpdating"));
        return;
      }

      toast.success(t(`reservationsManagement.status${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`));

      // Refresh reservations
      const { reservations: updatedReservations } = await getAllReservations();
      setReservations(updatedReservations || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("reservationsManagement.errorUpdating"));
    }
  };

  // Open edit dialog
  const openEditDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setReservationForm({
      user_id: reservation.user_id,
      amenity_id: reservation.amenity_id,
      reservation_date: reservation.reservation_date,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      status: reservation.status,
      notes: reservation.notes || "",
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowDeleteDialog(true);
  };

  // Get amenity display name
  const getAmenityName = (amenity: Amenity | null | undefined) => {
    if (!amenity) return "-";
    if (i18n.language === "en" && amenity.name_en) {
      return amenity.name_en;
    }
    return amenity.name_es;
  };

  // Get status badge
  const getStatusBadge = (status: ReservationStatus) => {
    const config: Record<ReservationStatus, { className: string; icon: React.ReactNode }> = {
      pending: { className: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: <AlertCircle className="w-3 h-3" /> },
      approved: { className: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="w-3 h-3" /> },
      cancelled: { className: "bg-gray-50 text-gray-700 border-gray-200", icon: <XCircle className="w-3 h-3" /> },
    };

    const { className, icon } = config[status] || config.pending;

    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1`}>
        {icon}
        {t(`reservationsManagement.${status}`)}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language === "es" ? "es-ES" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:MM format
  };

  if (!profile) {
    return null;
  }

  if (!canAccess) {
    return <Unauthorized />;
  }

  const getReservationDate = (reservation: Reservation) =>
    reservation.reservation_date ? new Date(reservation.reservation_date).getTime() : 0;

  const sortedReservations = [...filteredReservations].sort((a, b) => {
    const diff = getReservationDate(a) - getReservationDate(b);
    return dateSort === "newest" ? -diff : diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedReservations.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedReservations = sortedReservations.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [dateSort]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            {t("reservationsManagement.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("reservationsManagement.subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            const ownerDefaults = isOwner && profile ? { user_id: profile.id } : {};
            const amenityDefaults = formAmenities.length === 1 ? { amenity_id: formAmenities[0].id } : {};
            const propertyDefaults = selectedPropertyId ? { property_id: selectedPropertyId } : {};
            resetForm({ ...ownerDefaults, ...amenityDefaults, ...propertyDefaults });
            setShowCreateDialog(true);
          }}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("reservationsManagement.addReservation")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("reservationsManagement.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t("reservationsManagement.filterByStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reservationsManagement.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("reservationsManagement.pending")}</SelectItem>
                <SelectItem value="approved">{t("reservationsManagement.approved")}</SelectItem>
                <SelectItem value="rejected">{t("reservationsManagement.rejected")}</SelectItem>
                <SelectItem value="cancelled">{t("reservationsManagement.cancelled")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Amenity Filter */}
            <Select value={filterAmenity} onValueChange={setFilterAmenity}>
              <SelectTrigger>
                <SelectValue placeholder={t("reservationsManagement.filterByAmenity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("reservationsManagement.allAmenities")}</SelectItem>
                {amenities.map((amenity) => (
                  <SelectItem key={amenity.id} value={amenity.id}>
                    {getAmenityName(amenity)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Sort */}
            <Select value={dateSort} onValueChange={(value) => setDateSort(value as "newest" | "oldest")}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.sortByDate")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("common.newestFirst")}</SelectItem>
              <SelectItem value="oldest">{t("common.oldestFirst")}</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reservationsManagement.list")}</CardTitle>
          <CardDescription>
            {filteredReservations.length} {filteredReservations.length === 1 ? t("reservationsManagement.reservation") : t("reservationsManagement.reservationsCount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pagedReservations.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("reservationsManagement.noReservations")}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("reservationsManagement.user")}</TableHead>
                    <TableHead>{t("reservationsManagement.amenity")}</TableHead>
                    <TableHead>{t("reservationsManagement.date")}</TableHead>
                    <TableHead>{t("reservationsManagement.time")}</TableHead>
                    <TableHead>{t("reservationsManagement.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{reservation.user?.full_name || "-"}</p>
                            <p className="text-xs text-muted-foreground">{reservation.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{getAmenityName(reservation.amenity)}</p>
                            {reservation.amenity?.building && (
                              <p className="text-xs text-muted-foreground">{reservation.amenity.building.name}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(reservation.reservation_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {reservation.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(reservation, "approved")}
                                title={t("reservationsManagement.approve")}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusChange(reservation, "rejected")}
                                title={t("reservationsManagement.reject")}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(reservation)}
                            title={t("common.edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(reservation)}
                            title={t("common.delete")}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {/* Create Reservation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("reservationsManagement.addReservation")}</DialogTitle>
            <DialogDescription>{t("reservationsManagement.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!isOwner && (
              <div>
                <Label htmlFor="user_id">{t("reservationsManagement.user")} *</Label>
                <Select
                  value={reservationForm.user_id}
                  onValueChange={(value) => setReservationForm({ ...reservationForm, user_id: value })}
                >
                  <SelectTrigger id="user_id">
                    <SelectValue placeholder={t("reservationsManagement.selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Property */}
            <div>
              <Label htmlFor="property_id">{t("reservationsManagement.property")} *</Label>
              <Select
                value={selectedPropertyId}
                onValueChange={(value) => {
                  setSelectedPropertyId(value);
                  setReservationForm((prev) => ({ ...prev, amenity_id: "", property_id: value }));
                }}
                disabled={propertiesLoading || isOwner}
              >
                <SelectTrigger id="property_id">
                  <SelectValue placeholder={t("reservationsManagement.selectProperty")} />
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

            {/* Amenity */}
            <div>
              <Label htmlFor="amenity_id">{t("reservationsManagement.amenity")} *</Label>
              <Select
                value={reservationForm.amenity_id}
                onValueChange={(value) => setReservationForm({ ...reservationForm, amenity_id: value })}
                disabled={!selectedPropertyId || amenitiesLoading}
              >
                <SelectTrigger id="amenity_id">
                  <SelectValue placeholder={t("reservationsManagement.selectAmenity")} />
                </SelectTrigger>
                <SelectContent>
                  {formAmenities.map((amenity) => (
                    <SelectItem key={amenity.id} value={amenity.id}>
                      {getAmenityName(amenity)} {amenity.building ? `(${amenity.building.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="reservation_date">{t("reservationsManagement.date")} *</Label>
              <Input
                id="reservation_date"
                type="date"
                value={reservationForm.reservation_date}
                onChange={(e) => setReservationForm({ ...reservationForm, reservation_date: e.target.value })}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">{t("reservationsManagement.startTime")} *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={reservationForm.start_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">{t("reservationsManagement.endTime")} *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={reservationForm.end_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">{t("reservationsManagement.notes")}</Label>
              <Textarea
                id="notes"
                value={reservationForm.notes}
                onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                placeholder={t("reservationsManagement.notesPlaceholder")}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="razonSocial">Razón social *</Label>
              <Input
                id="razonSocial"
                value={reservationForm.razonSocial}
                onChange={(e) => setReservationForm({ ...reservationForm, razonSocial: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="correo">Correo *</Label>
              <Input
                id="correo"
                type="email"
                value={reservationForm.correo}
                onChange={(e) => setReservationForm({ ...reservationForm, correo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="celular">Celular *</Label>
                <Input
                  id="celular"
                  value={reservationForm.celular}
                  onChange={(e) => setReservationForm({ ...reservationForm, celular: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cantidadPersonas">Cantidad de personas *</Label>
                <Input
                  id="cantidadPersonas"
                  type="number"
                  min="1"
                  value={reservationForm.cantidadPersonas}
                  onChange={(e) => setReservationForm({ ...reservationForm, cantidadPersonas: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateReservation} disabled={submitting}>
              {submitting ? t("common.creating") : t("reservationsManagement.addReservation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reservation Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("reservationsManagement.editReservation")}</DialogTitle>
            <DialogDescription>{t("reservationsManagement.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Amenity */}
            <div>
              <Label htmlFor="edit_amenity_id">{t("reservationsManagement.amenity")} *</Label>
              <Select
                value={reservationForm.amenity_id}
                onValueChange={(value) => setReservationForm({ ...reservationForm, amenity_id: value })}
              >
                <SelectTrigger id="edit_amenity_id">
                  <SelectValue placeholder={t("reservationsManagement.selectAmenity")} />
                </SelectTrigger>
                <SelectContent>
                  {amenities.map((amenity) => (
                    <SelectItem key={amenity.id} value={amenity.id}>
                      {getAmenityName(amenity)} {amenity.building ? `(${amenity.building.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="edit_reservation_date">{t("reservationsManagement.date")} *</Label>
              <Input
                id="edit_reservation_date"
                type="date"
                value={reservationForm.reservation_date}
                onChange={(e) => setReservationForm({ ...reservationForm, reservation_date: e.target.value })}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_time">{t("reservationsManagement.startTime")} *</Label>
                <Input
                  id="edit_start_time"
                  type="time"
                  value={reservationForm.start_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_end_time">{t("reservationsManagement.endTime")} *</Label>
                <Input
                  id="edit_end_time"
                  type="time"
                  value={reservationForm.end_time}
                  onChange={(e) => setReservationForm({ ...reservationForm, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="edit_status">{t("reservationsManagement.status")} *</Label>
              <Select
                value={reservationForm.status}
                onValueChange={(value) => setReservationForm({ ...reservationForm, status: value as ReservationStatus })}
              >
                <SelectTrigger id="edit_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("reservationsManagement.pending")}</SelectItem>
                  <SelectItem value="approved">{t("reservationsManagement.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("reservationsManagement.rejected")}</SelectItem>
                  <SelectItem value="cancelled">{t("reservationsManagement.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="edit_notes">{t("reservationsManagement.notes")}</Label>
              <Textarea
                id="edit_notes"
                value={reservationForm.notes}
                onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                placeholder={t("reservationsManagement.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditReservation} disabled={submitting}>
              {submitting ? t("common.updating") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reservationsManagement.deleteReservation")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reservationsManagement.deleteConfirmation")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReservation}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReservationsManagement;
