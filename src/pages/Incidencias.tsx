import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { portalGetAllDashboardIncidents, portalGetAllMyProperties } from "@/lib/portal-api";
import { createIncidentSynced, updateIncidentSynced, syncPortalCatalog } from "@/lib/portal-sync";
import { getAllBuildings, getBuilding, getBuildingByPortalId, updateBuilding } from "@/lib/supabase";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Incidencias = () => {
  const { profile, selectedProperty } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allowedPropertyIds, setAllowedPropertyIds] = useState<number[]>([]);
  const [allowedPropertyNames, setAllowedPropertyNames] = useState<string[]>([]);
  const [allowedPropertiesLoaded, setAllowedPropertiesLoaded] = useState(false);
  const defaultLocalPriority = "low";
  const defaultType = "maintenance";

  const [newIncident, setNewIncident] = useState({
    titulo: "",
    descripcion: "",
    buildingId: "",
  });

  const [updateIncident, setUpdateIncident] = useState({
    titulo: "",
    descripcion: "",
  });

  const isSuperAdmin = profile?.role === "super_admin";

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

  const readString = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return "";
  };

  const normalizeText = (value?: string | null) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizeIncidentRecord = (incident: Record<string, any>) => {
    const idIncidencia =
      readNumber(incident, ["idIncidencia", "id_incidencia", "incidentId", "incident_id", "id"]) ??
      incident?.idIncidencia ??
      incident?.id ??
      null;
    const titulo = readString(incident, ["titulo", "title", "asunto"]);
    const estado = readString(incident, ["estado", "status"]);
    const fechaModificacion = readString(incident, [
      "fechaModificacion",
      "fecha_modificacion",
      "updated_at",
      "fecha",
    ]);
    const unidad = readString(incident, ["unidad", "unit", "unidad_desc", "unidad_nombre"]) || null;
    const propiedad = readString(incident, [
      "propiedad",
      "propiedadNombre",
      "propiedad_nombre",
      "edificio",
      "edificioNombre",
      "building",
      "building_name",
    ]);

    return {
      ...incident,
      idIncidencia,
      titulo,
      estado,
      fechaModificacion,
      unidad,
      propiedad,
    };
  };

  const getIncidentPropertyId = (incident: Record<string, any>) =>
    readNumber(incident, [
      "idPropiedad",
      "id_propiedad",
      "propiedadId",
      "propiedad_id",
      "propiedadIdPortal",
      "idPropiedadPortal",
      "idCondominio",
      "condominio_id",
      "propertyId",
      "id",
    ]);

  const getIncidentPropertyName = (incident: Record<string, any>) =>
    readString(incident, [
      "propiedad",
      "propiedadNombre",
      "propiedad_nombre",
      "edificio",
      "edificioNombre",
      "building",
      "building_name",
    ]);

  const fetchIncidents = async (options?: { silent?: boolean }) => {
    setLoading(true);
    try {
      const { data, error } = await portalGetAllDashboardIncidents();
      if (error) {
        console.error("Error fetching incidents:", error);
        if (!options?.silent) {
          toast.error("No se pudieron cargar las incidencias");
        }
        return;
      }
      const rawIncidents = Array.isArray(data) ? data : [];
      if (!isSuperAdmin) {
        const allowedIds = new Set(allowedPropertyIds);
        const allowedNames = new Set(allowedPropertyNames.map((name) => normalizeText(name)));
        const propertyFiltered = rawIncidents.filter((incident: any) => {
          const propertyId = getIncidentPropertyId(incident);
          const propertyName = getIncidentPropertyName(incident);
          if (propertyId === null && !propertyName) return true;
          if (propertyId !== null && allowedIds.has(propertyId)) return true;
          if (propertyName && allowedNames.has(normalizeText(propertyName))) return true;
          return false;
        });
        // Narrow to the globally selected property when one is active
        const filtered = selectedProperty
          ? propertyFiltered.filter((incident: any) => {
              const propertyId = getIncidentPropertyId(incident);
              const propertyName = getIncidentPropertyName(incident);
              if (propertyId === null && !propertyName) return true;
              if (propertyId === selectedProperty.idPropiedad) return true;
              if (propertyName && normalizeText(propertyName) === normalizeText(selectedProperty.nombre)) return true;
              return false;
            })
          : propertyFiltered;
        setIncidents(filtered.map((incident: any) => normalizeIncidentRecord(incident)));
      } else {
        setIncidents(rawIncidents.map((incident: any) => normalizeIncidentRecord(incident)));
      }
    } catch (error) {
      console.error("Error:", error);
      if (!options?.silent) {
        toast.error("No se pudieron cargar las incidencias");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) return;
    if (!isSuperAdmin && !allowedPropertiesLoaded) return;
    fetchIncidents();
  }, [allowedPropertyIds, allowedPropertyNames, allowedPropertiesLoaded, isSuperAdmin, profile, selectedProperty]);

  useEffect(() => {
    const fetchAllowedProperties = async () => {
      setAllowedPropertiesLoaded(false);
      if (!profile || isSuperAdmin) {
        setAllowedPropertyIds([]);
        setAllowedPropertyNames([]);
        setAllowedPropertiesLoaded(true);
        return;
      }

      try {
        if (profile.building_id) {
          const { building } = await getBuilding(profile.building_id);
          const portalId = building?.portal_id ?? null;
          const name = building?.name || "";
          setAllowedPropertyIds(portalId ? [portalId] : []);
          setAllowedPropertyNames(name ? [name] : []);
          return;
        }

        const result = await portalGetAllMyProperties();
        if (result.error) {
          console.error("Error fetching portal properties:", result.error);
          setAllowedPropertyIds([]);
          setAllowedPropertyNames([]);
          return;
        }

        const portalProperties = toPortalList(result.data);

        if (portalProperties.length > 0) {
          try {
            await syncPortalCatalog({
              email: profile?.email || undefined,
              properties: portalProperties,
              includeUnits: true,
              includeAmenities: false,
            });
          } catch (syncError) {
            console.error("Error syncing portal properties:", syncError);
          }
        }

        const ids = portalProperties
          .map((property) =>
            readNumber(property, [
              "idPropiedad",
              "id_propiedad",
              "propiedadId",
              "propiedad_id",
              "idCondominio",
              "condominio_id",
              "propertyId",
              "id",
            ])
          )
          .filter((value): value is number => value !== null);
        const names = portalProperties
          .map((property) =>
            readString(property, [
              "nombre",
              "name",
              "razonSocial",
              "razon_social",
              "propiedad",
              "condominio",
              "property",
            ])
          )
          .filter(Boolean);

        console.log("[portal] allowed property IDs", ids);
        setAllowedPropertyIds(ids);
        setAllowedPropertyNames(names);
      } finally {
        setAllowedPropertiesLoaded(true);
      }
    };

    fetchAllowedProperties();
  }, [isSuperAdmin, profile]);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!profile) {
        setBuildings([]);
        return;
      }

      let buildingsToShow: any[] = [];

      if (isSuperAdmin) {
        // Super admin sees all buildings from Turso
        const { buildings: fetchedBuildings, error } = await getAllBuildings();
        if (error) { console.error("Error fetching buildings:", error); return; }
        buildingsToShow = fetchedBuildings || [];
      } else {
        // For regular users: resolve buildings from portalProperties so all KOVE buildings show,
        // even if only one was ever synced to Turso.
        const portalProps: { idPropiedad: number; nombre: string }[] = profile.portalProperties ?? [];

        // Fallback: fetch from KOVE if profile didn't hydrate portalProperties yet
        let propsToResolve = portalProps;
        if (propsToResolve.length === 0) {
          const result = await portalGetAllMyProperties();
          if (!result.error && result.data) {
            propsToResolve = toPortalList(result.data)
              .map((p) => ({
                idPropiedad: readNumber(p, ["idPropiedad", "id_propiedad", "propiedadId"]) ?? 0,
                nombre: readString(p, ["nombre", "name", "razonSocial"]) || "",
              }))
              .filter((p) => p.idPropiedad > 0);
          }
        }

        if (propsToResolve.length === 0) {
          setBuildings([]);
          setNewIncident((prev) => ({ ...prev, buildingId: "", unitId: "" }));
          return;
        }

        // Resolve each portal property to a Turso building UUID (create if missing)
        for (const prop of propsToResolve) {
          let { building } = await getBuildingByPortalId(prop.idPropiedad);
          if (!building) {
            await syncPortalCatalog({
              email: profile.email || undefined,
              properties: [{ idPropiedad: prop.idPropiedad, nombre: prop.nombre }],
              includeUnits: false,
              includeAmenities: false,
            });
            ({ building } = await getBuildingByPortalId(prop.idPropiedad));
          }
          if (building) buildingsToShow.push(building);
        }
      }

      setBuildings(buildingsToShow);

      setNewIncident((prev) => {
        const hasSelectedBuilding = buildingsToShow.some((building) => String(building.id) === String(prev.buildingId));
        if (hasSelectedBuilding) return prev;
        // Prefer building matching the globally selected property
        const preferred = selectedProperty
          ? buildingsToShow.find(
              (b) =>
                b.portal_id === selectedProperty.idPropiedad ||
                normalizeText(b.name) === normalizeText(selectedProperty.nombre)
            )
          : null;
        const defaultBuilding = preferred ?? buildingsToShow[0];
        return {
          ...prev,
          buildingId: defaultBuilding?.id ? String(defaultBuilding.id) : "",
          unitId: "",
        };
      });
    };

    fetchBuildings();
  }, [profile, profile?.building_id, profile?.building?.name, allowedPropertyIds, allowedPropertyNames, allowedPropertiesLoaded, isSuperAdmin, selectedProperty]);

  const ensureBuildingPortalMapping = async (buildingId: string) => {
    const { building } = await getBuilding(buildingId);
    if (!building) {
      return { portalId: null, error: { message: "No se encontró el edificio" } };
    }
    if (building.portal_id) {
      return { portalId: building.portal_id, error: null };
    }

    const result = await portalGetAllMyProperties();
    if (result.error) {
      return { portalId: null, error: result.error };
    }

    const portalProperties = toPortalList(result.data);
    const buildingName = normalizeText(building.name || "");
    const match = portalProperties.find((property) => {
      const propertyName = normalizeText(
        readString(property, ["nombre", "name", "razonSocial", "razon_social", "propiedad"])
      );
      return buildingName && propertyName === buildingName;
    });
    const portalId = match
      ? readNumber(match, ["idPropiedad", "id_propiedad", "propiedadId", "propiedad_id"])
      : null;

    if (!portalId) {
      return { portalId: null, error: { message: "No hay mapeo de portal para este edificio" } };
    }

    const updateResult = await updateBuilding(buildingId, { portal_id: portalId });
    if (updateResult.error) {
      return { portalId: null, error: updateResult.error };
    }

    return { portalId, error: null };
  };


  const handleCreateIncident = async () => {
    if (!newIncident.titulo || !newIncident.descripcion || !newIncident.buildingId) {
      toast.error("Completa los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      const buildingId = newIncident.buildingId || profile?.building_id;
      if (!buildingId) {
        toast.error("No hay edificio asignado");
        setSubmitting(false);
        return;
      }
      const mappingResult = await ensureBuildingPortalMapping(buildingId);
      if (mappingResult.error) {
        toast.error(mappingResult.error.message || "No hay mapeo de portal para este edificio");
        setSubmitting(false);
        return;
      }

      const { error } = await createIncidentSynced({
        email: profile?.email || undefined,
        portalFields: {
          titulo: newIncident.titulo,
          descripcion: newIncident.descripcion,
        },
        localPayload: {
          userId: profile?.id || "",
          buildingId,
          type: defaultType as "maintenance" | "complaint" | "suggestion",
          title: newIncident.titulo,
          description: newIncident.descripcion,
          priority: defaultLocalPriority,
        },
      });

      if (error) {
        toast.error(error.message || "No se pudo crear la incidencia");
        return;
      }

      toast.success("Incidencia creada");
      setShowCreateDialog(false);
      setNewIncident({
        titulo: "",
        descripcion: "",
        buildingId: profile?.building_id || "",
      });
      setPage(1);
      await fetchIncidents({ silent: true });
    } catch (error) {
      console.error("Error:", error);
      toast.error("No se pudo crear la incidencia");
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateDialog = (incident: any) => {
    setSelectedIncident(incident);
    setUpdateIncident({
      titulo: incident?.titulo || "",
      descripcion: incident?.descripcion || "",
    });
    setShowUpdateDialog(true);
  };

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;
    if (!updateIncident.titulo.trim() && !updateIncident.descripcion.trim()) {
      toast.error("Ingresa al menos un campo para actualizar");
      return;
    }

    setSubmitting(true);
    try {
      const portalPayload: any = {};
      if (updateIncident.titulo) portalPayload.titulo = updateIncident.titulo;
      if (updateIncident.descripcion) portalPayload.descripcion = updateIncident.descripcion;
      const incidentId = selectedIncident?.idIncidencia ?? selectedIncident?.id;
      const { error } = await updateIncidentSynced({
        email: profile?.email || undefined,
        incidentId,
        portalPayload,
      });

      if (error) {
        toast.error(error.message || "No se pudo actualizar la incidencia");
        return;
      }

      toast.success("Incidencia actualizada");
      setShowUpdateDialog(false);
      setSelectedIncident(null);
      await fetchIncidents({ silent: true });
    } catch (error) {
      console.error("Error:", error);
      toast.error("No se pudo actualizar la incidencia");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    const value = status || "-";
    const normalized = value.toUpperCase();
    if (normalized === "ABIERTA") {
      return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">{value}</Badge>;
    }
    if (normalized === "EN_PROCESO") {
      return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">{value}</Badge>;
    }
    if (normalized === "RESUELTA") {
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">{value}</Badge>;
    }
    if (normalized === "CERRADA" || normalized === "RECHAZADA") {
      return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">{value}</Badge>;
    }
    return <Badge variant="outline">{value}</Badge>;
  };

  const getIncidentDate = (incident: any) => {
    const value = incident?.fechaModificacion || incident?.fecha || incident?.created_at;
    return value ? new Date(value).getTime() : 0;
  };

  const sortedIncidents = [...incidents].sort((a, b) => {
    const diff = getIncidentDate(a) - getIncidentDate(b);
    return dateSort === "newest" ? -diff : diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedIncidents.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedIncidents = sortedIncidents.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [incidents.length, dateSort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Incidencias / Sugerencias</CardTitle>
            <div className="flex gap-2">
              <Select value={dateSort} onValueChange={(value) => setDateSort(value as "newest" | "oldest")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Ordenar por fecha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Más recientes</SelectItem>
                  <SelectItem value="oldest">Más antiguas</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-accent hover:bg-accent/90" onClick={() => setShowCreateDialog(true)}>
                Nueva incidencia
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizado</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : pagedIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      Sin incidencias
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedIncidents.map((incident, index) => (
                    <TableRow key={incident.idIncidencia ?? incident.id ?? index}>
                      <TableCell>{incident.idIncidencia ?? incident.id}</TableCell>
                      <TableCell>{incident.titulo || "-"}</TableCell>
                      <TableCell>{getStatusBadge(incident.estado)}</TableCell>
                      <TableCell>{incident.fechaModificacion || "-"}</TableCell>
                      <TableCell>{incident.unidad || "Area comun"}</TableCell>
                      <TableCell>{incident.propiedad || incident.propiedadNombre || incident.edificio || "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openUpdateDialog(incident)}>
                          Actualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva incidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Propiedad *</label>
              <Select
                value={newIncident.buildingId ? String(newIncident.buildingId) : "none"}
                onValueChange={(value) =>
                  setNewIncident({ ...newIncident, buildingId: value === "none" ? "" : value })
                }
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una propiedad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona una propiedad</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={String(building.id)}>
                      {building.name || building.nombre || building.razonSocial || building.razon_social || building.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Titulo *</label>
              <Input
                value={newIncident.titulo}
                onChange={(e) => setNewIncident({ ...newIncident, titulo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripcion *</label>
              <Textarea
                value={newIncident.descripcion}
                onChange={(e) => setNewIncident({ ...newIncident, descripcion: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateIncident} disabled={submitting}>
              {submitting ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar incidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titulo</label>
              <Input
                value={updateIncident.titulo}
                onChange={(e) => setUpdateIncident({ ...updateIncident, titulo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripcion</label>
              <Textarea
                value={updateIncident.descripcion}
                onChange={(e) => setUpdateIncident({ ...updateIncident, descripcion: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateIncident} disabled={submitting}>
              {submitting ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Incidencias;
