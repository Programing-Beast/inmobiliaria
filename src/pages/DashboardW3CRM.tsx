import { useEffect, useState } from "react";
import { StatCard } from "@/components/w3crm/StatCard";
import { DataCard } from "@/components/w3crm/DataCard";
import { Badge } from "@/components/w3crm/Badge";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  Download,
  MoreVertical,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  portalGetDashboardComunicados,
  portalGetDashboardExpensas,
  portalGetDashboardIncidents,
  portalGetDashboardReservations,
  portalGetFinanzasPagos,
  portalGetFinanzasResumen,
} from "@/lib/portal-api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

type DashboardPayment = {
  id: string;
  unit: string;
  concept: string;
  amount: string;
  status: string;
  date: string;
};

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
  const isOwner = profile?.role === "owner";
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<DashboardPayment[]>([]);
  const [upcomingReservations, setUpcomingReservations] = useState<DashboardReservation[]>([]);
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [financialSummary, setFinancialSummary] = useState<{
    paid?: string;
    pending?: string;
    overdue?: string;
  } | null>(null);
  const [stats, setStats] = useState({
    totalUnits: "-",
    activeReservations: "-",
    openIncidents: "-",
  });

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

  const formatCurrency = (value: unknown) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "number") {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }).format(value);
    }
    const raw = String(value);
    const parsed = Number(raw.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }).format(parsed);
    }
    return raw || "-";
  };

  const normalizePaymentStatus = (status?: string) => {
    const value = (status || "").toLowerCase();
    if (["pagado", "paid"].includes(value)) return "paid";
    if (["pendiente", "pending"].includes(value)) return "pending";
    if (["vencido", "overdue", "mora"].includes(value)) return "overdue";
    return "pending";
  };

  const normalizeReservationStatus = (status?: string) => {
    const value = (status || "").toLowerCase();
    if (["confirmado", "confirmed", "aprobado", "approved"].includes(value)) return "confirmed";
    if (["pendiente", "pending"].includes(value)) return "pending";
    return "pending";
  };

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const pagosPromise = isOwner ? portalGetFinanzasPagos() : Promise.resolve({ data: [], error: null });
        const resumenPromise = isOwner ? portalGetFinanzasResumen() : Promise.resolve({ data: [], error: null });
        const [
          expensasResult,
          reservasResult,
          incidenciasResult,
          pagosResult,
          resumenResult,
          comunicadosResult,
        ] = await Promise.all([
          portalGetDashboardExpensas(),
          portalGetDashboardReservations(),
          portalGetDashboardIncidents(),
          pagosPromise,
          resumenPromise,
          portalGetDashboardComunicados(),
        ]);

        if (!active) return;

        const reservas = toPortalList(reservasResult.data);
        const incidencias = toPortalList(incidenciasResult.data);
        const pagos = toPortalList(pagosResult.data);
        const comunicados = toPortalList(comunicadosResult.data);
        const expensasSummary = toPortalList(expensasResult.data)[0] || expensasResult.data || {};
        const finanzasSummary = toPortalList(resumenResult.data)[0] || resumenResult.data || {};

        const openIncidentsCount = incidencias.filter((incident: any) => {
          const estado = String(incident?.estado || incident?.status || "").toUpperCase();
          return ["ABIERTA", "EN_PROCESO", "OPEN", "IN_PROGRESS"].includes(estado);
        }).length;

        const totalUnitsValue =
          readNumber(expensasSummary, ["total_unidades", "totalUnits", "cant_unidades", "cantidadUnidades"]) ??
          readNumber(finanzasSummary, ["total_unidades", "totalUnits"]);

        setStats({
          totalUnits: totalUnitsValue !== null ? String(totalUnitsValue) : "-",
          activeReservations: String(reservas.length || 0),
          openIncidents: String(openIncidentsCount || 0),
        });

        const mappedPayments = pagos.map((payment: any, index: number) => ({
          id: readString(payment, ["idPago", "id", "codigo", "numero"]) || `PAY-${index + 1}`,
          unit: readString(payment, ["unidad", "unit", "unidad_desc", "unidad_nombre"]) || "-",
          concept: readString(payment, ["concepto", "concept", "descripcion", "detalle"]) || "-",
          amount: formatCurrency(readNumber(payment, ["monto", "importe", "total", "monto_total"]) ?? payment?.monto),
          status: normalizePaymentStatus(readString(payment, ["estado", "status"])),
          date: readString(payment, ["fecha", "fecha_pago", "created_at", "fechaPago"]) || "-",
        }));

        setRecentPayments(isOwner ? mappedPayments.slice(0, 6) : []);

        const mappedReservations = reservas.map((reservation: any) => ({
          amenity: readString(reservation, ["amenity", "quincho", "amenidad", "titulo", "nombre"]) || "-",
          unit: readString(reservation, ["unidad", "unit", "unidad_desc", "unidad_nombre"]) || "-",
          date: readString(reservation, ["fecha", "fechaReserva", "reservation_date", "created_at"]) || "-",
          status: normalizeReservationStatus(readString(reservation, ["estado", "status"])),
        }));

        setUpcomingReservations(mappedReservations.slice(0, 6));

        setFinancialSummary(
          isOwner
            ? {
                paid: formatCurrency(readNumber(finanzasSummary, ["pagado", "paid", "total_pagado", "monto_pagado"]) ?? null),
                pending: formatCurrency(
                  readNumber(finanzasSummary, ["pendiente", "pending", "total_pendiente", "monto_pendiente"]) ?? null
                ),
                overdue: formatCurrency(
                  readNumber(finanzasSummary, ["vencido", "overdue", "total_vencido", "monto_vencido"]) ?? null
                ),
              }
            : null
        );

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
  }, [isOwner, t]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "info"> = {
      paid: "success",
      pending: "warning",
      overdue: "info",
      confirmed: "success",
    };

    const statusKeys: Record<string, string> = {
      paid: "dashboard.paid",
      pending: "dashboard.pending",
      overdue: "dashboard.overdue",
      confirmed: "dashboard.confirmed",
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
        {/* Recent Payments */}
        {isOwner && (
          <DataCard
            title={t('dashboard.recentPayments')}
            description={t('dashboard.recentPaymentsDesc')}
            className="lg:col-span-2"
            actions={[
              { label: t('dashboard.viewAll'), onClick: () => console.log("View all") },
              { label: t('dashboard.export'), onClick: () => console.log("Export") },
            ]}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.id')}</TableHead>
                    <TableHead>{t('dashboard.unit')}</TableHead>
                    <TableHead>{t('dashboard.concept')}</TableHead>
                    <TableHead>{t('dashboard.amount')}</TableHead>
                    <TableHead>{t('dashboard.status')}</TableHead>
                    <TableHead>{t('dashboard.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : recentPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        Sin pagos
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.id}</TableCell>
                        <TableCell>{payment.unit}</TableCell>
                        <TableCell>{payment.concept}</TableCell>
                        <TableCell className="font-semibold">{payment.amount}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.date}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </DataCard>
        )}

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
        {isOwner && (
          <DataCard
            title={t('dashboard.financialSummary')}
            description={t('dashboard.financialSummaryDesc')}
          >
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : financialSummary ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.paid')}</span>
                    <span className="font-medium text-secondary">{financialSummary.paid || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.pending')}</span>
                    <span className="font-medium text-secondary">{financialSummary.pending || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.overdue')}</span>
                    <span className="font-medium text-secondary">{financialSummary.overdue || "-"}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t('dashboard.chartPlaceholder')}</p>
              )}
            </div>
          </DataCard>
        )}

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
