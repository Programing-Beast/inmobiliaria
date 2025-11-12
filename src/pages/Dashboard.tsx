import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardProps {
  role: string;
}

const Dashboard = ({ role }: DashboardProps) => {
  return (
    <div className="grid gap-4 md:gap-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Expensas del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$ 1.250.000</div>
            <div className="text-sm text-muted-foreground">Vencimiento: 10/10/2025</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Reservas próximas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>Quincho · 06/10 19:00–22:00 · Aprobada</li>
              <li>SUM · 12/10 10:00–12:00 · Pendiente</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Incidencias abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <div className="text-sm text-muted-foreground">
              2 en Áreas Comunes · 1 en Estacionamiento
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Comunicados recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 bg-primary rounded-full" />
                Mantenimiento de ascensores · 04/10
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 bg-primary rounded-full" />
                Asamblea extraordinaria · 15/10 (Owners)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 bg-primary rounded-full" />
                Limpieza de tanques · 08/10
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Atajos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-accent hover:bg-accent/90">
                <FileDown className="w-4 h-4 mr-2" />
                Descargar factura
              </Button>
              <Button variant="secondary">Nueva reserva</Button>
              <Button variant="secondary">Reportar incidencia</Button>
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Rol actual: <b>{role}</b>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
