import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, Calendar, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { portalGetComunicado, portalGetDashboardComunicados } from "@/lib/portal-api";
import { useLocalizedField } from "@/lib/i18n-helpers";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Announcement {
  id: string;
  title_es: string;
  title_en: string | null;
  content_es: string;
  content_en: string | null;
  published_at: string | null;
  status?: string | null;
}

const Comunicados = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const getLocalizedField = useLocalizedField();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const toPortalList = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.result)) return payload.result;
    return [];
  };

  const getPortalRecord = (payload: any): any | null => {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;
    if (Array.isArray(payload?.data)) return payload.data[0] || null;
    if (payload?.data) return payload.data;
    return payload;
  };

  const readString = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return "";
  };

  const getAnnouncementContent = (announcement: Announcement) =>
    i18n.language === "en" && announcement.content_en
      ? announcement.content_en
      : announcement.content_es;

  const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ");

  const sanitizeAnnouncementHtml = (html: string) => {
    if (!html) return "";
    const hasTags = /<\/?[a-z][\s\S]*>/i.test(html);
    if (!hasTags) {
      return html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br />");
    }
    if (typeof window === "undefined") {
      return html;
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
    return doc.body.innerHTML;
  };

  const mapAnnouncement = (record: Record<string, any>, index: number, fallback?: Announcement | null): Announcement => {
    const titleEs =
      readString(record, ["titulo_es", "titulo", "title", "asunto"]) ||
      fallback?.title_es ||
      "";
    const titleEn = readString(record, ["titulo_en", "title_en"]) || fallback?.title_en || null;
    const contentEs =
      readString(record, ["contenido_es", "descripcion", "detalle", "mensaje", "contenido", "content"]) ||
      fallback?.content_es ||
      "";
    const contentEn = readString(record, ["contenido_en", "content_en"]) || fallback?.content_en || null;
    return {
      id: readString(record, ["idComunicado", "id", "codigo", "numero"]) || fallback?.id || `COM-${index + 1}`,
      title_es: titleEs,
      title_en: titleEn,
      content_es: contentEs,
      content_en: contentEn,
      published_at:
        readString(record, ["fecha", "fecha_publicacion", "published_at", "created_at"]) ||
        fallback?.published_at ||
        null,
      status: readString(record, ["estado", "status"]) || fallback?.status || null,
    };
  };

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!profile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await portalGetDashboardComunicados();
        if (result.error) {
          console.error("Error fetching announcements:", result.error);
          toast.error(t('announcements.error.load'));
          return;
        }

        const portalAnnouncements = toPortalList(result.data);
        const mappedAnnouncements = portalAnnouncements.map((announcement, index) =>
          mapAnnouncement(announcement, index)
        );
        setAnnouncements(mappedAnnouncements);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t('announcements.error.load'));
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [profile, t]);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const loadingLabel = i18n.language === "en" ? "Loading..." : "Cargando...";

  // Handle view announcement
  const handleViewAnnouncement = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailDialog(true);

    if (announcement.id.startsWith("COM-")) return;

    setLoadingDetail(true);
    try {
      const result = await portalGetComunicado(announcement.id);
      if (result.error) {
        console.error("Error fetching announcement detail:", result.error);
        return;
      }
      const record = getPortalRecord(result.data);
      if (record) {
        setSelectedAnnouncement(mapAnnouncement(record, 0, announcement));
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  // Get announcement excerpt (first 150 chars)
  const getExcerpt = (announcement: Announcement) => {
    const content = stripHtml(getAnnouncementContent(announcement));

    return content.length > 150 ? `${content.substring(0, 150)}...` : content;
  };

  const getAnnouncementDate = (announcement: Announcement) => {
    return announcement.published_at ? new Date(announcement.published_at).getTime() : 0;
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const diff = getAnnouncementDate(a) - getAnnouncementDate(b);
    return dateSort === "newest" ? -diff : diff;
  });

  const totalPages = Math.max(1, Math.ceil(sortedAnnouncements.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const pagedAnnouncements = sortedAnnouncements.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [announcements.length, dateSort]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('announcements.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('announcements.subtitle')}</p>
        </div>
        <Select value={dateSort} onValueChange={(value) => setDateSort(value as "newest" | "oldest")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Announcements List */}
      {pagedAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">{t('announcements.noAnnouncements')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('announcements.noAnnouncementsMessage')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pagedAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
              onClick={() => handleViewAnnouncement(announcement)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">
                      {getLocalizedField(announcement, 'title')}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(announcement.published_at)}</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {t('announcements.published')}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 ml-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-2">
                  {getExcerpt(announcement)}
                </p>
                <Button
                  variant="link"
                  className="px-0 mt-2 text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewAnnouncement(announcement);
                  }}
                >
                  {t('announcements.readMore')} →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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

      {/* Announcement Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedAnnouncement && getLocalizedField(selectedAnnouncement, 'title')}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4" />
                <span>{selectedAnnouncement && formatDate(selectedAnnouncement.published_at)}</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none py-4">
            <div className="text-sm text-foreground leading-relaxed">
              {loadingDetail && (
                <p className="text-muted-foreground">{loadingLabel}</p>
              )}
              {!loadingDetail && selectedAnnouncement && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizeAnnouncementHtml(getAnnouncementContent(selectedAnnouncement)),
                  }}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDetailDialog(false)}>
              {t('announcements.backToList')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Comunicados;
