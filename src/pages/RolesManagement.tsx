import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Users, Lock, Search, Settings, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllPermissions,
  getRolePermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  getAllUsers,
} from "@/lib/supabase";
import { toast } from "sonner";
import type { UserRole } from "@/lib/database.types";

// Permission interface
interface Permission {
  id: string;
  name: string;
  resource?: string;
  action?: string;
  description: string | null;
  created_at: string;
}

// Role interface with statistics
interface RoleWithStats {
  role: UserRole;
  label: string;
  description: string;
  userCount: number;
  permissionCount: number;
  color: string;
}

// Role permission row interface
interface RolePermissionRow {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
}

// Available roles (from database ENUM)
const ROLES: UserRole[] = ["super_admin", "owner", "tenant", "regular_user"];

// Role configurations
const ROLE_CONFIG: Record<UserRole, { label: string; description: string; color: string }> = {
  super_admin: {
    label: "Super Admin",
    description: "Full system access with all permissions",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  owner: {
    label: "Owner",
    description: "Building owner with management permissions",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  tenant: {
    label: "Tenant",
    description: "Resident with standard access permissions",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  regular_user: {
    label: "Regular User",
    description: "Basic user with limited permissions",
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const RolesManagement = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();

  // State
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>({
    super_admin: [],
    owner: [],
    tenant: [],
    regular_user: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>([]);
  const [permissionSearchTerm, setPermissionSearchTerm] = useState("");

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile || profile.role !== "super_admin") return;

      setLoading(true);
      try {
        // Fetch all users to count per role
        const { users, error: usersError } = await getAllUsers();
        if (usersError) {
          console.error("Error fetching users:", usersError);
        }

        // Fetch all permissions
        const { permissions: perms, error: permsError } = await getAllPermissions();
        if (permsError) {
          console.error("Error fetching permissions:", permsError);
        }
        setPermissions(perms || []);

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

        // Build roles with statistics
        const rolesWithStats: RoleWithStats[] = ROLES.map((role) => {
          const userCount = users?.filter((u) => u.role === role).length || 0;
          const permissionCount = rolePermsMap[role]?.length || 0;
          const config = ROLE_CONFIG[role];

          return {
            role,
            label: config.label,
            description: config.description,
            userCount,
            permissionCount,
            color: config.color,
          };
        });

        setRoles(rolesWithStats);
      } catch (error) {
        console.error("Error:", error);
        toast.error(t("roles.error.load"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, t]);

  // Filter permissions when search term changes
  useEffect(() => {
    if (!permissionSearchTerm) {
      setFilteredPermissions(permissions);
    } else {
      const term = permissionSearchTerm.toLowerCase();
      setFilteredPermissions(
        permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.resource?.toLowerCase().includes(term) ||
            p.action?.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term)
        )
      );
    }
  }, [permissionSearchTerm, permissions]);

  // Handle toggle permission for role
  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedRole) return;

    const hasPermission = rolePermissions[selectedRole]?.includes(permissionId);

    try {
      if (hasPermission) {
        const { error } = await removePermissionFromRole(selectedRole, permissionId);
        if (error) {
          toast.error(t("roles.error.removePermission"));
          return;
        }
      } else {
        const { error } = await assignPermissionToRole(selectedRole, permissionId);
        if (error) {
          toast.error(t("roles.error.assignPermission"));
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

      // Update role stats
      setRoles((prev) =>
        prev.map((r) =>
          r.role === selectedRole
            ? { ...r, permissionCount: hasPermission ? r.permissionCount - 1 : r.permissionCount + 1 }
            : r
        )
      );

      toast.success(
        hasPermission ? t("roles.success.permissionRemoved") : t("roles.success.permissionAssigned")
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("roles.error.toggle"));
    }
  };

  // Select all permissions for a role
  const handleSelectAllPermissions = async () => {
    if (!selectedRole) return;

    const unassignedPermissions = permissions.filter(
      (p) => !rolePermissions[selectedRole]?.includes(p.id)
    );

    for (const permission of unassignedPermissions) {
      await assignPermissionToRole(selectedRole, permission.id);
    }

    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: permissions.map((p) => p.id),
    }));

    setRoles((prev) =>
      prev.map((r) =>
        r.role === selectedRole ? { ...r, permissionCount: permissions.length } : r
      )
    );

    toast.success(t("roles.success.allPermissionsAssigned"));
  };

  // Remove all permissions from a role
  const handleRemoveAllPermissions = async () => {
    if (!selectedRole) return;

    const assignedPermissions = rolePermissions[selectedRole] || [];

    for (const permissionId of assignedPermissions) {
      await removePermissionFromRole(selectedRole, permissionId);
    }

    setRolePermissions((prev) => ({
      ...prev,
      [selectedRole]: [],
    }));

    setRoles((prev) =>
      prev.map((r) => (r.role === selectedRole ? { ...r, permissionCount: 0 } : r))
    );

    toast.success(t("roles.success.allPermissionsRemoved"));
  };

  // Open permissions dialog
  const openPermissionsDialog = (role: UserRole) => {
    setSelectedRole(role);
    setPermissionSearchTerm("");
    setShowPermissionsDialog(true);
  };

  // Get role badge
  const getRoleBadge = (role: UserRole) => {
    const config = ROLE_CONFIG[role];
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Group permissions by resource
  const groupPermissionsByResource = () => {
    const grouped: Record<string, Permission[]> = {};
    filteredPermissions.forEach((p) => {
      const resource = p.resource || "other";
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(p);
    });
    return grouped;
  };

  // Filter roles by search
  const filteredRoles = roles.filter(
    (r) =>
      r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check authorization
  if (profile?.role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-muted-foreground">{t("roles.unauthorized")}</h2>
        <p className="text-muted-foreground mt-2">{t("roles.unauthorizedMessage")}</p>
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
            <Users className="w-8 h-8" />
            {t("roles.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("roles.subtitle")}</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("roles.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("roles.rolesList")}</CardTitle>
          <CardDescription>
            {filteredRoles.length} {filteredRoles.length === 1 ? t("roles.role") : t("roles.rolesCount")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("roles.roleName")}</TableHead>
                  <TableHead>{t("roles.description")}</TableHead>
                  <TableHead className="text-center">{t("roles.users")}</TableHead>
                  <TableHead className="text-center">{t("roles.permissions")}</TableHead>
                  <TableHead>{t("roles.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((roleItem) => (
                  <TableRow key={roleItem.role}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(roleItem.role)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {roleItem.description}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="w-3 h-3" />
                        {roleItem.userCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        {roleItem.permissionCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPermissionsDialog(roleItem.role)}
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        {t("roles.managePermissions")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredRoles.map((roleItem) => (
          <Card key={roleItem.role} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                {getRoleBadge(roleItem.role)}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openPermissionsDialog(roleItem.role)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="mt-2">{roleItem.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{roleItem.userCount} {t("roles.users")}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>{roleItem.permissionCount} {t("roles.perms")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {t("roles.permissionsFor")} {selectedRole && getRoleBadge(selectedRole)}
            </DialogTitle>
            <DialogDescription>
              {t("roles.permissionsDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Search and Actions */}
          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("roles.searchPermissions")}
                value={permissionSearchTerm}
                onChange={(e) => setPermissionSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleSelectAllPermissions}>
              {t("roles.selectAll")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRemoveAllPermissions}>
              {t("roles.removeAll")}
            </Button>
          </div>

          {/* Permissions List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {Object.entries(groupPermissionsByResource()).map(([resource, perms]) => (
              <div key={resource} className="space-y-2">
                <h4 className="font-medium text-sm flex items-center gap-2 sticky top-0 bg-background py-1">
                  <Badge variant="outline" className="capitalize">
                    {resource}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    ({perms.length} {t("roles.perms")})
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                  {perms.map((permission) => {
                    const hasPermission = selectedRole
                      ? rolePermissions[selectedRole]?.includes(permission.id)
                      : false;
                    return (
                      <div
                        key={permission.id}
                        className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 border"
                      >
                        <Checkbox
                          id={`perm-${permission.id}`}
                          checked={hasPermission}
                          onCheckedChange={() => handleTogglePermission(permission.id)}
                        />
                        <label
                          htmlFor={`perm-${permission.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-mono text-xs font-medium">{permission.name}</span>
                          {permission.description && (
                            <span className="text-muted-foreground text-xs block">
                              {permission.description}
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="mt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedRole && rolePermissions[selectedRole]?.length} / {permissions.length}{" "}
                {t("roles.permissionsSelected")}
              </span>
              <Button onClick={() => setShowPermissionsDialog(false)}>
                {t("roles.done")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesManagement;
