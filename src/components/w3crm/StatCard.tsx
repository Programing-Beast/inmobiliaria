import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  description?: string;
  className?: string;
  iconColor?: "primary" | "success" | "warning" | "danger" | "info";
}

const iconColorClasses = {
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-danger bg-danger/10",
  info: "text-info bg-info/10",
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  iconColor = "primary"
}: StatCardProps) => {
  return (
    <Card className={cn("border-border hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconColorClasses[iconColor])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-secondary">{value}</div>
        {trend && (
          <p className={cn(
            "text-xs font-medium mt-1",
            trend.positive ? 'text-success' : 'text-danger'
          )}>
            <span>{trend.positive ? '↗' : '↘'} {trend.positive ? '+' : ''}{trend.value}%</span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
