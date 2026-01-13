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
import { getBuildingAmenities, getUserReservations } from "@/lib/supabase";
import { createReservationSynced } from "@/lib/portal-sync";
import { useLocalizedField } from "@/lib/i18n-helpers";
import { toast } from "sonner";
import type { ReservationStatus } from "@/lib/database.types";

interface Amenity {
  id: string;
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

const Reservas = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const getLocalizedField = useLocalizedField();
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [showNewReservationDialog, setShowNewReservationDialog] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    abonado: "",
  });

  const [newReservation, setNewReservation] = useState(getDefaultReservation);

  // Fetch amenities
  useEffect(() => {
    const fetchAmenities = async () => {
      if (!profile) return;

      if (!profile.building_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { amenities: fetchedAmenities, error } = await getBuildingAmenities(profile.building_id);

        if (error) {
          console.error('Error fetching amenities:', error);
          toast.error(t('reservations.error.load'));
          return;
        }

        setAmenities(fetchedAmenities || []);
        if (fetchedAmenities && fetchedAmenities.length > 0) {
          setSelectedAmenity(fetchedAmenities[0]);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error(t('reservations.error.load'));
      } finally {
        setLoading(false);
      }
    };

    fetchAmenities();
  }, [profile, t]);

  useEffect(() => {
    if (!profile) return;
    setNewReservation((prev) => ({
      ...prev,
      razonSocial: prev.razonSocial || profile.full_name || "",
      correo: prev.correo || profile.email || "",
    }));
  }, [profile]);

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
          abonado: newReservation.abonado || undefined,
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('reservations.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reservations.subtitle')}</p>
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

      {/* Amenity Selector Cards */}
      {amenities.length > 0 ? (
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
              <CardTitle>{t('reservations.myReservations')}</CardTitle>
              <CardDescription>
                {reservations.length} {reservations.length === 1 ? 'reserva' : 'reservas'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reservations.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No tienes reservas activas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((reservation) => (
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
            <div>
              <Label htmlFor="abonado">Abonado</Label>
              <Input
                id="abonado"
                placeholder="SI/NO"
                value={newReservation.abonado}
                onChange={(e) => setNewReservation({ ...newReservation, abonado: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReservationDialog(false)}>
              {t('reservations.cancel')}
            </Button>
            <Button onClick={handleCreateReservation} disabled={submitting}>
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
