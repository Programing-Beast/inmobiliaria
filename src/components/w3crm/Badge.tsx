import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-all",
  {
    variants: {
      variant: {
        primary: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/30",
        secondary: "bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 hover:border-secondary/30",
        success: "bg-success/10 text-success border border-success/20 hover:bg-success/20 hover:border-success/30",
        warning: "bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 hover:border-warning/30",
        danger: "bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 hover:border-danger/30",
        info: "bg-info/10 text-info border border-info/20 hover:bg-info/20 hover:border-info/30",
        outline: "border border-border bg-transparent hover:bg-muted/50",
        solid: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
      },
      size: {
        xs: "text-[10px] px-2 py-0.5 rounded-md",
        sm: "text-[11px] px-2.5 py-0.5",
        md: "text-xs px-3 py-1",
        lg: "text-sm px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ className, variant, size, dot, pulse, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span className="relative mr-1.5 flex h-2 w-2">
          {pulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </div>
  );
}
