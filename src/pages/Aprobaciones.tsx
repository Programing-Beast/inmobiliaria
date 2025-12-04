import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";

const Aprobaciones = () => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('approvals.usersTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('approvals.user')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.email')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.unit')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="whitespace-nowrap">María López</TableCell>
                  <TableCell className="whitespace-nowrap">maria@ejemplo.com</TableCell>
                  <TableCell className="whitespace-nowrap">A-302</TableCell>
                  <TableCell>
                    <div className="flex gap-2 whitespace-nowrap">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-white h-8">
                        {t('approvals.approve')}
                      </Button>
                      <Button size="sm" className="bg-warning hover:bg-warning/90 text-white h-8">
                        {t('approvals.reject')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('approvals.reservationsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('approvals.amenity')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.date')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.time')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.requestor')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('approvals.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="whitespace-nowrap">Quincho</TableCell>
                  <TableCell className="whitespace-nowrap">06/10/2025</TableCell>
                  <TableCell className="whitespace-nowrap">19:00–22:00</TableCell>
                  <TableCell className="whitespace-nowrap">Depto B-201 (Tenant)</TableCell>
                  <TableCell>
                    <div className="flex gap-2 whitespace-nowrap">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-white h-8">
                        {t('approvals.approve')}
                      </Button>
                      <Button size="sm" className="bg-warning hover:bg-warning/90 text-white h-8">
                        {t('approvals.reject')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Aprobaciones;
