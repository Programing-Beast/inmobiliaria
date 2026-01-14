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
import { portalGetDashboardIncidents } from "@/lib/portal-api";
import { createIncidentSynced, retrySyncQueue, updateIncidentSynced } from "@/lib/portal-sync";
import { getBuildingAmenities } from "@/lib/supabase";

const Incidencias = () => {
  const { profile } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [amenities, setAmenities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newIncident, setNewIncident] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "MEDIA",
    tipoLocal: "maintenance",
    amenityId: "",
  });

  const [updateIncident, setUpdateIncident] = useState({
    estado: "",
    titulo: "",
    descripcion: "",
    prioridad: "",
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await portalGetDashboardIncidents();
      if (error) {
        console.error("Error fetching incidents:", error);
        toast.error("No se pudieron cargar las incidencias");
        return;
      }
      setIncidents((data as any)?.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("No se pudieron cargar las incidencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  useEffect(() => {
    const fetchAmenities = async () => {
      if (!profile?.building_id) return;
      const { amenities: fetchedAmenities, error } = await getBuildingAmenities(profile.building_id);
      if (error) {
        console.error("Error fetching amenities:", error);
        return;
      }
      setAmenities(fetchedAmenities || []);
    };

    fetchAmenities();
  }, [profile]);

  const handleCreateIncident = async () => {
    if (!newIncident.titulo || !newIncident.descripcion) {
      toast.error("Completa los campos requeridos");
      return;
    }

    setSubmitting(true);
    try {
      const buildingId = profile?.building_id;
      const unitId = profile?.currentUnit?.unit_id || profile?.unit_id;
      if (!buildingId || !unitId) {
        toast.error("No hay unidad o edificio asignado");
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
          amenityId: newIncident.amenityId || undefined,
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
        amenityId: "",
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Incidencias / Sugerencias</CardTitle>
            <div className="flex gap-2">
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
                  <TableHead>Amenity</TableHead>
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
                ) : incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      Sin incidencias
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((incident, index) => (
                    <TableRow key={incident.idIncidencia ?? incident.id ?? index}>
                      <TableCell>{incident.idIncidencia ?? incident.id}</TableCell>
                      <TableCell>{incident.titulo || "-"}</TableCell>
                      <TableCell>{getStatusBadge(incident.estado)}</TableCell>
                      <TableCell>{incident.fechaModificacion || "-"}</TableCell>
                      <TableCell>{incident.unidad || "-"}</TableCell>
                      <TableCell>{incident.amenity || "-"}</TableCell>
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva incidencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amenity</label>
              <Select
                value={newIncident.amenityId || "none"}
                onValueChange={(value) =>
                  setNewIncident({ ...newIncident, amenityId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un amenity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin amenity</SelectItem>
                  {amenities.map((amenity) => (
                    <SelectItem key={amenity.id} value={amenity.id}>
                      {amenity.display_name_es || amenity.name_es || amenity.name}
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
