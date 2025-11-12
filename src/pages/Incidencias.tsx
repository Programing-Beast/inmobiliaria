import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Incidencias = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Incidencias / Sugerencias</CardTitle>
            <span className="text-xs text-muted-foreground">
              Al enviar, Operaciones VIEW será notificado
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
            <Input
              placeholder="Buscar por título o estado"
              className="w-full md:w-72"
            />
            <Button className="bg-accent hover:bg-accent/90">Nueva incidencia</Button>
          </div>

          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>INC-1023</TableCell>
                  <TableCell>Luces pasillo 3° piso</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                      Abierta
                    </Badge>
                  </TableCell>
                  <TableCell>04/10</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>INC-1031</TableCell>
                  <TableCell>Tapa de piscina</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                      En proceso
                    </Badge>
                  </TableCell>
                  <TableCell>03/10</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="font-medium mb-2">Contacto con agente (consultas comerciales)</div>
          <p className="text-sm text-muted-foreground">
            Enlace para ambos roles. Ejemplos: +595 971 000 000 (WhatsApp), agentes@view.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Incidencias;
