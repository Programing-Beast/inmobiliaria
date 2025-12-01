import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, DollarSign, Upload, Download, ChevronLeft, ChevronRight, Plus, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const Reservas = () => {
  const [selectedAmenity, setSelectedAmenity] = useState("quincho");
  const [currentMonth] = useState(new Date());

  const amenities = [
    { value: "quincho", label: "Quincho/BBQ", icon: "🍖", color: "bg-orange-500" },
    { value: "piscina", label: "Piscina", icon: "🏊", color: "bg-blue-500" },
    { value: "gym", label: "Gimnasio", icon: "💪", color: "bg-purple-500" },
    { value: "sum", label: "Salón SUM", icon: "🎉", color: "bg-pink-500" },
    { value: "cancha", label: "Cancha Deportes", icon: "⚽", color: "bg-green-500" },
  ];

  const amenityDetails = {
    quincho: { price: "$150.000", duration: "3 horas", deposit: "$50.000" },
    piscina: { price: "$80.000", duration: "2 horas", deposit: "$30.000" },
    gym: { price: "$50.000", duration: "2 horas", deposit: "$20.000" },
    sum: { price: "$200.000", duration: "4 horas", deposit: "$80.000" },
    cancha: { price: "$100.000", duration: "2 horas", deposit: "$40.000" },
  };

  const bookings = [
    { day: 6, time: "19:00-22:00", amenity: "Quincho", status: "confirmed" },
    { day: 10, time: "15:00-17:00", amenity: "Piscina", status: "pending" },
    { day: 15, time: "10:00-12:00", amenity: "Gym", status: "confirmed" },
  ];

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const selectedAmenityData = amenities.find(a => a.value === selectedAmenity);
  const details = amenityDetails[selectedAmenity as keyof typeof amenityDetails];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reservas de Amenities</h1>
          <p className="text-muted-foreground mt-1">Gestiona y reserva los espacios comunes del edificio</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg gap-2">
          <Plus className="h-5 w-5" />
          Nueva Reserva
        </Button>
      </div>

      {/* Amenity Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {amenities.map((amenity) => (
          <Card
            key={amenity.value}
            className={cn(
              "cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2",
              selectedAmenity === amenity.value
                ? "border-primary bg-primary/5 shadow-md"
                : "border-transparent hover:border-primary/30"
            )}
            onClick={() => setSelectedAmenity(amenity.value)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-2">{amenity.icon}</div>
              <p className={cn(
                "text-sm font-semibold",
                selectedAmenity === amenity.value ? "text-primary" : "text-foreground"
              )}>
                {amenity.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Horarios Permitidos</p>
                <p className="text-sm font-semibold">L-V: 08:00-22:00</p>
                <p className="text-xs text-muted-foreground">S-D: 10:00-22:00</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success bg-gradient-to-br from-success/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo por Reserva</p>
                <p className="text-lg font-bold text-success">{details.price}</p>
                <p className="text-xs text-muted-foreground">{details.duration}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning bg-gradient-to-br from-warning/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Depósito Reembolsable</p>
                <p className="text-lg font-bold text-warning">{details.deposit}</p>
                <p className="text-xs text-muted-foreground">Devuelto en 48h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info bg-gradient-to-br from-info/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Info className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confirmación</p>
                <p className="text-sm font-semibold">24 horas</p>
                <p className="text-xs text-muted-foreground">Tras subir comprobante</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section */}
      <Card>
        <CardContent className="p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">
                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const booking = bookings.find(b => b.day === day);
              const isToday = day === new Date().getDate();

              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-24 p-2 rounded-xl border-2 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md",
                    isToday && "border-primary bg-primary/5",
                    booking && "bg-gradient-to-br from-success/10 to-transparent border-success/30",
                    !booking && !isToday && "border-border hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "text-sm font-semibold mb-1",
                    isToday && "text-primary",
                    booking && "text-success"
                  )}>
                    {day}
                  </div>
                  {booking && (
                    <div className="space-y-1">
                      <Badge variant="outline" className="text-[10px] w-full justify-center bg-success/10 border-success/30 text-success">
                        {booking.time}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {booking.amenity}
                      </div>
                      {booking.status === "confirmed" && (
                        <Badge className="text-[9px] w-full justify-center bg-success text-white">
                          ✓ Confirmado
                        </Badge>
                      )}
                      {booking.status === "pending" && (
                        <Badge variant="outline" className="text-[9px] w-full justify-center bg-warning/10 border-warning text-warning">
                          ⏱ Pendiente
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20 hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Adjuntar Comprobante</h3>
                <p className="text-sm text-muted-foreground">Sube tu comprobante de pago</p>
              </div>
              <Button className="bg-primary hover:bg-primary/90">
                Subir
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-success/20 hover:border-success/50 transition-all cursor-pointer hover:shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-success/10 flex items-center justify-center">
                <Download className="h-7 w-7 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Descargar Recibo</h3>
                <p className="text-sm text-muted-foreground">Obtén tu recibo de reserva</p>
              </div>
              <Button variant="outline" className="border-success text-success hover:bg-success/10">
                Descargar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Reservations */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Mis Reservas Activas
          </h3>
          <div className="space-y-3">
            {bookings.map((booking, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-xl border-2 hover:border-primary/50 transition-all bg-gradient-to-r from-muted/30 to-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                    {amenities.find(a => a.label.includes(booking.amenity))?.icon || "📅"}
                  </div>
                  <div>
                    <p className="font-semibold">{booking.amenity}</p>
                    <p className="text-sm text-muted-foreground">
                      Día {booking.day} • {booking.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {booking.status === "confirmed" ? (
                    <Badge className="bg-success text-white">✓ Confirmado</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-warning/10 border-warning text-warning">
                      ⏱ Pendiente
                    </Badge>
                  )}
                  <Button variant="outline" size="sm">Ver Detalles</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reservas;
