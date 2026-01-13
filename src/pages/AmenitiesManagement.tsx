import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Dumbbell, Plus, Edit, Trash2, Search, Building2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  getAllBuildings,
} from "@/lib/supabase";
import { toast } from "sonner";

interface Amenity {
  id: string;
  building_id: string;
  portal_id: number | null;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  max_capacity: number | null;
  requires_approval: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
  building?: {
    id: string;
    name: string;
  } | null;
}

interface Building {
  id: string;
  name: string;
}

const AmenitiesManagement = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();

  // State
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [filteredAmenities, setFilteredAmenities] = useState<Amenity[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBuildingId, setFilterBuildingId] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state matching database columns
  const [amenityForm, setAmenityForm] = useState({
    building_id: "",
    portal_id: "",
    name_es: "",
    name_en: "",
    description_es: "",
    description_en: "",
    max_capacity: "",
    requires_approval: false,
    is_active: true,
  });

  // Check if user can access this page
  const canAccess = profile?.role === "super_admin" || profile?.role === "owner";

  // Fetch amenities and buildings
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        const [amenitiesResult, buildingsResult] = await Promise.all([
          getAllAmenities(),
          getAllBuildings(),
        ]);

        if (amenitiesResult.error) {
          console.error("Error fetching amenities:", amenitiesResult.error);
          toast.error(t("amenities.errorLoading"));
          return;
        }

        if (buildingsResult.error) {
          console.error("Error fetching buildings:", buildingsResult.error);
          toast.error(t("buildings.error.load"));
          return;
        }

        setAmenities(amenitiesResult.amenities || []);
        setFilteredAmenities(amenitiesResult.amenities || []);
        setBuildings(buildingsResult.buildings || []);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("amenities.errorLoading"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, t]);

  // Filter amenities based on search and building
  useEffect(() => {
    let filtered = [...amenities];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (amenity) =>
          amenity.name_es.toLowerCase().includes(search) ||
          amenity.name_en?.toLowerCase().includes(search) ||
          amenity.description_es?.toLowerCase().includes(search) ||
          amenity.building?.name?.toLowerCase().includes(search)
      );
    }

    if (filterBuildingId !== "all") {
      filtered = filtered.filter((amenity) => amenity.building_id === filterBuildingId);
    }

    setFilteredAmenities(filtered);
  }, [searchTerm, filterBuildingId, amenities]);

  // Reset form
  const resetForm = () => {
    setAmenityForm({
      building_id: "",
      portal_id: "",
      name_es: "",
      name_en: "",
      description_es: "",
      description_en: "",
      max_capacity: "",
      requires_approval: false,
      is_active: true,
    });
  };

  // Handle create amenity
  const handleCreateAmenity = async () => {
    if (!amenityForm.building_id || !amenityForm.name_es) {
      toast.error(t("amenities.fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { amenity, error } = await createAmenity({
        building_id: amenityForm.building_id,
        portal_id: amenityForm.portal_id ? parseInt(amenityForm.portal_id) : null,
        name_es: amenityForm.name_es,
        name_en: amenityForm.name_en || null,
        description_es: amenityForm.description_es || null,
        description_en: amenityForm.description_en || null,
        max_capacity: amenityForm.max_capacity ? parseInt(amenityForm.max_capacity) : null,
        requires_approval: amenityForm.requires_approval,
        is_active: amenityForm.is_active,
      });

      if (error) {
        console.error("Error creating amenity:", error);
        toast.error(error.message || t("amenities.errorCreating"));
        return;
      }

      toast.success(t("amenities.created"));
      setShowCreateDialog(false);
      resetForm();

      // Refresh amenities
      const { amenities: updatedAmenities } = await getAllAmenities();
      setAmenities(updatedAmenities || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("amenities.errorCreating"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit amenity
  const handleEditAmenity = async () => {
    if (!selectedAmenity || !amenityForm.building_id || !amenityForm.name_es) {
      toast.error(t("amenities.fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { amenity, error } = await updateAmenity(selectedAmenity.id, {
        building_id: amenityForm.building_id,
        portal_id: amenityForm.portal_id ? parseInt(amenityForm.portal_id) : null,
        name_es: amenityForm.name_es,
        name_en: amenityForm.name_en || null,
        description_es: amenityForm.description_es || null,
        description_en: amenityForm.description_en || null,
        max_capacity: amenityForm.max_capacity ? parseInt(amenityForm.max_capacity) : null,
        requires_approval: amenityForm.requires_approval,
        is_active: amenityForm.is_active,
      });

      if (error) {
        console.error("Error updating amenity:", error);
        toast.error(error.message || t("amenities.errorUpdating"));
        return;
      }

      toast.success(t("amenities.updated"));
      setShowEditDialog(false);
      setSelectedAmenity(null);
      resetForm();

      // Refresh amenities
      const { amenities: updatedAmenities } = await getAllAmenities();
      setAmenities(updatedAmenities || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("amenities.errorUpdating"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete amenity
  const handleDeleteAmenity = async () => {
    if (!selectedAmenity) return;

    setSubmitting(true);
    try {
      const { error } = await deleteAmenity(selectedAmenity.id);

      if (error) {
        console.error("Error deleting amenity:", error);
        toast.error(error.message || t("amenities.errorDeleting"));
        return;
      }

      toast.success(t("amenities.deleted"));
      setShowDeleteDialog(false);
      setSelectedAmenity(null);

      // Refresh amenities
      const { amenities: updatedAmenities } = await getAllAmenities();
      setAmenities(updatedAmenities || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("amenities.errorDeleting"));
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setAmenityForm({
      building_id: amenity.building_id,
      portal_id: amenity.portal_id?.toString() || "",
      name_es: amenity.name_es,
      name_en: amenity.name_en || "",
      description_es: amenity.description_es || "",
      description_en: amenity.description_en || "",
      max_capacity: amenity.max_capacity?.toString() || "",
      requires_approval: amenity.requires_approval || false,
      is_active: amenity.is_active ?? true,
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setShowDeleteDialog(true);
  };

  // Get display name based on language
  const getDisplayName = (amenity: Amenity) => {
    if (i18n.language === "en" && amenity.name_en) {
      return amenity.name_en;
    }
    return amenity.name_es;
  };

  // Get description based on language
  const getDescription = (amenity: Amenity) => {
    if (i18n.language === "en" && amenity.description_en) {
      return amenity.description_en;
    }
    return amenity.description_es;
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
            <Dumbbell className="w-8 h-8" />
            {t("amenities.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("amenities.subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("amenities.addAmenity")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("amenities.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Building Filter */}
            <Select value={filterBuildingId} onValueChange={setFilterBuildingId}>
              <SelectTrigger>
                <SelectValue placeholder={t("amenities.filterByBuilding")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allBuildings")}</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Amenities Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("amenities.list")}</CardTitle>
          <CardDescription>
            {filteredAmenities.length} {filteredAmenities.length === 1 ? t("amenities.amenity") : t("amenities.amenitiesCount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAmenities.length === 0 ? (
            <div className="text-center py-12">
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("amenities.noAmenities")}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("amenities.name")}</TableHead>
                    <TableHead>{t("amenities.building")}</TableHead>
                    <TableHead>{t("amenities.maxCapacity")}</TableHead>
                    <TableHead>{t("amenities.requiresApproval")}</TableHead>
                    <TableHead>{t("amenities.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAmenities.map((amenity) => (
                    <TableRow key={amenity.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getDisplayName(amenity)}</p>
                          {getDescription(amenity) && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {getDescription(amenity)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {amenity.building?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {amenity.max_capacity ? (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            {amenity.max_capacity}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={amenity.requires_approval ? "default" : "secondary"}>
                          {amenity.requires_approval ? t("common.yes") : t("common.no")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            amenity.is_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {amenity.is_active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(amenity)}
                            title={t("common.edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(amenity)}
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

      {/* Create Amenity Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("amenities.addAmenity")}</DialogTitle>
            <DialogDescription>{t("amenities.addDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Building */}
            <div>
              <Label htmlFor="building_id">{t("amenities.building")} *</Label>
              <Select
                value={amenityForm.building_id}
                onValueChange={(value) => setAmenityForm({ ...amenityForm, building_id: value })}
              >
                <SelectTrigger id="building_id">
                  <SelectValue placeholder={t("amenities.selectBuilding")} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="portal_id">Portal ID</Label>
              <Input
                id="portal_id"
                type="number"
                value={amenityForm.portal_id}
                onChange={(e) => setAmenityForm({ ...amenityForm, portal_id: e.target.value })}
              />
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name_es">{t("amenities.nameEs")} *</Label>
                <Input
                  id="name_es"
                  value={amenityForm.name_es}
                  onChange={(e) => setAmenityForm({ ...amenityForm, name_es: e.target.value })}
                  placeholder="ej. Gimnasio"
                />
              </div>
              <div>
                <Label htmlFor="name_en">{t("amenities.nameEn")}</Label>
                <Input
                  id="name_en"
                  value={amenityForm.name_en}
                  onChange={(e) => setAmenityForm({ ...amenityForm, name_en: e.target.value })}
                  placeholder="e.g. Gym"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description_es">{t("amenities.descriptionEs")}</Label>
                <Textarea
                  id="description_es"
                  value={amenityForm.description_es}
                  onChange={(e) => setAmenityForm({ ...amenityForm, description_es: e.target.value })}
                  placeholder="Descripción en español..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="description_en">{t("amenities.descriptionEn")}</Label>
                <Textarea
                  id="description_en"
                  value={amenityForm.description_en}
                  onChange={(e) => setAmenityForm({ ...amenityForm, description_en: e.target.value })}
                  placeholder="Description in English..."
                  rows={3}
                />
              </div>
            </div>

            {/* Max Capacity */}
            <div>
              <Label htmlFor="max_capacity">{t("amenities.maxCapacity")}</Label>
              <Input
                id="max_capacity"
                type="number"
                value={amenityForm.max_capacity}
                onChange={(e) => setAmenityForm({ ...amenityForm, max_capacity: e.target.value })}
                placeholder={t("amenities.maxCapacityPlaceholder")}
              />
            </div>

            {/* Requires Approval */}
            <div className="flex items-center justify-between">
              <Label htmlFor="requires_approval">{t("amenities.requiresApproval")}</Label>
              <Switch
                id="requires_approval"
                checked={amenityForm.requires_approval}
                onCheckedChange={(checked) =>
                  setAmenityForm({ ...amenityForm, requires_approval: checked })
                }
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">{t("amenities.activeStatus")}</Label>
              <Switch
                id="is_active"
                checked={amenityForm.is_active}
                onCheckedChange={(checked) => setAmenityForm({ ...amenityForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreateAmenity} disabled={submitting}>
              {submitting ? t("common.creating") : t("amenities.addAmenity")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Amenity Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("amenities.editAmenity")}</DialogTitle>
            <DialogDescription>{t("amenities.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Building */}
            <div>
              <Label htmlFor="edit_building_id">{t("amenities.building")} *</Label>
              <Select
                value={amenityForm.building_id}
                onValueChange={(value) => setAmenityForm({ ...amenityForm, building_id: value })}
              >
                <SelectTrigger id="edit_building_id">
                  <SelectValue placeholder={t("amenities.selectBuilding")} />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_portal_id">Portal ID</Label>
              <Input
                id="edit_portal_id"
                type="number"
                value={amenityForm.portal_id}
                onChange={(e) => setAmenityForm({ ...amenityForm, portal_id: e.target.value })}
              />
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name_es">{t("amenities.nameEs")} *</Label>
                <Input
                  id="edit_name_es"
                  value={amenityForm.name_es}
                  onChange={(e) => setAmenityForm({ ...amenityForm, name_es: e.target.value })}
                  placeholder="ej. Gimnasio"
                />
              </div>
              <div>
                <Label htmlFor="edit_name_en">{t("amenities.nameEn")}</Label>
                <Input
                  id="edit_name_en"
                  value={amenityForm.name_en}
                  onChange={(e) => setAmenityForm({ ...amenityForm, name_en: e.target.value })}
                  placeholder="e.g. Gym"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_description_es">{t("amenities.descriptionEs")}</Label>
                <Textarea
                  id="edit_description_es"
                  value={amenityForm.description_es}
                  onChange={(e) => setAmenityForm({ ...amenityForm, description_es: e.target.value })}
                  placeholder="Descripción en español..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit_description_en">{t("amenities.descriptionEn")}</Label>
                <Textarea
                  id="edit_description_en"
                  value={amenityForm.description_en}
                  onChange={(e) => setAmenityForm({ ...amenityForm, description_en: e.target.value })}
                  placeholder="Description in English..."
                  rows={3}
                />
              </div>
            </div>

            {/* Max Capacity */}
            <div>
              <Label htmlFor="edit_max_capacity">{t("amenities.maxCapacity")}</Label>
              <Input
                id="edit_max_capacity"
                type="number"
                value={amenityForm.max_capacity}
                onChange={(e) => setAmenityForm({ ...amenityForm, max_capacity: e.target.value })}
                placeholder={t("amenities.maxCapacityPlaceholder")}
              />
            </div>

            {/* Requires Approval */}
            <div className="flex items-center justify-between">
              <Label htmlFor="edit_requires_approval">{t("amenities.requiresApproval")}</Label>
              <Switch
                id="edit_requires_approval"
                checked={amenityForm.requires_approval}
                onCheckedChange={(checked) =>
                  setAmenityForm({ ...amenityForm, requires_approval: checked })
                }
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="edit_is_active">{t("amenities.activeStatus")}</Label>
              <Switch
                id="edit_is_active"
                checked={amenityForm.is_active}
                onCheckedChange={(checked) => setAmenityForm({ ...amenityForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditAmenity} disabled={submitting}>
              {submitting ? t("common.updating") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("amenities.deleteAmenity")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("amenities.deleteConfirmation", { name: selectedAmenity?.name_es })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAmenity}
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

export default AmenitiesManagement;
