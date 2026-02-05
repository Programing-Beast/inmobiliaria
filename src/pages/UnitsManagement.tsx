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
import { Home, Plus, Edit, Trash2, Search, Building2, Layers, Ruler, Bed, Bath, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getAllBuildings,
  getBuilding,
} from "@/lib/supabase";
import { syncPortalUnitsForBuilding } from "@/lib/portal-sync";
import { portalGetUnits } from "@/lib/portal-api";
import { toast } from "sonner";

// Unit interface matching actual database schema
interface Unit {
  id: string;
  building_id: string;
  portal_id: number | null;
  unit_number: string;
  floor: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  monthly_fee: number | null;
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

const UnitsManagement = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBuildingId, setFilterBuildingId] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Form state matching database columns
  const [unitForm, setUnitForm] = useState({
    building_id: "",
    portal_id: "",
    unit_number: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    area_sqm: "",
    monthly_fee: "",
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

  // Fetch units and buildings
  useEffect(() => {
    const fetchData = async () => {
      if (!profile || !canAccess) return;

      setLoading(true);
      setHasNextPage(false);
      try {
        const buildingIdParam = searchParams.get("buildingId");
        let portalIds: number[] = [];
        if (!buildingIdParam) {
          setHasNextPage(false);
        }
        if (buildingIdParam) {
          const { building } = await getBuilding(buildingIdParam);
          if (!building?.portal_id) {
            toast.error("No hay mapeo de portal para este edificio");
          } else {
            const unitsResult = await portalGetUnits(building.portal_id, { page, limit });
            const portalUnits = unitsResult.error?.status === 404 ? [] : toPortalList(unitsResult.data);
            if (unitsResult.error && unitsResult.error.status !== 404) {
              console.error("Error fetching portal units:", unitsResult.error);
              toast.error(t("units.error.load"));
            } else {
              portalIds = portalUnits
                .map((unit) => readNumber(unit, ["idUnidad", "id_unidad", "unidadId", "unidad_id"]))
                .filter((value): value is number => value !== null);
              setHasNextPage(portalUnits.length === limit);

              if (portalUnits.length > 0) {
                const syncResult = await syncPortalUnitsForBuilding({
                  buildingId: building.id,
                  unitsPayload: portalUnits,
                });
                if (syncResult.error) {
                  console.error("Error syncing portal data:", syncResult.error);
                  toast.error(t("units.error.load"));
                } else {
                  toast.success(`${portalUnits.length} unidades sincronizadas desde Portal`);
                }
              }
            }
          }
        }
        // Fetch buildings first
        const { buildings: allBuildings } = await getAllBuildings();
        let buildingsToShow = (allBuildings || []).filter((b) => b.portal_id !== null);

        // If owner, filter to only show their building
        if (profile.role === "owner" && profile.building_id) {
          buildingsToShow = buildingsToShow.filter((b) => b.id === profile.building_id);
        }
        setBuildings(buildingsToShow);

        // Fetch units
        const { units: allUnits, error } = await getAllUnits();

        if (error) {
          console.error("Error fetching units:", error);
          toast.error(t("units.error.load"));
          return;
        }

        let unitsToShow = (allUnits || [])
          .filter((u) => u.portal_id !== null)
          .filter((u) => (portalIds.length ? portalIds.includes(u.portal_id as number) : false));

        // If owner, filter to only show units in their building
        if (profile.role === "owner" && profile.building_id) {
          unitsToShow = unitsToShow.filter((u) => u.building_id === profile.building_id);
        }

        setUnits(unitsToShow);
        setFilteredUnits(unitsToShow);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("units.error.load"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, canAccess, t, searchParams, page, limit]);

  useEffect(() => {
    const buildingId = searchParams.get("buildingId");
    if (buildingId) {
      setFilterBuildingId(buildingId);
      setPage(1);
    }
  }, [searchParams]);

  // Filter units
  useEffect(() => {
    let filtered = [...units];

    // Filter by building
    if (filterBuildingId && filterBuildingId !== "all") {
      filtered = filtered.filter((u) => u.building_id === filterBuildingId);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.unit_number.toLowerCase().includes(term) ||
          u.building?.name?.toLowerCase().includes(term)
      );
    }

    setFilteredUnits(filtered);
  }, [searchTerm, filterBuildingId, units]);

  // Handle building dropdown change - update URL to trigger data fetch
  const handleBuildingChange = (buildingId: string) => {
    if (buildingId === "all") {
      // Remove buildingId parameter from URL
      navigate("/units");
      setFilterBuildingId("all");
    } else {
      // Add/update buildingId parameter in URL
      navigate(`/units?buildingId=${buildingId}`);
      setFilterBuildingId(buildingId);
    }
  };

  // Check if user can modify a unit
  const canModifyUnit = (unit: Unit): boolean => {
    if (isReadOnly) return false;
    if (isSuperAdmin) return true;
    if (profile?.role === "owner" && profile.building_id === unit.building_id) return true;
    return false;
  };

  // Handle create unit
  const handleCreateUnit = async () => {
    if (!unitForm.building_id) {
      toast.error(t("units.error.buildingRequired"));
      return;
    }
    if (!unitForm.unit_number.trim()) {
      toast.error(t("units.error.unitNumberRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { unit, error } = await createUnit({
        building_id: unitForm.building_id,
        portal_id: unitForm.portal_id ? parseInt(unitForm.portal_id) : null,
        unit_number: unitForm.unit_number.trim(),
        floor: unitForm.floor ? parseInt(unitForm.floor) : null,
        bedrooms: unitForm.bedrooms ? parseInt(unitForm.bedrooms) : null,
        bathrooms: unitForm.bathrooms ? parseInt(unitForm.bathrooms) : null,
        area_sqm: unitForm.area_sqm ? parseFloat(unitForm.area_sqm) : null,
        monthly_fee: unitForm.monthly_fee ? parseFloat(unitForm.monthly_fee) : null,
      });

      if (error) {
        console.error("Error creating unit:", error);
        if (error.code === "23505") {
          toast.error(t("units.error.duplicate"));
        } else {
          toast.error(t("units.error.create"));
        }
        return;
      }

      toast.success(t("units.success.created"));
      setShowCreateDialog(false);
      resetForm();

      // Refresh list
      const { units: updatedUnits } = await getAllUnits();
      let unitsToShow = (updatedUnits || []).filter((u) => u.portal_id !== null);
      if (profile?.role === "owner" && profile.building_id) {
        unitsToShow = unitsToShow.filter((u) => u.building_id === profile.building_id);
      }
      setUnits(unitsToShow);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("units.error.create"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update unit
  const handleUpdateUnit = async () => {
    if (!selectedUnit) return;

    if (!unitForm.building_id) {
      toast.error(t("units.error.buildingRequired"));
      return;
    }
    if (!unitForm.unit_number.trim()) {
      toast.error(t("units.error.unitNumberRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updateUnit(selectedUnit.id, {
        building_id: unitForm.building_id,
        portal_id: unitForm.portal_id ? parseInt(unitForm.portal_id) : null,
        unit_number: unitForm.unit_number.trim(),
        floor: unitForm.floor ? parseInt(unitForm.floor) : null,
        bedrooms: unitForm.bedrooms ? parseInt(unitForm.bedrooms) : null,
        bathrooms: unitForm.bathrooms ? parseInt(unitForm.bathrooms) : null,
        area_sqm: unitForm.area_sqm ? parseFloat(unitForm.area_sqm) : null,
        monthly_fee: unitForm.monthly_fee ? parseFloat(unitForm.monthly_fee) : null,
      });

      if (error) {
        console.error("Error updating unit:", error);
        if (error.code === "23505") {
          toast.error(t("units.error.duplicate"));
        } else {
          toast.error(t("units.error.update"));
        }
        return;
      }

      toast.success(t("units.success.updated"));
      setShowEditDialog(false);
      setSelectedUnit(null);
      resetForm();

      // Refresh list
      const { units: updatedUnits } = await getAllUnits();
      let unitsToShow = (updatedUnits || []).filter((u) => u.portal_id !== null);
      if (profile?.role === "owner" && profile.building_id) {
        unitsToShow = unitsToShow.filter((u) => u.building_id === profile.building_id);
      }
      setUnits(unitsToShow);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("units.error.update"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete unit
  const handleDeleteUnit = async () => {
    if (!selectedUnit) return;

    setSubmitting(true);
    try {
      const { error } = await deleteUnit(selectedUnit.id);

      if (error) {
        console.error("Error deleting unit:", error);
        toast.error(t("units.error.delete"));
        return;
      }

      toast.success(t("units.success.deleted"));
      setShowDeleteDialog(false);
      setSelectedUnit(null);

      // Refresh list
      setUnits((prev) => prev.filter((u) => u.id !== selectedUnit.id));
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("units.error.delete"));
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (unit: Unit) => {
    if (!canModifyUnit(unit)) {
      toast.error(t("units.noPermission"));
      return;
    }
    setSelectedUnit(unit);
    setUnitForm({
      building_id: unit.building_id,
      portal_id: unit.portal_id?.toString() || "",
      unit_number: unit.unit_number,
      floor: unit.floor?.toString() || "",
      bedrooms: unit.bedrooms?.toString() || "",
      bathrooms: unit.bathrooms?.toString() || "",
      area_sqm: unit.area_sqm?.toString() || "",
      monthly_fee: unit.monthly_fee?.toString() || "",
    });
    setShowEditDialog(true);
  };

  // Open delete dialog
  const openDeleteDialog = (unit: Unit) => {
    if (!canModifyUnit(unit)) {
      toast.error(t("units.noPermission"));
      return;
    }
    setSelectedUnit(unit);
    setShowDeleteDialog(true);
  };

  // Reset form
  const resetForm = () => {
    setUnitForm({
      building_id: profile?.role === "owner" && profile.building_id ? profile.building_id : "",
      portal_id: "",
      unit_number: "",
      floor: "",
      bedrooms: "",
      bathrooms: "",
      area_sqm: "",
      monthly_fee: "",
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

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat(i18n.language === "es" ? "es-CL" : "en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Check authorization
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Home className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground">{t("units.unauthorized")}</h2>
        <p className="text-muted-foreground mt-2">{t("units.unauthorizedMessage")}</p>
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
            <Home className="w-8 h-8" />
            {t("units.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("units.subtitle")}</p>
        </div>
        {!isReadOnly && (
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("units.createUnit")}
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("units.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterBuildingId} onValueChange={handleBuildingChange}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder={t("units.filterByBuilding")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("units.allBuildings")}</SelectItem>
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

      {/* Units Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("units.unitsList")}</CardTitle>
          <CardDescription>
            {filteredUnits.length} {filteredUnits.length === 1 ? t("units.unit") : t("units.unitsCount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUnits.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("units.noUnits")}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("units.unitNumber")}</TableHead>
                    <TableHead>{t("units.building")}</TableHead>
                    <TableHead className="text-center">{t("units.floor")}</TableHead>
                    <TableHead className="text-center">{t("units.bedrooms")}</TableHead>
                    <TableHead className="text-center">{t("units.bathrooms")}</TableHead>
                    <TableHead className="text-center">{t("units.areaSqm")}</TableHead>
                    <TableHead className="text-right">{t("units.monthlyFee")}</TableHead>
                    <TableHead>{t("units.createdAt")}</TableHead>
                    {!isReadOnly && <TableHead>{t("units.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-muted-foreground" />
                          {unit.unit_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {unit.building?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {unit.floor !== null ? (
                          <Badge variant="secondary" className="gap-1">
                            <Layers className="w-3 h-3" />
                            {unit.floor}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {unit.bedrooms !== null ? (
                          <Badge variant="outline" className="gap-1">
                            <Bed className="w-3 h-3" />
                            {unit.bedrooms}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {unit.bathrooms !== null ? (
                          <Badge variant="outline" className="gap-1">
                            <Bath className="w-3 h-3" />
                            {unit.bathrooms}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {unit.area_sqm !== null ? (
                          <Badge variant="outline" className="gap-1">
                            <Ruler className="w-3 h-3" />
                            {unit.area_sqm} m²
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {unit.monthly_fee !== null ? (
                          <span className="text-green-600">{formatCurrency(unit.monthly_fee)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(unit.created_at)}
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          {canModifyUnit(unit) && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(unit)}
                                title={t("units.edit")}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDeleteDialog(unit)}
                                title={t("units.delete")}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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

      {/* Unit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredUnits.map((unit) => (
          <Card key={unit.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {unit.unit_number}
                </CardTitle>
                {!isReadOnly && canModifyUnit(unit) && (
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(unit)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <CardDescription className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {unit.building?.name || "-"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("units.floor")}:</span>
                  {unit.floor !== null ? (
                    <Badge variant="secondary">{unit.floor}</Badge>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("units.bedrooms")}:</span>
                  {unit.bedrooms !== null ? (
                    <Badge variant="outline" className="gap-1">
                      <Bed className="w-3 h-3" />
                      {unit.bedrooms}
                    </Badge>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("units.bathrooms")}:</span>
                  {unit.bathrooms !== null ? (
                    <Badge variant="outline" className="gap-1">
                      <Bath className="w-3 h-3" />
                      {unit.bathrooms}
                    </Badge>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("units.areaSqm")}:</span>
                  {unit.area_sqm !== null ? (
                    <span>{unit.area_sqm} m²</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-muted-foreground">{t("units.monthlyFee")}:</span>
                  {unit.monthly_fee !== null ? (
                    <span className="font-semibold text-green-600">{formatCurrency(unit.monthly_fee)}</span>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Unit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("units.createUnit")}</DialogTitle>
            <DialogDescription>{t("units.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="building">{t("units.building")} *</Label>
              <Select
                value={unitForm.building_id}
                onValueChange={(value) => setUnitForm({ ...unitForm, building_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("units.selectBuilding")} />
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
                value={unitForm.portal_id}
                onChange={(e) => setUnitForm({ ...unitForm, portal_id: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="unit_number">{t("units.unitNumber")} *</Label>
              <Input
                id="unit_number"
                value={unitForm.unit_number}
                onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
                placeholder={t("units.unitNumberPlaceholder")}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="floor">{t("units.floor")}</Label>
                <Input
                  id="floor"
                  type="number"
                  value={unitForm.floor}
                  onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div>
                <Label htmlFor="bedrooms">{t("units.bedrooms")}</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={unitForm.bedrooms}
                  onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })}
                  placeholder="2"
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">{t("units.bathrooms")}</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={unitForm.bathrooms}
                  onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area_sqm">{t("units.areaSqm")}</Label>
                <Input
                  id="area_sqm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitForm.area_sqm}
                  onChange={(e) => setUnitForm({ ...unitForm, area_sqm: e.target.value })}
                  placeholder="75.5"
                />
              </div>

              <div>
                <Label htmlFor="monthly_fee">{t("units.monthlyFee")}</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitForm.monthly_fee}
                  onChange={(e) => setUnitForm({ ...unitForm, monthly_fee: e.target.value })}
                  placeholder="500.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("units.cancel")}
            </Button>
            <Button onClick={handleCreateUnit} disabled={submitting}>
              {submitting ? t("units.creating") : t("units.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("units.editUnit")}</DialogTitle>
            <DialogDescription>{t("units.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editBuilding">{t("units.building")} *</Label>
              <Select
                value={unitForm.building_id}
                onValueChange={(value) => setUnitForm({ ...unitForm, building_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("units.selectBuilding")} />
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
              <Label htmlFor="editPortalId">Portal ID</Label>
              <Input
                id="editPortalId"
                type="number"
                value={unitForm.portal_id}
                onChange={(e) => setUnitForm({ ...unitForm, portal_id: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="editUnitNumber">{t("units.unitNumber")} *</Label>
              <Input
                id="editUnitNumber"
                value={unitForm.unit_number}
                onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="editFloor">{t("units.floor")}</Label>
                <Input
                  id="editFloor"
                  type="number"
                  value={unitForm.floor}
                  onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="editBedrooms">{t("units.bedrooms")}</Label>
                <Input
                  id="editBedrooms"
                  type="number"
                  min="0"
                  value={unitForm.bedrooms}
                  onChange={(e) => setUnitForm({ ...unitForm, bedrooms: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="editBathrooms">{t("units.bathrooms")}</Label>
                <Input
                  id="editBathrooms"
                  type="number"
                  min="0"
                  value={unitForm.bathrooms}
                  onChange={(e) => setUnitForm({ ...unitForm, bathrooms: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editAreaSqm">{t("units.areaSqm")}</Label>
                <Input
                  id="editAreaSqm"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitForm.area_sqm}
                  onChange={(e) => setUnitForm({ ...unitForm, area_sqm: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="editMonthlyFee">{t("units.monthlyFee")}</Label>
                <Input
                  id="editMonthlyFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitForm.monthly_fee}
                  onChange={(e) => setUnitForm({ ...unitForm, monthly_fee: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("units.cancel")}
            </Button>
            <Button onClick={handleUpdateUnit} disabled={submitting}>
              {submitting ? t("units.updating") : t("units.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("units.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("units.deleteConfirmMessage")} <strong>{selectedUnit?.unit_number}</strong>?
              <br />
              <span className="text-destructive text-sm mt-2 block">
                {t("units.deleteWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("units.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUnit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? t("units.deleting") : t("units.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UnitsManagement;
