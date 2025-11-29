import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: { label: string; onClick: () => void }[];
  headerAction?: React.ReactNode;
}

export const DataCard = ({
  title,
  description,
  children,
  className,
  actions,
  headerAction,
}: DataCardProps) => {
  return (
    <Card className={cn(
      "border-border hover-lift transition-smooth group relative overflow-hidden",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 relative z-10">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold text-secondary tracking-tight">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {description}
            </CardDescription>
          )}
        </div>
        {headerAction ? (
          <div className="ml-4">
            {headerAction}
          </div>
        ) : actions && actions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-4 hover:bg-muted/80 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {actions.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={action.onClick}
                  className="cursor-pointer"
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-10">{children}</CardContent>
    </Card>
  );
};
