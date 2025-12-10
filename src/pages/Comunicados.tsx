import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { getBuildingAnnouncements } from "@/lib/supabase";
import { useLocalizedField } from "@/lib/i18n-helpers";
import { toast } from "sonner";

interface Announcement {
  id: string;
  building_id: string;
  title_es: string;
  title_en: string | null;
  content_es: string;
  content_en: string | null;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const Comunicados = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const getLocalizedField = useLocalizedField();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!profile) return;

      if (!profile.building_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { announcements: fetchedAnnouncements, error } = await getBuildingAnnouncements(profile.building_id);

        if (error) {
          console.error('Error fetching announcements:', error);
          toast.error(t('announcements.error.load'));
          return;
        }

        setAnnouncements(fetchedAnnouncements || []);
      } catch (error) {
        console.error('Error:', error);
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

  // Handle view announcement
  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailDialog(true);
  };

  // Get announcement excerpt (first 150 chars)
  const getExcerpt = (announcement: Announcement) => {
    const content = i18n.language === 'en' && announcement.content_en
      ? announcement.content_en
      : announcement.content_es;

    return content.length > 150 ? `${content.substring(0, 150)}...` : content;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile?.building_id) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('announcements.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('announcements.subtitle')}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No Building Assigned</p>
            <p className="text-sm text-muted-foreground mt-1">Please contact your administrator to assign you to a building.</p>
          </CardContent>
        </Card>
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
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">{t('announcements.noAnnouncements')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('announcements.noAnnouncementsMessage')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
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
            <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {selectedAnnouncement && (
                i18n.language === 'en' && selectedAnnouncement.content_en
                  ? selectedAnnouncement.content_en
                  : selectedAnnouncement.content_es
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
