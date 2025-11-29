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
    <Card className={cn("border-border", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold text-secondary">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </CardDescription>
          )}
        </div>
        {headerAction ? (
          headerAction
        ) : actions && actions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {actions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={action.onClick}>
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};
