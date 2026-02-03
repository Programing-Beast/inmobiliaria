import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Building2, Plus, Edit, Trash2, Search, Home, MapPin, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
} from "@/lib/supabase";
import { syncPortalCatalog } from "@/lib/portal-sync";
import { portalGetMyProperties, portalGetProperties } from "@/lib/portal-api";
import { toast } from "sonner";

// Building interface matching actual database schema
interface Building {
  id: string;
  portal_id: number | null;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  total_units: number | null;
  created_at: string;
  updated_at: string;
}

const BuildingsManagement = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();

  // State
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Form state matching database columns
  const [buildingForm, setBuildingForm] = useState({
    portal_id: "",
    name: "",
    address: "",
    city: "",
    country: "",
    total_units: "",
  });

  // Check if user can access this page
  const canAccess = profile?.role === "super_admin" || profile?.role === "owner";
  const isSuperAdmin = profile?.role === "super_admin";
  const isReadOnly = true;

  const toPortalList = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  };

  const readNumber = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      const asNumber = Number(value);
      if (Number.isFinite(asNumber)) return asNumber;
    }
    return null;
  };

  // Fetch buildings
  useEffect(() => {
    const fetchData = async () => {
      if (!profile || !canAccess) return;

      setLoading(true);
      setHasNextPage(false);
      try {
        const propertiesResult = await (isSuperAdmin
          ? portalGetProperties({ page, limit })
          : portalGetMyProperties({ page, limit }));
        const portalProperties = propertiesResult.error?.status === 404 ? [] : toPortalList(propertiesResult.data);
        let portalIds: number[] = [];
        if (propertiesResult.error && propertiesResult.error.status !== 404) {
          console.error("Error fetching portal properties:", propertiesResult.error);
          toast.error("No se pudieron cargar las propiedades");
        } else {
          portalIds = portalProperties
            .map((property) =>
              readNumber(property, ["idPropiedad", "id_propiedad", "propiedadId", "propiedad_id"])
            )
            .filter((value): value is number => value !== null);
          setHasNextPage(portalProperties.length === limit);

          if (portalProperties.length > 0) {
            const syncResult = await syncPortalCatalog({
              email: profile?.email || undefined,
              properties: portalProperties,
              includeUnits: false,
              includeAmenities: false,
            });
            if (syncResult.error) {
              console.error("Error syncing portal data:", syncResult.error);
              toast.error("No se pudo sincronizar los edificios");
            }
          }
        }
        const { buildings: allBuildings, error } = await getAllBuildings();

        if (error) {
          console.error("Error fetching buildings:", error);
          toast.error(t("buildings.error.load"));
          return;
        }

        let buildingsToShow = (allBuildings || [])
          .filter((b) => b.portal_id !== null)
          .filter((b) => (portalIds.length ? portalIds.includes(b.portal_id as number) : false));

        // If owner, filter to only show their assigned building
        if (profile.role === "owner" && profile.building_id && portalIds.length === 0) {
          buildingsToShow = buildingsToShow.filter((b) => b.id === profile.building_id);
        }

        setBuildings(buildingsToShow);
        setFilteredBuildings(buildingsToShow);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("buildings.error.load"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, canAccess, t, page, limit]);

  // Filter buildings
  useEffect(() => {
    if (!searchTerm) {
      setFilteredBuildings(buildings);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredBuildings(
        buildings.filter(
          (b) =>
            b.name.toLowerCase().includes(term) ||
            b.address?.toLowerCase().includes(term) ||
            b.city?.toLowerCase().includes(term) ||
            b.country?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, buildings]);

  // Check if user can edit/delete a building
  const canModifyBuilding = (building: Building): boolean => {
    if (isReadOnly) return false;
    if (isSuperAdmin) return true;
    if (profile?.role === "owner" && profile.building_id === building.id) return true;
    return false;
  };

  // Handle create building
  const handleCreateBuilding = async () => {
    if (!buildingForm.name.trim()) {
      toast.error(t("buildings.error.nameRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { building, error } = await createBuilding({
        portal_id: buildingForm.portal_id ? parseInt(buildingForm.portal_id) : null,
        name: buildingForm.name.trim(),
        address: buildingForm.address.trim() || null,
        city: buildingForm.city.trim() || null,
        country: buildingForm.country.trim() || null,
        total_units: buildingForm.total_units ? parseInt(buildingForm.total_units) : null,
      });

      if (error) {
        console.error("Error creating building:", error);
        toast.error(t("buildings.error.create"));
        return;
      }

      toast.success(t("buildings.success.created"));
      setShowCreateDialog(false);
      resetForm();

      // Refresh list
      const { buildings: updatedBuildings } = await getAllBuildings();
      let buildingsToShow = (updatedBuildings || []).filter((b) => b.portal_id !== null);
      if (profile?.role === "owner" && profile.building_id) {
        buildingsToShow = buildingsToShow.filter((b) => b.id === profile.building_id);
      }
      setBuildings(buildingsToShow);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("buildings.error.create"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update building
  const handleUpdateBuilding = async () => {
    if (!selectedBuilding) return;

    if (!buildingForm.name.trim()) {
      toast.error(t("buildings.error.nameRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updateBuilding(selectedBuilding.id, {
        portal_id: buildingForm.portal_id ? parseInt(buildingForm.portal_id) : null,
        name: buildingForm.name.trim(),
        address: buildingForm.address.trim() || null,
        city: buildingForm.city.trim() || null,
        country: buildingForm.country.trim() || null,
        total_units: buildingForm.total_units ? parseInt(buildingForm.total_units) : null,
      });

      if (error) {
        console.error("Error updating building:", error);
        toast.error(t("buildings.error.update"));
        return;
      }

      toast.success(t("buildings.success.updated"));
      setShowEditDialog(false);
      setSelectedBuilding(null);
      resetForm();

      // Refresh list
      const { buildings: updatedBuildings } = await getAllBuildings();
      let buildingsToShow = (updatedBuildings || []).filter((b) => b.portal_id !== null);
      if (profile?.role === "owner" && profile.building_id) {
        buildingsToShow = buildingsToShow.filter((b) => b.id === profile.building_id);
      }
      setBuildings(buildingsToShow);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("buildings.error.update"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete building
  const handleDeleteBuilding = async () => {
    if (!selectedBuilding) return;

    setSubmitting(true);
    try {
      const { error } = await deleteBuilding(selectedBuilding.id);

      if (error) {
        console.error("Error deleting building:", error);
        toast.error(t("buildings.error.delete"));
        return;
      }

      toast.success(t("buildings.success.deleted"));
      setShowDeleteDialog(false);
      setSelectedBuilding(null);

      // Refresh list
      setBuildings((prev) => prev.filter((b) => b.id !== selectedBuilding.id));
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("buildings.error.delete"));
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (building: Building) => {
    if (!canModifyBuilding(building)) {
      toast.error(t("buildings.noPermission"));
      return;
    }
    setSelectedBuilding(building);
    setBuildingForm({
      portal_id: building.portal_id?.toString() || "",
      name: building.name,
      address: building.address || "",
      city: building.city || "",
      country: building.country || "",
      total_units: building.total_units?.toString() || "",
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (building: Building) => {
    if (!canModifyBuilding(building)) {
      toast.error(t("buildings.noPermission"));
      return;
    }
    setSelectedBuilding(building);
    setShowDeleteDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setBuildingForm({
      portal_id: "",
      name: "",
      address: "",
      city: "",
      country: "",
      total_units: "",
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === "es" ? "es-CL" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Check authorization
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground">{t("buildings.unauthorized")}</h2>
        <p className="text-muted-foreground mt-2">{t("buildings.unauthorizedMessage")}</p>
      </div>
    );
  }

  // Loading state
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
            <Building2 className="w-8 h-8" />
            {t("buildings.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("buildings.subtitle")}</p>
        </div>
        {!isReadOnly && isSuperAdmin && (
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("buildings.createBuilding")}
          </Button>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("buildings.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Buildings Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("buildings.buildingsList")}</CardTitle>
          <CardDescription>
            {filteredBuildings.length} {filteredBuildings.length === 1 ? t("buildings.building") : t("buildings.buildingsCount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBuildings.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("buildings.noBuildings")}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("buildings.name")}</TableHead>
                    <TableHead>{t("buildings.address")}</TableHead>
                    <TableHead>{t("buildings.city")}</TableHead>
                    <TableHead>{t("buildings.country")}</TableHead>
                    <TableHead className="text-center">{t("buildings.totalUnits")}</TableHead>
                    <TableHead>{t("buildings.createdAt")}</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Amenities</TableHead>
                    {!isReadOnly && <TableHead>{t("buildings.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBuildings.map((building) => (
                    <TableRow key={building.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {building.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {building.address ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {building.address}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {building.city || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {building.country ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            {building.country}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="gap-1">
                          <Home className="w-3 h-3" />
                          {building.total_units || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(building.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/units?buildingId=${building.id}`}>Ver unidades</Link>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/amenities?buildingId=${building.id}`}>Ver amenities</Link>
                        </Button>
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          {canModifyBuilding(building) && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(building)}
                                title={t("buildings.edit")}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {isSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openDeleteDialog(building)}
                                  title={t("buildings.delete")}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
              onClick={() => setPage((prev) => prev + 1)}
              className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Building Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBuildings.map((building) => (
          <Card key={building.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {building.name}
                </CardTitle>
                {!isReadOnly && canModifyBuilding(building) && (
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(building)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {building.address && (
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {building.address}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("buildings.city")}:</span>
                  <span>{building.city || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("buildings.country")}:</span>
                  <span>{building.country || "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("buildings.totalUnits")}:</span>
                  <Badge variant="secondary" className="gap-1">
                    <Home className="w-3 h-3" />
                    {building.total_units || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Building Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("buildings.createBuilding")}</DialogTitle>
            <DialogDescription>{t("buildings.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="portal_id">Portal ID</Label>
              <Input
                id="portal_id"
                type="number"
                value={buildingForm.portal_id}
                onChange={(e) => setBuildingForm({ ...buildingForm, portal_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="name">{t("buildings.name")} *</Label>
              <Input
                id="name"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                placeholder={t("buildings.namePlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="address">{t("buildings.address")}</Label>
              <Input
                id="address"
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
                placeholder={t("buildings.addressPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">{t("buildings.city")}</Label>
                <Input
                  id="city"
                  value={buildingForm.city}
                  onChange={(e) => setBuildingForm({ ...buildingForm, city: e.target.value })}
                  placeholder={t("buildings.cityPlaceholder")}
                />
              </div>

              <div>
                <Label htmlFor="country">{t("buildings.country")}</Label>
                <Input
                  id="country"
                  value={buildingForm.country}
                  onChange={(e) => setBuildingForm({ ...buildingForm, country: e.target.value })}
                  placeholder={t("buildings.countryPlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="total_units">{t("buildings.totalUnits")}</Label>
              <Input
                id="total_units"
                type="number"
                min="0"
                value={buildingForm.total_units}
                onChange={(e) => setBuildingForm({ ...buildingForm, total_units: e.target.value })}
                placeholder={t("buildings.totalUnitsPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("buildings.cancel")}
            </Button>
            <Button onClick={handleCreateBuilding} disabled={submitting}>
              {submitting ? t("buildings.creating") : t("buildings.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Building Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("buildings.editBuilding")}</DialogTitle>
            <DialogDescription>{t("buildings.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editPortalId">Portal ID</Label>
              <Input
                id="editPortalId"
                type="number"
                value={buildingForm.portal_id}
                onChange={(e) => setBuildingForm({ ...buildingForm, portal_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editName">{t("buildings.name")} *</Label>
              <Input
                id="editName"
                value={buildingForm.name}
                onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="editAddress">{t("buildings.address")}</Label>
              <Input
                id="editAddress"
                value={buildingForm.address}
                onChange={(e) => setBuildingForm({ ...buildingForm, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editCity">{t("buildings.city")}</Label>
                <Input
                  id="editCity"
                  value={buildingForm.city}
                  onChange={(e) => setBuildingForm({ ...buildingForm, city: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="editCountry">{t("buildings.country")}</Label>
                <Input
                  id="editCountry"
                  value={buildingForm.country}
                  onChange={(e) => setBuildingForm({ ...buildingForm, country: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="editTotalUnits">{t("buildings.totalUnits")}</Label>
              <Input
                id="editTotalUnits"
                type="number"
                min="0"
                value={buildingForm.total_units}
                onChange={(e) => setBuildingForm({ ...buildingForm, total_units: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("buildings.cancel")}
            </Button>
            <Button onClick={handleUpdateBuilding} disabled={submitting}>
              {submitting ? t("buildings.updating") : t("buildings.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("buildings.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("buildings.deleteConfirmMessage")} <strong>{selectedBuilding?.name}</strong>?
              <br />
              <span className="text-destructive text-sm mt-2 block">
                {t("buildings.deleteWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("buildings.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBuilding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? t("buildings.deleting") : t("buildings.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BuildingsManagement;
