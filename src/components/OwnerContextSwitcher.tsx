import { useMemo, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type OwnerContextSwitcherProps = {
  className?: string;
};

export const OwnerContextSwitcher = ({ className }: OwnerContextSwitcherProps) => {
  const { t } = useTranslation();
  const { profile, setCurrentUnit } = useAuth();
  const [open, setOpen] = useState(false);

  if (!profile || profile.role !== "owner") {
    return null;
  }

  const units = profile.units || [];
  const buildings = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; units: typeof units }
    >();
    units.forEach((unit) => {
      if (!unit.building_id) return;
      if (!map.has(unit.building_id)) {
        map.set(unit.building_id, {
          id: unit.building_id,
          name: unit.building_name || t("ownerContext.unnamedBuilding"),
          units: [],
        });
      }
      map.get(unit.building_id)?.units.push(unit);
    });
    return Array.from(map.values());
  }, [units, t]);

  if (buildings.length === 0) {
    return null;
  }

  const currentBuildingId =
    profile.currentUnit?.building_id || profile.building_id || buildings[0]?.id;
  const currentBuilding = buildings.find((b) => b.id === currentBuildingId) || buildings[0];

  const handleBuildingSelect = (buildingId: string) => {
    if (buildingId === currentBuilding?.id) {
      setOpen(false);
      return;
    }
    const building = buildings.find((b) => b.id === buildingId);
    const preferredUnit =
      building?.units.find((u) => u.is_primary) || building?.units[0];
    if (preferredUnit) {
      setCurrentUnit(preferredUnit);
    }
    setOpen(false);
  };

  if (buildings.length === 1) {
    return (
      <Button
        variant="outline"
        className={cn("hidden lg:flex items-center gap-2", className)}
        disabled
      >
        <Building2 className="h-4 w-4" />
        <span className="font-medium">{currentBuilding?.name}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("hidden lg:flex items-center gap-2 min-w-[220px] justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">
              {currentBuilding?.name || t("ownerContext.select")}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px]">
        <DropdownMenuLabel>{t("ownerContext.title")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {buildings.map((building) => (
          <DropdownMenuItem
            key={building.id}
            onClick={() => handleBuildingSelect(building.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{building.name}</span>
              {currentBuilding?.id === building.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default OwnerContextSwitcher;
