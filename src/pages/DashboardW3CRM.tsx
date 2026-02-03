import { useEffect, useState } from "react";
import { StatCard } from "@/components/w3crm/StatCard";
import { DataCard } from "@/components/w3crm/DataCard";
import { Badge } from "@/components/w3crm/Badge";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  AlertCircle,
  Eye,
  Download,
  MoreVertical,
  Users,
  DollarSign,
} from "lucide-react";
import {
  portalGetDashboardComunicados,
  portalGetDashboardExpensas,
  portalGetDashboardIncidents,
  portalGetDashboardReservations,
  portalGetMyProperties,
} from "@/lib/portal-api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

type DashboardReservation = {
  amenity: string;
  unit: string;
  date: string;
  status: string;
};

type DashboardActivity = {
  title: string;
  description?: string;
};

const DashboardW3CRM = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [upcomingReservations, setUpcomingReservations] = useState<DashboardReservation[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [stats, setStats] = useState({
    totalUnits: "-",
    activeReservations: "-",
    openIncidents: "-",
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

  const normalizeReservationStatus = (status?: string) => {
    const value = (status || "").toLowerCase();
    if (["confirmado", "confirmed", "aprobado", "approved"].includes(value)) return "confirmed";
    if (["pendiente", "pending"].includes(value)) return "pending";
    return "pending";
  };

  const getRecordPropertyId = (record: Record<string, any>) =>
    readNumber(record, [
      "idPropiedad",
      "id_propiedad",
      "propiedadId",
      "propiedad_id",
      "idEdificio",
      "edificioId",
      "building_id",
    ]);

  const getRecordPropertyName = (record: Record<string, any>) =>
    readString(record, [
      "propiedad",
      "propiedadNombre",
      "propiedad_nombre",
      "edificio",
      "edificioNombre",
      "building",
      "building_name",
      "razonSocial",
      "razon_social",
    ]);

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        let allowedPropertyIds: number[] = [];
        let allowedPropertyNames: string[] = [];
        if (!isSuperAdmin) {
          const propertiesResult = await portalGetMyProperties({ page: 1, limit: 200 });
          if (!propertiesResult.error) {
            const portalProperties = toPortalList(propertiesResult.data);
            allowedPropertyIds = portalProperties
              .map((property) =>
                readNumber(property, ["idPropiedad", "id_propiedad", "propiedadId", "propiedad_id"])
              )
              .filter((value): value is number => value !== null);
            allowedPropertyNames = portalProperties
              .map((property) =>
                readString(property, ["nombre", "name", "razonSocial", "razon_social", "propiedad"])
              )
              .filter(Boolean);
            console.log("[portal] allowed property IDs", allowedPropertyIds);
          }
        }

        const [
          expensasResult,
          reservasResult,
          incidenciasResult,
          comunicadosResult,
        ] = await Promise.all([
          portalGetDashboardExpensas(),
          portalGetDashboardReservations(),
          portalGetDashboardIncidents(),
          portalGetDashboardComunicados(),
        ]);

        if (!active) return;

        const allowedIds = new Set(allowedPropertyIds);
        const allowedNames = new Set(allowedPropertyNames.map((name) => name.toLowerCase()));
        const shouldFilter = !isSuperAdmin && (allowedIds.size || allowedNames.size);

        const reservasRaw = toPortalList(reservasResult.data);
        const incidenciasRaw = toPortalList(incidenciasResult.data);
        const reservas = shouldFilter
          ? reservasRaw.filter((record: any) => {
              const propertyId = getRecordPropertyId(record);
              if (propertyId !== null && allowedIds.has(propertyId)) return true;
              const propertyName = getRecordPropertyName(record);
              if (propertyName && allowedNames.has(propertyName.toLowerCase())) return true;
              return false;
            })
          : reservasRaw;
        const incidencias = shouldFilter
          ? incidenciasRaw.filter((record: any) => {
              const propertyId = getRecordPropertyId(record);
              if (propertyId !== null && allowedIds.has(propertyId)) return true;
              const propertyName = getRecordPropertyName(record);
              if (propertyName && allowedNames.has(propertyName.toLowerCase())) return true;
              return false;
            })
          : incidenciasRaw;
        const comunicados = toPortalList(comunicadosResult.data);
        const expensasSummary = toPortalList(expensasResult.data)[0] || expensasResult.data || {};

        const openIncidentsCount = incidencias.filter((incident: any) => {
          const estado = String(incident?.estado || incident?.status || "").toUpperCase();
          return ["ABIERTA", "EN_PROCESO", "OPEN", "IN_PROGRESS"].includes(estado);
        }).length;

        const totalUnitsValue =
          readNumber(expensasSummary, ["total_unidades", "totalUnits", "cant_unidades", "cantidadUnidades"]) ??
          null;

        setStats({
          totalUnits: totalUnitsValue !== null ? String(totalUnitsValue) : "-",
          activeReservations: String(reservas.length || 0),
          openIncidents: String(openIncidentsCount || 0),
        });

        const mappedReservations = reservas.map((reservation: any) => ({
          amenity: readString(reservation, ["amenity", "quincho", "amenidad", "titulo", "nombre"]) || "-",
          unit: readString(reservation, ["unidad", "unit", "unidad_desc", "unidad_nombre"]) || "-",
          date: readString(reservation, ["fecha", "fechaReserva", "reservation_date", "created_at"]) || "-",
          status: normalizeReservationStatus(readString(reservation, ["estado", "status"])),
        }));

        setUpcomingReservations(mappedReservations.slice(0, 6));


        const mappedActivity = comunicados.map((comunicado: any) => ({
          title: readString(comunicado, ["titulo", "title", "asunto"]) || t("dashboard.recentActivity"),
          description: readString(comunicado, ["descripcion", "description", "fecha", "created_at"]),
        }));

        setRecentActivity(mappedActivity.slice(0, 4));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      active = false;
    };
  }, [t, isSuperAdmin]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "info"> = {
      confirmed: "success",
      pending: "warning",
    };

    const statusKeys: Record<string, string> = {
      confirmed: "dashboard.confirmed",
      pending: "dashboard.pending",
    };

    const safeStatus = statusKeys[status] ? status : "pending";

    return (
      <Badge variant={variants[safeStatus]} dot>
        {t(statusKeys[safeStatus])}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-secondary">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard.export')}
          </Button>
          <Button size="sm">
            <Eye className="h-4 w-4 mr-2" />
            {t('dashboard.viewReports')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={t('dashboard.totalUnits')}
          value={stats.totalUnits}
          icon={Home}
          iconColor="primary"
          trend={{ value: 2, positive: true }}
        />
        <StatCard
          title={t('dashboard.activeReservations')}
          value={stats.activeReservations}
          icon={Calendar}
          iconColor="success"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title={t('dashboard.openIncidents')}
          value={stats.openIncidents}
          icon={AlertCircle}
          iconColor="info"
          trend={{ value: 2, positive: false }}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Reservations */}
        <DataCard
          title={t('dashboard.upcomingReservations')}
          description={t('dashboard.upcomingReservationsDesc')}
          headerAction={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : upcomingReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reservas</p>
            ) : (
              upcomingReservations.map((reservation, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-secondary">{reservation.amenity}</p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-secondary">{reservation.date}</p>
                    {getStatusBadge(reservation.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </DataCard>
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DataCard
          title={t('dashboard.recentActivity')}
          description={t('dashboard.recentActivityDesc')}
        >
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad</p>
            ) : (
              recentActivity.map((activity, index) => {
                const iconList = [Users, Calendar, DollarSign, AlertCircle];
                const Icon = iconList[index % iconList.length];
                const toneList = ["primary", "success", "warning", "info"];
                const tone = toneList[index % toneList.length];
                const toneClass =
                  tone === "primary"
                    ? "bg-primary/10 text-primary"
                    : tone === "success"
                    ? "bg-success/10 text-success"
                    : tone === "warning"
                    ? "bg-warning/10 text-warning"
                    : "bg-info/10 text-info";

                return (
                  <div key={`${activity.title}-${index}`} className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${toneClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DataCard>
      </div>
    </div>
  );
};

export default DashboardW3CRM;
