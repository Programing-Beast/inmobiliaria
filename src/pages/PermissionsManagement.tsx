import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Edit, Trash2, Search, Users, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
} from "@/lib/supabase";
import { toast } from "sonner";
import type { UserRole } from "@/lib/database.types";

// Permission interface matching database schema
interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

// Role permission interface
interface RolePermissionRow {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
  permission?: Permission;
}

// Available resources from the system
const RESOURCES = [
  "dashboard",
  "finances",
  "payments",
  "reservations",
  "amenities",
  "incidents",
  "announcements",
  "documents",
  "users",
  "approvals",
  "permissions",
];

// Available actions
const ACTIONS = [
  "view",
  "view_own",
  "view_all",
  "view_stats",
  "create",
  "update",
  "update_own",
  "delete",
  "approve",
  "reject",
  "assign",
  "export",
  "upload",
  "publish",
  "cancel_own",
  "resolve",
  "deactivate",
  "assign_unit",
];

// User roles
const ROLES: UserRole[] = ["super_admin", "owner", "tenant", "regular_user"];

const PermissionsManagement = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);

  // Role permissions state - maps role to array of permission IDs
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    super_admin: [],
    owner: [],
    tenant: [],
    regular_user: [],
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("permissions");
  const [selectedRole, setSelectedRole] = useState<UserRole>("super_admin");

  // Form state for creating/editing permission - matches DB columns
  const [permissionForm, setPermissionForm] = useState({
    name: "",
    resource: "",
    action: "",
    description: "",
  });

  // Fetch all permissions and role mappings from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!profile || profile.role !== "super_admin") return;

      setLoading(true);
      try {
        // Fetch all permissions from database
        const { permissions: fetchedPermissions, error: permError } = await getAllPermissions();

        if (permError) {
          console.error("Error fetching permissions:", permError);
          toast.error(t("permissions.error.load"));
          return;
        }

        setPermissions(fetchedPermissions || []);
        setFilteredPermissions(fetchedPermissions || []);

        // Fetch role permissions for all roles
        const rolePermsMap: Record<UserRole, string[]> = {
          super_admin: [],
          owner: [],
          tenant: [],
          regular_user: [],
        };

        for (const role of ROLES) {
          const { rolePermissions: rp, error } = await getRolePermissions(role);
          if (!error && rp) {
            rolePermsMap[role] = rp.map((r: RolePermissionRow) => r.permission_id);
          }
        }

        setRolePermissions(rolePermsMap);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("permissions.error.load"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, t]);

  // Filter permissions based on search and resource filter
  useEffect(() => {
    let filtered = [...permissions];

    // Search filter - search in name, resource, action, description
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (perm) =>
          perm.name.toLowerCase().includes(term) ||
          perm.resource.toLowerCase().includes(term) ||
          perm.action.toLowerCase().includes(term) ||
          perm.description?.toLowerCase().includes(term)
      );
    }

    // Resource filter
    if (resourceFilter !== "all") {
      filtered = filtered.filter((perm) => perm.resource === resourceFilter);
    }

    setFilteredPermissions(filtered);
  }, [searchTerm, resourceFilter, permissions]);

  // Generate permission name from resource and action
  const generatePermissionName = (resource: string, action: string): string => {
    if (!resource || !action) return "";
    return `${action}_${resource}`.toLowerCase().replace(/\s+/g, "_");
  };

  // Handle create permission - inserts into permissions table
  const handleCreatePermission = async () => {
    if (!permissionForm.resource || !permissionForm.action) {
      toast.error(t("permissions.error.requiredFields"));
      return;
    }

    // Generate name if not provided
    const name = permissionForm.name.trim() || generatePermissionName(permissionForm.resource, permissionForm.action);

    // Check if permission with same name already exists
    if (permissions.some((p) => p.name === name)) {
      toast.error(t("permissions.error.duplicate"));
      return;
    }

    setSubmitting(true);
    try {
      const { permission, error } = await createPermission({
        name,
        resource: permissionForm.resource,
        action: permissionForm.action,
        description: permissionForm.description.trim() || null,
      });

      if (error) {
        console.error("Error creating permission:", error);
        toast.error(t("permissions.error.create"));
        return;
      }

      toast.success(t("permissions.success.created"));
      setShowCreateDialog(false);
      resetForm();

      // Refresh permissions list
      const { permissions: updatedPermissions } = await getAllPermissions();
      setPermissions(updatedPermissions || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("permissions.error.create"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit permission - updates permissions table
  const handleEditPermission = async () => {
    if (!selectedPermission) return;

    if (!permissionForm.resource || !permissionForm.action) {
      toast.error(t("permissions.error.requiredFields"));
      return;
    }

    const name = permissionForm.name.trim() || generatePermissionName(permissionForm.resource, permissionForm.action);

    // Check for duplicate name (excluding current permission)
    if (permissions.some((p) => p.name === name && p.id !== selectedPermission.id)) {
      toast.error(t("permissions.error.duplicate"));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await updatePermission(selectedPermission.id, {
        name,
        resource: permissionForm.resource,
        action: permissionForm.action,
        description: permissionForm.description.trim() || null,
      });

      if (error) {
        console.error("Error updating permission:", error);
        toast.error(t("permissions.error.update"));
        return;
      }

      toast.success(t("permissions.success.updated"));
      setShowEditDialog(false);
      setSelectedPermission(null);
      resetForm();

      // Refresh permissions list
      const { permissions: updatedPermissions } = await getAllPermissions();
      setPermissions(updatedPermissions || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("permissions.error.update"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete permission - removes from permissions table
  const handleDeletePermission = async () => {
    if (!selectedPermission) return;

    setSubmitting(true);
    try {
      const { error } = await deletePermission(selectedPermission.id);

      if (error) {
        console.error("Error deleting permission:", error);
        toast.error(t("permissions.error.delete"));
        return;
      }

      toast.success(t("permissions.success.deleted"));
      setShowDeleteDialog(false);
      setSelectedPermission(null);

      // Refresh permissions list
      const { permissions: updatedPermissions } = await getAllPermissions();
      setPermissions(updatedPermissions || []);

      // Also refresh role permissions in case any were linked
      const rolePermsMap: Record<UserRole, string[]> = {
        super_admin: [],
        owner: [],
        tenant: [],
        regular_user: [],
      };
      for (const role of ROLES) {
        const { rolePermissions: rp } = await getRolePermissions(role);
        if (rp) {
          rolePermsMap[role] = rp.map((r: RolePermissionRow) => r.permission_id);
        }
      }
      setRolePermissions(rolePermsMap);
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("permissions.error.delete"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle toggle role permission - adds/removes from role_permissions table
  const handleToggleRolePermission = async (permissionId: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        // Remove permission from role
        const { error } = await removePermissionFromRole(selectedRole, permissionId);
        if (error) {
          toast.error(t("permissions.error.removeFromRole"));
          return;
        }
      } else {
        // Add permission to role
        const { error } = await assignPermissionToRole(selectedRole, permissionId);
        if (error) {
          toast.error(t("permissions.error.assignToRole"));
          return;
        }
      }

      // Update local state
      setRolePermissions((prev) => {
        const updated = { ...prev };
        if (hasPermission) {
          updated[selectedRole] = updated[selectedRole].filter((id) => id !== permissionId);
        } else {
          updated[selectedRole] = [...updated[selectedRole], permissionId];
        }
        return updated;
      });

      toast.success(hasPermission ? t("permissions.success.removedFromRole") : t("permissions.success.assignedToRole"));
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("permissions.error.toggle"));
    }
  };

  // Open edit dialog with permission data
  const openEditDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setPermissionForm({
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description || "",
    });
    setShowEditDialog(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowDeleteDialog(true);
  };

  // Reset form to initial state
  const resetForm = () => {
    setPermissionForm({
      name: "",
      resource: "",
      action: "",
      description: "",
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get colored badge for resource
  const getResourceBadge = (resource: string) => {
    const colors: Record<string, string> = {
      dashboard: "bg-blue-100 text-blue-700 border-blue-200",
      finances: "bg-green-100 text-green-700 border-green-200",
      payments: "bg-green-100 text-green-700 border-green-200",
      reservations: "bg-purple-100 text-purple-700 border-purple-200",
      amenities: "bg-purple-100 text-purple-700 border-purple-200",
      incidents: "bg-orange-100 text-orange-700 border-orange-200",
      announcements: "bg-yellow-100 text-yellow-700 border-yellow-200",
      documents: "bg-gray-100 text-gray-700 border-gray-200",
      users: "bg-red-100 text-red-700 border-red-200",
      approvals: "bg-pink-100 text-pink-700 border-pink-200",
      permissions: "bg-indigo-100 text-indigo-700 border-indigo-200",
    };

    return (
      <Badge variant="outline" className={colors[resource] || "bg-gray-100 text-gray-700"}>
        {resource}
      </Badge>
    );
  };

  // Get colored badge for role
  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      owner: { className: "bg-purple-100 text-purple-700 border-purple-200", label: "Owner" },
      tenant: { className: "bg-blue-100 text-blue-700 border-blue-200", label: "Tenant" },
      super_admin: { className: "bg-red-100 text-red-700 border-red-200", label: "Super Admin" },
      regular_user: { className: "bg-gray-100 text-gray-700 border-gray-200", label: "Regular User" },
    };

    const config = roleConfig[role];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Check authorization - only super_admin can access
  if (profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground">{t("permissions.unauthorized")}</h2>
        <p className="text-muted-foreground mt-2">{t("permissions.unauthorizedMessage")}</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary flex items-center gap-2">
            <Lock className="w-8 h-8" />
            {t("permissions.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("permissions.subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("permissions.createPermission")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="w-4 h-4" />
            {t("permissions.permissionsTab")}
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Users className="w-4 h-4" />
            {t("permissions.rolesTab")}
          </TabsTrigger>
        </TabsList>

        {/* Permissions Tab - List all permissions from DB */}
        <TabsContent value="permissions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("permissions.searchPlaceholder")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={resourceFilter} onValueChange={setResourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("permissions.filterByResource")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("permissions.allResources")}</SelectItem>
                    {RESOURCES.map((resource) => (
                      <SelectItem key={resource} value={resource}>
                        {resource.charAt(0).toUpperCase() + resource.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Permissions Table - Shows all DB columns */}
          <Card>
            <CardHeader>
              <CardTitle>{t("permissions.permissionsList")}</CardTitle>
              <CardDescription>
                {filteredPermissions.length} {filteredPermissions.length === 1 ? t("permissions.permission") : t("permissions.permissionsCount")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredPermissions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t("permissions.noPermissions")}</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("permissions.name")}</TableHead>
                        <TableHead>{t("permissions.resource")}</TableHead>
                        <TableHead>{t("permissions.action")}</TableHead>
                        <TableHead>{t("permissions.description")}</TableHead>
                        <TableHead>{t("permissions.createdAt")}</TableHead>
                        <TableHead>{t("permissions.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell className="font-medium font-mono text-sm">{permission.name}</TableCell>
                          <TableCell>{getResourceBadge(permission.resource)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{permission.action}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={permission.description || ""}>
                            {permission.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(permission.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditDialog(permission)} title={t("permissions.edit")}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(permission)} title={t("permissions.delete")}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab - Manage role_permissions table */}
        <TabsContent value="roles" className="space-y-4">
          {/* Role Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label>{t("permissions.selectRole")}</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getRoleBadge(selectedRole)}
              </div>
            </CardContent>
          </Card>

          {/* Role Permissions - Checkboxes grouped by resource */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("permissions.permissionsFor")} {selectedRole.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </CardTitle>
              <CardDescription>
                {rolePermissions[selectedRole]?.length || 0} {t("permissions.assignedPermissions")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {RESOURCES.map((resource) => {
                  const resourcePermissions = permissions.filter((p) => p.resource === resource);
                  if (resourcePermissions.length === 0) return null;

                  return (
                    <div key={resource} className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        {getResourceBadge(resource)}
                        <span className="text-sm text-muted-foreground">
                          ({resourcePermissions.length} {t("permissions.permissionsCount")})
                        </span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-4">
                        {resourcePermissions.map((permission) => {
                          const hasPermission = rolePermissions[selectedRole]?.includes(permission.id);
                          return (
                            <div key={permission.id} className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50">
                              <Checkbox
                                id={`${selectedRole}-${permission.id}`}
                                checked={hasPermission}
                                onCheckedChange={() => handleToggleRolePermission(permission.id, hasPermission)}
                              />
                              <label
                                htmlFor={`${selectedRole}-${permission.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                <span className="font-mono text-xs">{permission.name}</span>
                                {permission.description && (
                                  <span className="text-muted-foreground text-xs block mt-1">{permission.description}</span>
                                )}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Permission Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("permissions.createPermission")}</DialogTitle>
            <DialogDescription>{t("permissions.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resource - required */}
            <div>
              <Label htmlFor="resource">{t("permissions.resource")} *</Label>
              <Select
                value={permissionForm.resource}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, resource: value })}
              >
                <SelectTrigger id="resource">
                  <SelectValue placeholder={t("permissions.selectResource")} />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCES.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action - required */}
            <div>
              <Label htmlFor="action">{t("permissions.action")} *</Label>
              <Select
                value={permissionForm.action}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, action: value })}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder={t("permissions.selectAction")} />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name - optional, auto-generated if empty */}
            <div>
              <Label htmlFor="name">{t("permissions.name")} ({t("permissions.optional")})</Label>
              <Input
                id="name"
                value={permissionForm.name}
                onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
                placeholder={
                  permissionForm.resource && permissionForm.action
                    ? generatePermissionName(permissionForm.resource, permissionForm.action)
                    : t("permissions.autoGenerated")
                }
              />
              <p className="text-xs text-muted-foreground mt-1">{t("permissions.nameHint")}</p>
            </div>

            {/* Description - optional */}
            <div>
              <Label htmlFor="description">{t("permissions.description")}</Label>
              <Textarea
                id="description"
                value={permissionForm.description}
                onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                placeholder={t("permissions.descriptionPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t("permissions.cancel")}
            </Button>
            <Button onClick={handleCreatePermission} disabled={submitting}>
              {submitting ? t("permissions.creating") : t("permissions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permission Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("permissions.editPermission")}</DialogTitle>
            <DialogDescription>{t("permissions.editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Resource */}
            <div>
              <Label htmlFor="editResource">{t("permissions.resource")} *</Label>
              <Select
                value={permissionForm.resource}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, resource: value })}
              >
                <SelectTrigger id="editResource">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCES.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource.charAt(0).toUpperCase() + resource.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action */}
            <div>
              <Label htmlFor="editAction">{t("permissions.action")} *</Label>
              <Select
                value={permissionForm.action}
                onValueChange={(value) => setPermissionForm({ ...permissionForm, action: value })}
              >
                <SelectTrigger id="editAction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="editName">{t("permissions.name")}</Label>
              <Input
                id="editName"
                value={permissionForm.name}
                onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="editDescription">{t("permissions.description")}</Label>
              <Textarea
                id="editDescription"
                value={permissionForm.description}
                onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t("permissions.cancel")}
            </Button>
            <Button onClick={handleEditPermission} disabled={submitting}>
              {submitting ? t("permissions.updating") : t("permissions.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("permissions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("permissions.deleteConfirmMessage")} <strong className="font-mono">{selectedPermission?.name}</strong>?
              <br />
              <span className="text-destructive text-sm mt-2 block">
                {t("permissions.deleteWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("permissions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermission}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? t("permissions.deleting") : t("permissions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PermissionsManagement;
