import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { approveReservationSynced, retrySyncQueue } from "@/lib/portal-sync";
import { portalGetApprovalsReservations } from "@/lib/portal-api";
import { toast } from "sonner";

const Aprobaciones = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const { data, error } = await portalGetApprovalsReservations();
      if (error) {
        console.error("Error fetching approvals:", error);
        toast.error(t("approvals.errorLoading"));
        return;
      }
      setReservations((data as any)?.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("approvals.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleApproveReservation = async (reservation: any) => {
    const reservationId = reservation?.idReserva ?? reservation?.id_reserva ?? reservation?.id;
    if (!reservationId) {
      toast.error("Missing reservation id");
      return;
    }

    const { error } = await approveReservationSynced({
      email: profile?.email || undefined,
      reservationId,
      localReservationId: reservation?.local_id || undefined,
      localStatus: "approved",
    });

    if (error) {
      toast.error(error.message || t("approvals.errorApproving"));
      return;
    }

    toast.success(t("approvals.approved"));
    fetchReservations();
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("approvals.reservationsTitle")}</CardTitle>
            <Button
              variant="outline"
              onClick={async () => {
                setSyncing(true);
                const result = await retrySyncQueue(profile?.email || undefined);
                if (result.remaining > 0) {
                  toast.error("Some queued items still failed");
                } else {
                  toast.success("Sync queue processed");
                }
                setSyncing(false);
              }}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Retry Sync Queue"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t("approvals.amenity")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("approvals.date")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("approvals.time")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("approvals.requestor")}</TableHead>
                  <TableHead className="whitespace-nowrap">{t("approvals.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : reservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {t("approvals.noReservations")}
                    </TableCell>
                  </TableRow>
                ) : (
                  reservations.map((reservation, index) => (
                    <TableRow key={reservation.idReserva ?? reservation.id ?? index}>
                      <TableCell className="whitespace-nowrap">{reservation.amenity || reservation.amenity_name || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">{reservation.fechaReserva || reservation.date || "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {reservation.horaInicio && reservation.horaFin
                          ? `${reservation.horaInicio} - ${reservation.horaFin}`
                          : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{reservation.solicitante || reservation.requestor || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 whitespace-nowrap">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white h-8"
                            onClick={() => handleApproveReservation(reservation)}
                          >
                            {t("approvals.approve")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Aprobaciones;
