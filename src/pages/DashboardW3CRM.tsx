import { StatCard } from "@/components/w3crm/StatCard";
import { DataCard } from "@/components/w3crm/DataCard";
import { Badge } from "@/components/w3crm/Badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Eye,
  Download,
  MoreVertical,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DashboardW3CRM = () => {
  const recentOrders = [
    {
      id: "#12345",
      customer: "John Doe",
      product: "iPhone 14 Pro",
      amount: "$999",
      status: "completed",
      date: "2025-11-28",
    },
    {
      id: "#12346",
      customer: "Jane Smith",
      product: "MacBook Air",
      amount: "$1,299",
      status: "pending",
      date: "2025-11-28",
    },
    {
      id: "#12347",
      customer: "Bob Johnson",
      product: "AirPods Pro",
      amount: "$249",
      status: "processing",
      date: "2025-11-27",
    },
    {
      id: "#12348",
      customer: "Alice Brown",
      product: "iPad Pro",
      amount: "$799",
      status: "completed",
      date: "2025-11-27",
    },
  ];

  const topProducts = [
    { name: "iPhone 14 Pro", sales: 1234, revenue: "$1,232,766", trend: 12 },
    { name: "MacBook Air", sales: 987, revenue: "$1,281,963", trend: 8 },
    { name: "AirPods Pro", sales: 2341, revenue: "$583,109", trend: -3 },
    { name: "iPad Pro", sales: 456, revenue: "$364,344", trend: 5 },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "info"> = {
      completed: "success",
      pending: "warning",
      processing: "info",
    };
    return (
      <Badge variant={variants[status]} dot>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-secondary">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value="2,543"
          icon={Users}
          iconColor="primary"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Total Orders"
          value="1,245"
          icon={ShoppingCart}
          iconColor="success"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Total Revenue"
          value="$45,231"
          icon={DollarSign}
          iconColor="warning"
          trend={{ value: 23, positive: true }}
        />
        <StatCard
          title="Growth Rate"
          value="23.5%"
          icon={TrendingUp}
          iconColor="info"
          trend={{ value: 5, positive: true }}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <DataCard
          title="Recent Orders"
          description="Latest customer orders from your store"
          className="lg:col-span-2"
          actions={[
            { label: "View All Orders", onClick: () => console.log("View all") },
            { label: "Export Data", onClick: () => console.log("Export") },
          ]}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>{order.product}</TableCell>
                    <TableCell className="font-semibold">{order.amount}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-muted-foreground">{order.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataCard>

        {/* Top Products */}
        <DataCard
          title="Top Products"
          description="Best selling products this month"
          headerAction={
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          }
        >
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-secondary">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sales.toLocaleString()} sales
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-secondary">{product.revenue}</p>
                  <p
                    className={`text-xs font-medium ${
                      product.trend >= 0 ? "text-success" : "text-danger"
                    }`}
                  >
                    {product.trend >= 0 ? "↗" : "↘"} {Math.abs(product.trend)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      {/* Additional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DataCard
          title="Sales Overview"
          description="Monthly sales performance"
        >
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>Chart will be integrated here (Recharts)</p>
          </div>
        </DataCard>

        <DataCard
          title="Customer Activity"
          description="Recent customer interactions"
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">New customer registered</p>
                <p className="text-xs text-muted-foreground">John Doe joined 5 minutes ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">Order completed</p>
                <p className="text-xs text-muted-foreground">Order #12345 was delivered</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-secondary">Payment received</p>
                <p className="text-xs text-muted-foreground">$1,299 from Jane Smith</p>
              </div>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
};

export default DashboardW3CRM;
