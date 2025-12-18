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
import {
  getAllReservations,
  createReservation,
  updateReservation,
  deleteReservation,
  updateReservationStatus,
  getAllAmenities,
  getAllUsersWithRoles,
} from "@/lib/supabase";
import { toast } from "sonner";

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
}

const ReservationsManagement = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();

  // State
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAmenity, setFilterAmenity] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [reservationForm, setReservationForm] = useState({
    user_id: "",
    amenity_id: "",
    reservation_date: "",
    start_time: "",
    end_time: "",
    status: "pending" as ReservationStatus,
    notes: "",
  });

  // Check if user can access this page
  const canAccess = profile?.role === "super_admin" || profile?.role === "owner";

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
        } else {
          setUsers(usersResult.users || []);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("reservationsManagement.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, t]);

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
  }, [searchTerm, filterStatus, filterAmenity, reservations]);

  // Reset form
  const resetForm = () => {
    setReservationForm({
      user_id: "",
      amenity_id: "",
      reservation_date: "",
      start_time: "",
      end_time: "",
      status: "pending",
      notes: "",
    });
  };

  // Handle create reservation
  const handleCreateReservation = async () => {
    if (!reservationForm.user_id || !reservationForm.amenity_id || !reservationForm.reservation_date || !reservationForm.start_time || !reservationForm.end_time) {
      toast.error(t("reservationsManagement.fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { reservation, error } = await createReservation(
        reservationForm.user_id,
        reservationForm.amenity_id,
        reservationForm.reservation_date,
        reservationForm.start_time,
        reservationForm.end_time,
        reservationForm.notes || undefined
      );

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

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("common.noAccess")}</p>
      </div>
    );
  }

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
            resetForm();
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
          {filteredReservations.length === 0 ? (
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
                  {filteredReservations.map((reservation) => (
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

      {/* Create Reservation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("reservationsManagement.addReservation")}</DialogTitle>
            <DialogDescription>{t("reservationsManagement.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* User */}
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

            {/* Amenity */}
            <div>
              <Label htmlFor="amenity_id">{t("reservationsManagement.amenity")} *</Label>
              <Select
                value={reservationForm.amenity_id}
                onValueChange={(value) => setReservationForm({ ...reservationForm, amenity_id: value })}
              >
                <SelectTrigger id="amenity_id">
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
