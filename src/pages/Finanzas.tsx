import { useState, useEffect } from "react";
import { FileDown, Search, Filter, Plus } from "lucide-react";
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
import { getBuildingPayments, getUserPayments } from "@/lib/supabase";
import { toast } from "sonner";
import type { PaymentStatus, ConceptType } from "@/lib/database.types";

interface Payment {
  id: string;
  concept_type: ConceptType;
  concept_description: string | null;
  amount: number;
  status: PaymentStatus;
  due_date: string | null;
  payment_date: string | null;
  unit: {
    unit_number: string;
  } | null;
  user?: {
    full_name: string;
    email: string;
  } | null;
  created_at: string;
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

  // Fetch payments based on user role
  useEffect(() => {
    const fetchPayments = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        let result;

        // Owners see all building payments, others see only their own
        if (profile.role === 'owner' && profile.building_id) {
          result = await getBuildingPayments(profile.building_id);
        } else {
          result = await getUserPayments(profile.id);
        }

        if (result.error) {
          console.error('Error fetching payments:', result.error);
          toast.error(t('finance.error.load'));
          return;
        }

        setPayments(result.payments || []);
        setFilteredPayments(result.payments || []);
      } catch (error) {
        console.error('Error:', error);
        toast.error(t('finance.error.load'));
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
        payment.concept_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.unit?.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(payment => payment.concept_type === typeFilter);
    }

    setFilteredPayments(filtered);
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

  // Get concept type label
  const getConceptTypeLabel = (type: ConceptType) => {
    const typeLabels = {
      invoice_credit: t('finance.invoiceCredit'),
      invoice_cash: t('finance.invoiceCash'),
      receipt: t('finance.receipt'),
      credit_note: t('finance.creditNote')
    };
    return typeLabels[type];
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
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

  // Export to CSV
  const handleExport = () => {
    const csv = [
      [t('finance.id'), t('finance.unit'), t('finance.type'), t('finance.description'), t('finance.amount'), t('finance.status'), t('finance.dueDate'), t('finance.paymentDate')].join(','),
      ...filteredPayments.map(payment =>
        [
          payment.id,
          payment.unit?.unit_number || '-',
          getConceptTypeLabel(payment.concept_type),
          payment.concept_description || '-',
          payment.amount,
          payment.status,
          formatDate(payment.due_date),
          formatDate(payment.payment_date)
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
                <SelectItem value="invoice_credit">{t('finance.invoiceCredit')}</SelectItem>
                <SelectItem value="invoice_cash">{t('finance.invoiceCash')}</SelectItem>
                <SelectItem value="receipt">{t('finance.receipt')}</SelectItem>
                <SelectItem value="credit_note">{t('finance.creditNote')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('finance.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('finance.allStatuses')}</SelectItem>
                <SelectItem value="paid">{t('finance.paid')}</SelectItem>
                <SelectItem value="pending">{t('finance.pending')}</SelectItem>
                <SelectItem value="overdue">{t('finance.overdue')}</SelectItem>
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
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? 'No se encontraron conceptos con los filtros aplicados' : 'No hay conceptos registrados'}</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('finance.id')}</TableHead>
                    {profile?.role === 'owner' && <TableHead>{t('finance.unit')}</TableHead>}
                    <TableHead>{t('finance.type')}</TableHead>
                    <TableHead>{t('finance.description')}</TableHead>
                    <TableHead>{t('finance.amount')}</TableHead>
                    <TableHead>{t('finance.status')}</TableHead>
                    <TableHead>{t('finance.dueDate')}</TableHead>
                    <TableHead>{t('finance.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                      {profile?.role === 'owner' && (
                        <TableCell className="font-semibold">{payment.unit?.unit_number || '-'}</TableCell>
                      )}
                      <TableCell>
                        <Badge variant="secondary">
                          {getConceptTypeLabel(payment.concept_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.concept_description || '-'}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{formatDate(payment.due_date)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-8">
                          <FileDown className="w-3 h-3 mr-1" />
                          {t('finance.viewReceipt')}
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
    </div>
  );
};

export default Finanzas;
