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
import { portalGetAllMyProperties, portalGetDashboardIncidents } from "@/lib/portal-api";
import { createIncidentSynced, retrySyncQueue, updateIncidentSynced } from "@/lib/portal-sync";
import { getAllBuildings, getBuildingUnits } from "@/lib/supabase";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Incidencias = () => {
  const { profile } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
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

  const [newIncident, setNewIncident] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "MEDIA",
    tipoLocal: "maintenance",
    buildingId: "",
    unitId: "",
  });

  const [updateIncident, setUpdateIncident] = useState({
    estado: "",
    titulo: "",
    descripcion: "",
    prioridad: "",
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

  const getIncidentPropertyId = (incident: Record<string, any>) =>
    readNumber(incident, [
      "idPropiedad",
      "id_propiedad",
      "propiedadId",
      "propiedad_id",
      "propiedadIdPortal",
      "idPropiedadPortal",
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

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await portalGetDashboardIncidents();
      if (error) {
        console.error("Error fetching incidents:", error);
        toast.error("No se pudieron cargar las incidencias");
        return;
      }
      const rawIncidents = (data as any)?.data || [];
      if (!isSuperAdmin && (allowedPropertyIds.length || allowedPropertyNames.length)) {
        const allowedIds = new Set(allowedPropertyIds);
        const allowedNames = new Set(allowedPropertyNames.map((name) => name.toLowerCase()));
        const filtered = rawIncidents.filter((incident: any) => {
          const propertyId = getIncidentPropertyId(incident);
          if (propertyId !== null && allowedIds.has(propertyId)) return true;
          const propertyName = getIncidentPropertyName(incident);
          if (propertyName && allowedNames.has(propertyName.toLowerCase())) return true;
          return false;
        });
        setIncidents(filtered);
      } else {
        setIncidents(rawIncidents);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("No se pudieron cargar las incidencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [allowedPropertyIds, allowedPropertyNames, isSuperAdmin]);

  useEffect(() => {
    const fetchAllowedProperties = async () => {
      if (!profile || isSuperAdmin) {
        setAllowedPropertyIds([]);
        setAllowedPropertyNames([]);
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
      const ids = portalProperties
        .map((property) =>
          readNumber(property, ["idPropiedad", "id_propiedad", "propiedadId", "propiedad_id"])
        )
        .filter((value): value is number => value !== null);
      const names = portalProperties
        .map((property) =>
          readString(property, ["nombre", "name", "razonSocial", "razon_social", "propiedad"])
        )
        .filter(Boolean);

      console.log("[portal] allowed property IDs", ids);
      setAllowedPropertyIds(ids);
      setAllowedPropertyNames(names);
    };

    fetchAllowedProperties();
  }, [isSuperAdmin, profile]);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (profile?.building_id && allowedPropertyIds.length === 0) {
        const profileBuildingName = (profile as any)?.building?.name;
        setBuildings([{ id: profile.building_id, name: profileBuildingName || "Propiedad" }]);
        setNewIncident((prev) => ({ ...prev, buildingId: profile.building_id }));
        return;
      }
      const { buildings: fetchedBuildings, error } = await getAllBuildings();
      if (error) {
        console.error("Error fetching buildings:", error);
        return;
      }
      let buildingsToShow = fetchedBuildings || [];
      if (!isSuperAdmin && allowedPropertyIds.length > 0) {
        const allowedIds = new Set(allowedPropertyIds);
        buildingsToShow = buildingsToShow.filter((building) =>
          building?.portal_id !== null && allowedIds.has(building.portal_id)
        );
      }
      setBuildings(buildingsToShow);
    };

    fetchBuildings();
  }, [profile?.building_id, profile?.building?.name, allowedPropertyIds, isSuperAdmin]);

  useEffect(() => {
    const fetchUnits = async () => {
      if (!newIncident.buildingId) {
        setUnits([]);
        return;
      }
      const { units: fetchedUnits, error } = await getBuildingUnits(newIncident.buildingId);
      if (error) {
        console.error("Error fetching units:", error);
        return;
      }
      setUnits(fetchedUnits || []);
    };

    fetchUnits();
  }, [newIncident.buildingId]);

  const handleCreateIncident = async () => {
    if (!newIncident.titulo || !newIncident.descripcion || !newIncident.buildingId) {
      toast.error("Completa los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      const buildingId = newIncident.buildingId || profile?.building_id;
      const unitId = newIncident.unitId || undefined;
      if (!buildingId) {
        toast.error("No hay edificio asignado");
        setSubmitting(false);
        return;
      }

      const { error } = await createIncidentSynced({
        email: profile?.email || undefined,
        portalFields: {
          titulo: newIncident.titulo,
          descripcion: newIncident.descripcion,
          prioridad: newIncident.prioridad,
        },
        localPayload: {
          userId: profile?.id || "",
          buildingId,
          unitId,
          type: newIncident.tipoLocal as "maintenance" | "complaint" | "suggestion",
          title: newIncident.titulo,
          description: newIncident.descripcion,
          priority: newIncident.prioridad,
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
        prioridad: "MEDIA",
        tipoLocal: "maintenance",
        buildingId: profile?.building_id || "",
        unitId: "",
      });
      fetchIncidents();
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
      estado: "",
      titulo: incident?.titulo || "",
      descripcion: "",
      prioridad: "",
    });
    setShowUpdateDialog(true);
  };

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;
    if (!updateIncident.estado && !updateIncident.titulo && !updateIncident.descripcion && !updateIncident.prioridad) {
      toast.error("Ingresa al menos un campo para actualizar");
      return;
    }

    setSubmitting(true);
    try {
      const portalPayload: any = {};
      if (updateIncident.estado) portalPayload.estado = updateIncident.estado;
      if (updateIncident.titulo) portalPayload.titulo = updateIncident.titulo;
      if (updateIncident.descripcion) portalPayload.descripcion = updateIncident.descripcion;
      if (updateIncident.prioridad) portalPayload.prioridad = updateIncident.prioridad;

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
      fetchIncidents();
    } catch (error) {
      console.error("Error:", error);
      toast.error("No se pudo actualizar la incidencia");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryQueue = async () => {
    const result = await retrySyncQueue(profile?.email || undefined);
    if (result.remaining > 0) {
      toast.error("Quedaron elementos pendientes en cola");
    } else {
      toast.success("Cola de sincronizacion procesada");
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
              <Button variant="outline" onClick={handleRetryQueue}>
                Reintentar cola
              </Button>
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
                      <TableCell>{incident.unidad || "-"}</TableCell>
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
                value={newIncident.buildingId || "none"}
                onValueChange={(value) =>
                  setNewIncident({ ...newIncident, buildingId: value === "none" ? "" : value, unitId: "" })
                }
                disabled={!!profile?.building_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una propiedad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona una propiedad</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name || building.nombre || building.razonSocial || building.razon_social || building.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Unidad (opcional)</label>
              <Select
                value={newIncident.unitId || "none"}
                onValueChange={(value) =>
                  setNewIncident({ ...newIncident, unitId: value === "none" ? "" : value })
                }
                disabled={!newIncident.buildingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin unidad</SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.unit_number || unit.numero || unit.unidad || unit.id}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Prioridad</label>
                <Select
                  value={newIncident.prioridad}
                  onValueChange={(value) => setNewIncident({ ...newIncident, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">ALTA</SelectItem>
                    <SelectItem value="MEDIA">MEDIA</SelectItem>
                    <SelectItem value="BAJA">BAJA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo local</label>
                <Select
                  value={newIncident.tipoLocal}
                  onValueChange={(value) => setNewIncident({ ...newIncident, tipoLocal: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="complaint">Reclamo</SelectItem>
                    <SelectItem value="suggestion">Sugerencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={updateIncident.estado}
                onValueChange={(value) => setUpdateIncident({ ...updateIncident, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABIERTA">ABIERTA</SelectItem>
                  <SelectItem value="EN_PROCESO">EN_PROCESO</SelectItem>
                  <SelectItem value="RESUELTA">RESUELTA</SelectItem>
                  <SelectItem value="CERRADA">CERRADA</SelectItem>
                  <SelectItem value="RECHAZADA">RECHAZADA</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={updateIncident.prioridad}
                onValueChange={(value) => setUpdateIncident({ ...updateIncident, prioridad: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALTA">ALTA</SelectItem>
                  <SelectItem value="MEDIA">MEDIA</SelectItem>
                  <SelectItem value="BAJA">BAJA</SelectItem>
                </SelectContent>
              </Select>
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
