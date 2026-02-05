import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { portalGetComunicado } from "@/lib/portal-api";
import { useLocalizedField } from "@/lib/i18n-helpers";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title_es: string;
  title_en: string | null;
  content_es: string;
  content_en: string | null;
  published_at: string | null;
  status?: string | null;
}

const ComunicadoDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const getLocalizedField = useLocalizedField();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  const readString = (record: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const value = record?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return "";
  };

  const getPortalRecord = (payload: any): any | null => {
    if (!payload) return null;
    if (Array.isArray(payload)) return payload[0] || null;
    if (Array.isArray(payload?.data)) return payload.data[0] || null;
    if (payload?.data) return payload.data;
    return payload;
  };

  const mapAnnouncement = (record: Record<string, any>): Announcement => {
    const titleEs = readString(record, ["titulo_es", "titulo", "title", "asunto"]);
    const titleEn = readString(record, ["titulo_en", "title_en"]) || null;
    const contentEs = readString(record, ["contenido_es", "descripcion", "detalle", "mensaje", "contenido", "content"]);
    const contentEn = readString(record, ["contenido_en", "content_en"]) || null;
    return {
      id: readString(record, ["idComunicado", "id", "codigo", "numero"]) || id || "",
      title_es: titleEs,
      title_en: titleEn,
      content_es: contentEs,
      content_en: contentEn,
      published_at: readString(record, ["fecha", "fecha_publicacion", "published_at", "created_at"]) || null,
      status: readString(record, ["estado", "status"]) || null,
    };
  };

  const getAnnouncementContent = (item: Announcement) =>
    i18n.language === "en" && item.content_en ? item.content_en : item.content_es;

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(i18n.language === "en" ? "en-US" : "es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!id || !profile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await portalGetComunicado(id);
        if (result.error) {
          console.error("Error fetching announcement detail:", result.error);
          toast.error(t("announcements.error.load"));
          return;
        }
        const record = getPortalRecord(result.data);
        if (record) {
          setAnnouncement(mapAnnouncement(record));
        } else {
          toast.error(t("announcements.error.load"));
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("announcements.error.load"));
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id, profile, t]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!announcement) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t("announcements.noAnnouncements")}</p>
          <Button className="mt-4" onClick={() => navigate("/announcements")}>
            {t("announcements.backToList")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/announcements")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("announcements.backToList")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{getLocalizedField(announcement, "title")}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(announcement.published_at)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <div
              className="text-sm text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: sanitizeAnnouncementHtml(getAnnouncementContent(announcement)),
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComunicadoDetalle;
