import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Finanzas = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Estado de cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>01/09/2025</TableCell>
                <TableCell>INV-000921</TableCell>
                <TableCell>$ 1.250.000</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                    Pagada
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" className="h-8 bg-accent hover:bg-accent/90">
                    <FileDown className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>01/10/2025</TableCell>
                <TableCell>INV-000985</TableCell>
                <TableCell>$ 1.250.000</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">
                    Pendiente
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" className="h-8 bg-accent hover:bg-accent/90">
                    <FileDown className="w-3 h-3 mr-1" />
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Finanzas;
