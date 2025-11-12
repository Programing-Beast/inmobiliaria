import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const Aprobaciones = () => {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Aprobaciones de usuarios (pendientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>María López</TableCell>
                <TableCell>maria@ejemplo.com</TableCell>
                <TableCell>A-302</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                    Aprobar
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8">
                    Rechazar
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aprobaciones de reservas (pendientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amenity</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Quincho</TableCell>
                <TableCell>06/10/2025</TableCell>
                <TableCell>19:00–22:00</TableCell>
                <TableCell>Depto B-201 (Tenant)</TableCell>
                <TableCell className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                    Aprobar
                  </Button>
                  <Button size="sm" variant="destructive" className="h-8">
                    Rechazar
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Aprobaciones;
