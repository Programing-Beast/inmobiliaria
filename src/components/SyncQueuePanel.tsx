import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSyncQueue, retrySyncQueue } from "@/lib/portal-sync";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SyncQueuePanel = () => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<ReturnType<typeof getSyncQueue>>([]);
  const [syncing, setSyncing] = useState(false);

  const loadQueue = () => {
    setJobs(getSyncQueue());
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleRetry = async () => {
    setSyncing(true);
    const result = await retrySyncQueue(profile?.email || undefined);
    if (result.remaining > 0) {
      toast.error("Some queued items still failed");
    } else {
      toast.success("Sync queue processed");
    }
    loadQueue();
    setSyncing(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Pending Sync Queue</CardTitle>
        <Button variant="outline" onClick={handleRetry} disabled={syncing || jobs.length === 0}>
          {syncing ? "Syncing..." : "Retry Sync Queue"}
        </Button>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending sync jobs.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Last Error</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>{job.type}</TableCell>
                    <TableCell>{job.attempts}</TableCell>
                    <TableCell className="max-w-[360px] truncate">{job.lastError || "-"}</TableCell>
                    <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SyncQueuePanel;
