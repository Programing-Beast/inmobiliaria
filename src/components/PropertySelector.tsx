import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export const PropertySelector = () => {
  const { profile, selectedProperty, setSelectedProperty } = useAuth();
  const properties = profile?.portalProperties ?? [];

  if (properties.length <= 1) return null;

  return (
    <Select
      value={selectedProperty ? String(selectedProperty.idPropiedad) : ""}
      onValueChange={(val) => {
        const found = properties.find((p) => String(p.idPropiedad) === val);
        if (found) setSelectedProperty(found);
      }}
    >
      <SelectTrigger className="h-9 w-[200px] border-primary/30 bg-orange-50/60 text-sm font-medium hidden md:flex">
        <Building2 className="h-4 w-4 mr-2 text-primary shrink-0" />
        <SelectValue placeholder="Seleccionar edificio" />
      </SelectTrigger>
      <SelectContent>
        {properties.map((p) => (
          <SelectItem key={p.idPropiedad} value={String(p.idPropiedad)}>
            {p.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
