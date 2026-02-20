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
  document_type: string | null;
  document_type_raw: string | null;
  total_amount: number;
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

  const documentTypeCodeMap: Record<string, string> = {
    "1": "factura",
    "2": "nota_credito",
    "3": "informe_financiero",
    "4": "recibo_dinero",
  };

  const normalizeDocumentType = (type?: string | null) => {
    const value = normalizeText(type);
    if (!value) return null;

    const numeric = value.replace(/^0+/, "");
    if (numeric && documentTypeCodeMap[numeric]) return documentTypeCodeMap[numeric];

    if (value.includes("factura") || value.includes("invoice")) return "factura";
    if (
      (value.includes("nota") && value.includes("credito")) ||
      value.includes("credit note") ||
      value.includes("creditnote")
    )
      return "nota_credito";
    if (
      (value.includes("informe") && value.includes("financ")) ||
      value.includes("financial report") ||
      value.includes("reporte financiero")
    )
      return "informe_financiero";
    if (value.includes("recibo") || value.includes("receipt")) return "recibo_dinero";

    const compact = value.replace(/[^a-z0-9]/g, "");
    if (
      ["fc", "fac", "fact", "factura", "invoice", "inv"].includes(compact) ||
      ["fc", "fac", "fact", "inv"].some((prefix) => compact.startsWith(prefix))
    )
      return "factura";
    if (
      ["nc", "ncr", "notacredito", "creditnote", "cn"].includes(compact) ||
      ["nc", "ncr"].some((prefix) => compact.startsWith(prefix))
    )
      return "nota_credito";
    if (
      [
        "if",
        "inf",
        "informe",
        "informefinanciero",
        "financialreport",
        "finreport",
        "reportefinanciero",
      ].includes(compact) ||
      ["inf", "if"].some((prefix) => compact.startsWith(prefix))
    )
      return "informe_financiero";
    if (
      ["rd", "rc", "rec", "recibo", "recibodinero", "receipt", "moneyreceipt"].includes(compact) ||
      ["rc", "rec", "rd"].some((prefix) => compact.startsWith(prefix))
    )
      return "recibo_dinero";

    return null;
  };

  const extractTextValue = (value: unknown) => {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return String(value);
    return "";
  };

  const pickDocumentTypeLabel = (value: unknown, allowLooseLabel: boolean) => {
    const text = extractTextValue(value);
    if (!text) return "";
    if (normalizeDocumentType(text)) return text;
    if (allowLooseLabel && /[a-zA-Z]/.test(text)) return text;
    return "";
  };

  const scanValueForDocumentType = (value: unknown, depth = 0): string => {
    if (depth > 3) return "";

    const direct = pickDocumentTypeLabel(value, false);
    if (direct) return direct;

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = scanValueForDocumentType(item, depth + 1);
        if (found) return found;
      }
      return "";
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      for (const [key, entryValue] of entries) {
        const allowLoose = /(document|comprobante|tipo|doc)/i.test(key);
        const keyed = pickDocumentTypeLabel(entryValue, allowLoose);
        if (keyed) return keyed;
        const found = scanValueForDocumentType(entryValue, depth + 1);
        if (found) return found;
      }
    }

    return "";
  };

  const readDocumentTypeRaw = (record: Record<string, any>) => {
    const direct = pickDocumentTypeLabel(
      readString(record, [
        "tipoDocumento",
        "tipo_documento",
        "tipoComprobante",
        "tipo_comprobante",
        "document_type",
        "documentType",
        "tipoDoc",
        "tipo_doc",
        "tipo",
      ]),
      true
    );
    if (direct) return direct;

    const nestedCandidates = [
      record?.documento,
      record?.document_type,
      record?.documentType,
      record?.tipoDocumento,
      record?.tipo_documento,
      record?.tipoComprobante,
      record?.tipo_comprobante,
      record?.tipoDoc,
      record?.tipo_doc,
      record?.tipo,
      record?.comprobante,
    ];

    for (const candidate of nestedCandidates) {
      if (!candidate) continue;
      if (typeof candidate === "object") {
        const nested = pickDocumentTypeLabel(
          readString(candidate as Record<string, any>, [
            "descripcion",
            "description",
            "nombre",
            "name",
            "label",
            "tipo",
            "value",
            "codigo",
            "code",
            "sigla",
            "abreviatura",
            "abbr",
          ]),
          true
        );
        if (nested) return nested;
        const deepNested = scanValueForDocumentType(candidate, 1);
        if (deepNested) return deepNested;
      } else {
        const rawCandidate = pickDocumentTypeLabel(candidate, true);
        if (rawCandidate) return rawCandidate;
      }
    }

    const keyPattern =
      /(tipo.*(document|comprobante)|document.*tipo|comprobante.*tipo|documenttype|doctype|tipodoc|tipodocumento|tipocomprobante)/i;

    for (const [key, value] of Object.entries(record || {})) {
      if (!keyPattern.test(key)) continue;
      if (value && typeof value === "object") {
        const nested = pickDocumentTypeLabel(
          readString(value as Record<string, any>, [
            "descripcion",
            "description",
            "nombre",
            "name",
            "label",
            "tipo",
            "value",
            "codigo",
            "code",
            "sigla",
            "abreviatura",
            "abbr",
          ]),
          true
        );
        if (nested) return nested;
        const deepNested = scanValueForDocumentType(value, 1);
        if (deepNested) return deepNested;
      }
      const keyedValue = pickDocumentTypeLabel(value, true);
      if (keyedValue) return keyedValue;
    }

    const deepScan = scanValueForDocumentType(record, 0);
    if (deepScan) return deepScan;

    return "";
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
        const mappedPayments: Payment[] = portalPayments.map((payment, index) => {
          const documentTypeRaw = readDocumentTypeRaw(payment) || null;

          return {
            id: readString(payment, ["idFactura", "id", "codigo", "numero"]) || `FAC-${index + 1}`,
            invoice_number: readString(payment, ["numFactura", "numero", "invoice_number"]) || null,
            ruc: readString(payment, ["ruc"]) || null,
            document_type: normalizeDocumentType(documentTypeRaw),
            document_type_raw: documentTypeRaw,
            total_amount: readNumber(payment, ["montoTotal", "total", "monto_total"]) ?? 0,
            status: normalizePaymentStatus(readString(payment, ["estado", "status"])),
            recorded_at: readString(payment, ["fechaGrabado", "created_at", "fecha"]) || null,
            due_date: readString(payment, ["fechaVencimiento", "fecha_vencimiento", "due_date"]) || null,
            pdf_url: readString(payment, ["pdf", "pdf_url", "url"]) || null,
          };
        });

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

  // Filter payments based on search and type
  useEffect(() => {
    let filtered = [...payments];

    // Search filter
    if (searchTerm) {
      const normalizedTerm = normalizeText(searchTerm);
      filtered = filtered.filter(payment => {
        const typeLabel = normalizeText(
          getDocumentTypeLabel(payment.document_type, payment.document_type_raw)
        );
        return (
          normalizeText(payment.invoice_number || "").includes(normalizedTerm) ||
          normalizeText(payment.ruc || "").includes(normalizedTerm) ||
          normalizeText(payment.id).includes(normalizedTerm) ||
          normalizeText(payment.document_type || "").includes(normalizedTerm) ||
          normalizeText(payment.document_type_raw || "").includes(normalizedTerm) ||
          typeLabel.includes(normalizedTerm)
        );
      });
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(payment => payment.document_type === typeFilter);
    }

    setFilteredPayments(filtered);
    setPage(1);
  }, [searchTerm, typeFilter, payments]);

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

  const getDocumentTypeLabel = (type?: string | null, raw?: string | null) => {
    const labels: Record<string, string> = {
      factura: t("finance.documentTypeFactura"),
      nota_credito: t("finance.documentTypeCreditNote"),
      informe_financiero: t("finance.documentTypeFinancialReport"),
      recibo_dinero: t("finance.documentTypeReceipt"),
    };
    if (type && labels[type]) return labels[type];
    if (raw) return raw;
    return "-";
  };

  const renderDocumentType = (type?: string | null, raw?: string | null) => {
    const label = getDocumentTypeLabel(type, raw);
    if (label === "-") return "-";

    const typeConfig: Record<string, { className: string }> = {
      factura: { className: "bg-blue-100 text-blue-700 border-blue-200" },
      nota_credito: { className: "bg-purple-100 text-purple-700 border-purple-200" },
      informe_financiero: { className: "bg-slate-100 text-slate-700 border-slate-200" },
      recibo_dinero: { className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    };

    const config = type ? typeConfig[type] : undefined;
    if (!config) return label;

    return (
      <Badge variant="outline" className={config.className}>
        {label}
      </Badge>
    );
  };

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
      ["ID", "Factura", "RUC", "Tipo", "Monto Total", "Estado", "Fecha de emisión", "Fecha vencimiento", "PDF"].join(','),
      ...filteredPayments.map(payment =>
        [
          payment.id,
          payment.invoice_number || '-',
          payment.ruc || '-',
          getDocumentTypeLabel(payment.document_type, payment.document_type_raw),
          payment.total_amount,
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
    { value: "factura", label: t("finance.documentTypeFactura") },
    { value: "nota_credito", label: t("finance.documentTypeCreditNote") },
    { value: "informe_financiero", label: t("finance.documentTypeFinancialReport") },
    { value: "recibo_dinero", label: t("finance.documentTypeReceipt") },
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-muted-foreground">{searchTerm || typeFilter !== 'all' ? 'No se encontraron conceptos con los filtros aplicados' : 'No hay conceptos registrados'}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Factura</TableHead>
                    <TableHead>RUC</TableHead>
                    <TableHead>{t("finance.type")}</TableHead>
                    {/* <TableHead>Timbrado</TableHead> */}
                    <TableHead>Monto Total</TableHead>
                    {/* <TableHead>Saldo</TableHead> */}
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
                      <TableCell>
                        {renderDocumentType(payment.document_type, payment.document_type_raw)}
                      </TableCell>
                      {/* <TableCell>{payment.timbrado || "-"}</TableCell> */}
                      <TableCell className="font-semibold">{formatCurrency(payment.total_amount)}</TableCell>
                      {/* <TableCell className="font-semibold">{formatCurrency(payment.balance)}</TableCell> */}
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
