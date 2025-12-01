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
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Usuario</TableHead>
                  <TableHead className="whitespace-nowrap">Correo</TableHead>
                  <TableHead className="whitespace-nowrap">Unidad</TableHead>
                  <TableHead className="whitespace-nowrap">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="whitespace-nowrap">María López</TableCell>
                  <TableCell className="whitespace-nowrap">maria@ejemplo.com</TableCell>
                  <TableCell className="whitespace-nowrap">A-302</TableCell>
                  <TableCell>
                    <div className="flex gap-2 whitespace-nowrap">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-white h-8">
                        Aprobar
                      </Button>
                      <Button size="sm" className="bg-warning hover:bg-warning/90 text-white h-8">
                        Rechazar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aprobaciones de reservas (pendientes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Amenity</TableHead>
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead className="whitespace-nowrap">Hora</TableHead>
                  <TableHead className="whitespace-nowrap">Solicitante</TableHead>
                  <TableHead className="whitespace-nowrap">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="whitespace-nowrap">Quincho</TableCell>
                  <TableCell className="whitespace-nowrap">06/10/2025</TableCell>
                  <TableCell className="whitespace-nowrap">19:00–22:00</TableCell>
                  <TableCell className="whitespace-nowrap">Depto B-201 (Tenant)</TableCell>
                  <TableCell>
                    <div className="flex gap-2 whitespace-nowrap">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-white h-8">
                        Aprobar
                      </Button>
                      <Button size="sm" className="bg-warning hover:bg-warning/90 text-white h-8">
                        Rechazar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Aprobaciones;
