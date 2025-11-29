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
  primary: "text-primary bg-primary/10 shadow-primary",
  success: "text-success bg-success/10 shadow-success",
  warning: "text-warning bg-warning/10 shadow-warning",
  danger: "text-danger bg-danger/10 shadow-danger",
  info: "text-info bg-info/10 shadow-primary",
};

const iconBorderClasses = {
  primary: "border-primary/20",
  success: "border-success/20",
  warning: "border-warning/20",
  danger: "border-danger/20",
  info: "border-info/20",
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
    <Card className={cn(
      "border-border hover-lift transition-smooth overflow-hidden relative group",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-muted/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
      className
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full blur-2xl -z-10" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center border transition-all duration-300",
          "group-hover:scale-110 group-hover:rotate-3",
          iconColorClasses[iconColor],
          iconBorderClasses[iconColor]
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-secondary tracking-tight">{value}</div>
        {trend && (
          <div className="flex items-center gap-2 mt-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
              trend.positive
                ? 'bg-success/10 text-success border border-success/20'
                : 'bg-danger/10 text-danger border border-danger/20'
            )}>
              <span className="text-base leading-none">{trend.positive ? '↗' : '↘'}</span>
              <span>{trend.positive ? '+' : ''}{trend.value}%</span>
            </div>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};
