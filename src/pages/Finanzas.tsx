import { useState, useEffect } from "react";
import { FileDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import Unauthorized from "@/components/Unauthorized";
import { portalGetFinanzasPagos } from "@/lib/portal-api";
import { toast } from "sonner";
import type { PaymentStatus } from "@/lib/database.types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Payment {
  id: string;
  invoice_number: string | null;
  ruc: string | null;
  timbrado: string | null;
  document_type: string | null;
  total_amount: number;
  balance: number;
  status: PaymentStatus;
  recorded_at: string | null;
  due_date: string | null;
  pdf_url: string | null;
}

const Finanzas = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const toPortalList = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  };

  const readString = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return "";
  };

  const readNumber = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      const asNumber = Number(value);
      if (Number.isFinite(asNumber)) return asNumber;
    }
    return null;
  };

  const normalizeText = (value?: string | null) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizeDocumentType = (type?: string | null) => {
    const value = normalizeText(type);
    if (!value) return null;
    if (value.includes("factura")) return "factura";
    if (value.includes("nota") && value.includes("credito")) return "nota_credito";
    if (value.includes("informe") && value.includes("financ")) return "informe_financiero";
    if (value.includes("recibo") && value.includes("dinero")) return "recibo_dinero";
    return null;
  };

  const normalizePaymentStatus = (status?: string): PaymentStatus => {
    const value = (status || "").toLowerCase();
    if (["pagado", "paid"].includes(value)) return "paid";
    if (["pendiente", "pending"].includes(value)) return "pending";
    if (["vencido", "overdue", "mora"].includes(value)) return "overdue";
    return "pending";
  };

  // Fetch payments based on user role
  useEffect(() => {
    const fetchPayments = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        const result = await portalGetFinanzasPagos();
        if (result.error) {
          console.error("Error fetching payments:", result.error);
          toast.error(t("finance.error.load"));
          return;
        }

        const portalPayments = toPortalList(result.data);
        const mappedPayments: Payment[] = portalPayments.map((payment, index) => ({
          id: readString(payment, ["idFactura", "id", "codigo", "numero"]) || `FAC-${index + 1}`,
          invoice_number: readString(payment, ["numFactura", "numero", "invoice_number"]) || null,
          ruc: readString(payment, ["ruc"]) || null,
          timbrado: readString(payment, ["timbrado"]) || null,
          document_type: normalizeDocumentType(
            readString(payment, ["tipoDocumento", "tipo_documento", "tipo", "document_type", "tipoComprobante"])
          ),
          total_amount: readNumber(payment, ["montoTotal", "total", "monto_total"]) ?? 0,
          balance: readNumber(payment, ["saldo", "balance"]) ?? 0,
          status: normalizePaymentStatus(readString(payment, ["estado", "status"])),
          recorded_at: readString(payment, ["fechaGrabado", "created_at", "fecha"]) || null,
          due_date: readString(payment, ["fechaVencimiento", "fecha_vencimiento", "due_date"]) || null,
          pdf_url: readString(payment, ["pdf", "pdf_url", "url"]) || null,
        }));

        setPayments(mappedPayments);
        setFilteredPayments(mappedPayments);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("finance.error.load"));
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [profile, t]);

  // Filter payments based on search, status, and type
  useEffect(() => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.ruc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.timbrado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(payment => payment.document_type === typeFilter);
    }

    setFilteredPayments(filtered);
    setPage(1);
  }, [searchTerm, statusFilter, typeFilter, payments]);

  // Get status badge
  const getStatusBadge = (status: PaymentStatus) => {
    const statusConfig = {
      paid: { variant: "outline" as const, className: "bg-green-100 text-green-700 border-green-200", label: t('finance.paid') },
      pending: { variant: "outline" as const, className: "bg-yellow-100 text-yellow-700 border-yellow-200", label: t('finance.pending') },
      overdue: { variant: "outline" as const, className: "bg-red-100 text-red-700 border-red-200", label: t('finance.overdue') }
    };

    const config = statusConfig[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat("es-PY", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
    return `Gs. ${formatted}`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const isOwner = profile?.role === "owner";

  const getPaymentDate = (payment: Payment) => {
    const value = payment.recorded_at || payment.due_date;
    return value ? new Date(value).getTime() : 0;
  };

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const diff = getPaymentDate(a) - getPaymentDate(b);
    return dateSort === "newest" ? -diff : diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedPayments.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedPayments = sortedPayments.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [dateSort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (!profile) {
    return null;
  }

  if (!isOwner) {
    return <Unauthorized />;
  }

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ["ID", "Factura", "RUC", "Timbrado", "Monto Total", "Saldo", "Estado", "Fecha de emisión", "Fecha vencimiento", "PDF"].join(','),
      ...filteredPayments.map(payment =>
        [
          payment.id,
          payment.invoice_number || '-',
          payment.ruc || '-',
          payment.timbrado || '-',
          payment.total_amount,
          payment.balance,
          payment.status,
          formatDate(payment.recorded_at),
          formatDate(payment.due_date),
          payment.pdf_url || '-'
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conceptos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Archivo exportado exitosamente');
  };

  const documentTypeOptions = [
    { value: "factura", label: "Factura" },
    { value: "nota_credito", label: "Nota de crédito" },
    { value: "informe_financiero", label: "Informe financiero" },
    { value: "recibo_dinero", label: "Recibo de dinero" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary">{t('finance.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('finance.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={filteredPayments.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            {t('finance.export')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('finance.searchConcepts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('finance.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('finance.allTypes')}</SelectItem>
                {documentTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('finance.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('finance.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('finance.pending')}</SelectItem>
                <SelectItem value="paid">{t('finance.paid')}</SelectItem>
                <SelectItem value="overdue">{t('finance.overdue')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Sort */}
            <Select value={dateSort} onValueChange={(value) => setDateSort(value as "newest" | "oldest")}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.sortByDate")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("common.newestFirst")}</SelectItem>
              <SelectItem value="oldest">{t("common.oldestFirst")}</SelectItem>
            </SelectContent>
          </Select>
          </div>
        </CardContent>
      </Card>

      {/* Concepts Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('finance.concepts')}</CardTitle>
          <CardDescription>
            {filteredPayments.length} {filteredPayments.length === 1 ? 'concepto' : 'conceptos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pagedPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{searchTerm || statusFilter !== 'all' ? 'No se encontraron conceptos con los filtros aplicados' : 'No hay conceptos registrados'}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>Timbrado</TableHead>
                    <TableHead>Monto Total</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de emisión</TableHead>
                    <TableHead>Fecha vencimiento</TableHead>
                    <TableHead>PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                      <TableCell className="font-semibold">{payment.invoice_number || "-"}</TableCell>
                      <TableCell>{payment.ruc || "-"}</TableCell>
                      <TableCell>{payment.timbrado || "-"}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payment.total_amount)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payment.balance)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{formatDate(payment.recorded_at)}</TableCell>
                      <TableCell>{formatDate(payment.due_date)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => {
                            if (payment.pdf_url) {
                              window.open(payment.pdf_url, "_blank", "noopener,noreferrer");
                            }
                          }}
                          disabled={!payment.pdf_url}
                        >
                          <FileDown className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{page}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default Finanzas;
