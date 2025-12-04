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
  Bell,
  Users,
  FileText,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

const DashboardW3CRM = () => {
  const { t } = useTranslation();

  const recentPayments = [
    {
      id: "PAY-001",
      unit: "Depto A-302",
      concept: "Expensas Noviembre",
      amount: "$1.250.000",
      status: "paid",
      date: "2025-11-28",
    },
    {
      id: "PAY-002",
      unit: "Depto B-105",
      concept: "Expensas Noviembre",
      amount: "$980.000",
      status: "pending",
      date: "2025-11-25",
    },
    {
      id: "PAY-003",
      unit: "Depto C-201",
      concept: "Reserva Quincho",
      amount: "$150.000",
      status: "paid",
      date: "2025-11-27",
    },
    {
      id: "PAY-004",
      unit: "Depto A-401",
      concept: "Expensas Octubre",
      amount: "$1.100.000",
      status: "overdue",
      date: "2025-10-15",
    },
  ];

  const upcomingReservations = [
    { amenity: "Quincho/BBQ", unit: "A-302", date: "06 Dic", status: "confirmed" },
    { amenity: "Piscina", unit: "B-105", date: "10 Dic", status: "pending" },
    { amenity: "Gimnasio", unit: "C-201", date: "12 Dic", status: "confirmed" },
    { amenity: "Salón SUM", unit: "A-501", date: "15 Dic", status: "confirmed" },
  ];

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

    return (
      <Badge variant={variants[status]} dot>
        {t(statusKeys[status])}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalUnits')}
          value="45"
          icon={Home}
          iconColor="primary"
          trend={{ value: 2, positive: true }}
        />
        <StatCard
          title={t('dashboard.activeReservations')}
          value="12"
          icon={Calendar}
          iconColor="success"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title={t('dashboard.monthlyPayments')}
          value="$52.450.000"
          icon={DollarSign}
          iconColor="warning"
          trend={{ value: 15, positive: true }}
        />
        <StatCard
          title={t('dashboard.openIncidents')}
          value="3"
          icon={AlertCircle}
          iconColor="info"
          trend={{ value: 2, positive: false }}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
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
                {recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell>{payment.unit}</TableCell>
                    <TableCell>{payment.concept}</TableCell>
                    <TableCell className="font-semibold">{payment.amount}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{payment.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataCard>

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
            {upcomingReservations.map((reservation, index) => (
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
            ))}
          </div>
        </DataCard>
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DataCard
          title={t('dashboard.financialSummary')}
          description={t('dashboard.financialSummaryDesc')}
        >
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>{t('dashboard.chartPlaceholder')}</p>
          </div>
        </DataCard>

        <DataCard
          title={t('dashboard.recentActivity')}
          description={t('dashboard.recentActivityDesc')}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">{t('dashboard.newResidentRegistered')}</p>
                <p className="text-xs text-muted-foreground">María López - Depto A-302</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">{t('dashboard.reservationConfirmed')}</p>
                <p className="text-xs text-muted-foreground">Quincho - 06/12 19:00-22:00</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">{t('dashboard.paymentReceived')}</p>
                <p className="text-xs text-muted-foreground">$1.250.000 - Depto B-105</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                <AlertCircle className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">{t('dashboard.newIncidentReported')}</p>
                <p className="text-xs text-muted-foreground">Filtración en estacionamiento</p>
              </div>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
};

export default DashboardW3CRM;
