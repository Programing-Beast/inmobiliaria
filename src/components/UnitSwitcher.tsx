import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface UserUnit {
  unit_id: string;
  unit_number: string;
  building_id: string;
  building_name: string;
  is_primary: boolean;
  relationship_type: string;
  floor: number | null;
  area_sqm: number | null;
}

interface UnitSwitcherProps {
  variant?: 'dropdown' | 'card';
  className?: string;
}

export const UnitSwitcher = ({ variant = 'dropdown', className }: UnitSwitcherProps) => {
  const { profile, setCurrentUnit } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const units = profile?.units || [];
  const currentUnit = profile?.currentUnit;

  // Don't show if user has 0 or 1 unit
  if (units.length <= 1) {
    return null;
  }

  const handleUnitSelect = (unit: UserUnit) => {
    setCurrentUnit(unit);
    setOpen(false);
  };

  const getRelationshipBadge = (type: string) => {
    const config = {
      owner: { label: t('units.owner') || 'Owner', className: 'bg-blue-100 text-blue-700' },
      tenant: { label: t('units.tenant') || 'Tenant', className: 'bg-green-100 text-green-700' },
      resident: { label: t('units.resident') || 'Resident', className: 'bg-purple-100 text-purple-700' },
    };
    return config[type as keyof typeof config] || config.resident;
  };

  if (variant === 'dropdown') {
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn('justify-between gap-2 min-w-[200px]', className)}
          >
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="font-medium">
                {currentUnit?.unit_number || t('units.selectUnit')}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>{t('units.myUnits') || 'My Units'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {units.map((unit) => (
            <DropdownMenuItem
              key={unit.unit_id}
              onClick={() => handleUnitSelect(unit)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{unit.unit_number}</span>
                    {unit.is_primary && (
                      <Badge variant="outline" className="text-xs">
                        {t('units.primary') || 'Primary'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {unit.building_name}
                    </span>
                  </div>
                </div>
                {currentUnit?.unit_id === unit.unit_id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Card variant for Profile page
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          {t('units.myUnits') || 'My Units'}
        </CardTitle>
        <CardDescription>
          {t('units.description') || 'You have access to multiple units. Select one to view its details.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {units.map((unit) => (
            <Card
              key={unit.unit_id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md border-2',
                currentUnit?.unit_id === unit.unit_id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:border-primary/30'
              )}
              onClick={() => handleUnitSelect(unit)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{unit.unit_number}</h4>
                      {unit.is_primary && (
                        <Badge variant="outline" className="text-xs">
                          {t('units.primary') || 'Primary'}
                        </Badge>
                      )}
                      {currentUnit?.unit_id === unit.unit_id && (
                        <Badge className="bg-primary text-xs">
                          {t('units.current') || 'Current'}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        <span>{unit.building_name}</span>
                      </div>
                      {unit.floor !== null && (
                        <div className="flex items-center gap-2">
                          <span>
                            {t('units.floor') || 'Floor'}: {unit.floor}
                          </span>
                        </div>
                      )}
                      {unit.area_sqm !== null && (
                        <div className="flex items-center gap-2">
                          <span>
                            {t('units.area') || 'Area'}: {unit.area_sqm} m²
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={getRelationshipBadge(unit.relationship_type).className}
                      >
                        {getRelationshipBadge(unit.relationship_type).label}
                      </Badge>
                    </div>
                  </div>
                  {currentUnit?.unit_id === unit.unit_id && (
                    <Check className="h-6 w-6 text-primary flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default UnitSwitcher;
