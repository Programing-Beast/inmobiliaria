import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Reservas = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reservas de amenities</CardTitle>
          <div className="flex items-center gap-2">
            <Select defaultValue="quincho">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quincho">Quincho</SelectItem>
                <SelectItem value="sum">SUM</SelectItem>
                <SelectItem value="piscina">Piscina</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-accent hover:bg-accent/90">Nueva reserva</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Rules Cards */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <div className="font-medium mb-1">Horarios permitidos</div>
            <div className="text-xs">L–V 08:00–22:00 · S–D 10:00–22:00</div>
          </div>
          <div className="p-3 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
            <div className="font-medium mb-1">Costos</div>
            <div className="text-xs">Quincho: $150.000 / 3 h · Depósito $50.000</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-100">
            <div className="font-medium mb-1">Confirmación</div>
            <div className="text-xs">Hasta 24 h para confirmar tras subir comprobante.</div>
          </div>
        </div>

        {/* Calendar Mock */}
        <div className="grid grid-cols-7 gap-2 text-xs mb-2 text-muted-foreground">
          <div className="text-center">L</div>
          <div className="text-center">M</div>
          <div className="text-center">M</div>
          <div className="text-center">J</div>
          <div className="text-center">V</div>
          <div className="text-center">S</div>
          <div className="text-center">D</div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((day) => (
            <div key={day} className="h-20 bg-muted/30 rounded-lg border p-1 text-xs">
              {day}
            </div>
          ))}
          <div className="h-20 bg-muted/30 rounded-lg border p-1 text-xs flex flex-col">
            6
            <span className="text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary mt-1">
              Quincho 19-22h
            </span>
          </div>
          <div className="h-20 bg-muted/30 rounded-lg border p-1 text-xs">7</div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <Button className="bg-accent hover:bg-accent/90">
            Adjuntar comprobante de pago
          </Button>
          <Button variant="secondary">Descargar recibo de amenity</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Reservas;
