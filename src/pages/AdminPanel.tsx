import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { UserPlus, Edit, Search, Shield, Key, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllBuildings,
  getBuildingUnits,
  createUserWithRole,
  updateUserProfile,
  sendPasswordResetEmail,
  getAllUsersWithRoles,
  setUserRoles,
  assignRoleToUser,
  deleteUser,
} from "@/lib/supabase";
import { createAuthUsuarioSynced } from "@/lib/portal-sync";
import SyncQueuePanel from "@/components/SyncQueuePanel";
import { toast } from "sonner";
import type { UserRole } from "@/lib/database.types";

interface UserRoleEntry {
  role: UserRole;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  building_id: string | null;
  created_at: string;
  building?: { name: string } | null;
  unit?: { unit_number: string } | null;
  user_roles?: UserRoleEntry[];
}

interface Building {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
}

const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "owner", label: "Owner" },
  { value: "tenant", label: "Tenant" },
  { value: "regular_user", label: "Regular User" },
];

const AdminPanel = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating user
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    roles: [] as UserRole[],
    primaryRole: "tenant" as UserRole,
    buildingId: "",
    unitId: "",
  });

  // Form state for editing user
  const [editUser, setEditUser] = useState({
    roles: [] as UserRole[],
    primaryRole: "tenant" as UserRole,
    buildingId: "",
    unitId: "",
  });

  // Fetch users and buildings
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        const [usersResult, buildingsResult] = await Promise.all([
          getAllUsersWithRoles(),
          getAllBuildings(),
        ]);

        if (usersResult.error) {
          console.error('Error fetching users:', usersResult.error);
          toast.error("Error loading users");
          return;
        }

        if (buildingsResult.error) {
          console.error('Error fetching buildings:', buildingsResult.error);
          toast.error("Error loading buildings");
          return;
        }

        setUsers(usersResult.users || []);
        setFilteredUsers(usersResult.users || []);
        setBuildings(buildingsResult.buildings || []);
      } catch (error) {
        console.error('Error:', error);
        toast.error("Error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile]);

  // Filter users based on search and role
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.building?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => {
        // Check both primary role and user_roles
        if (user.role === roleFilter) return true;
        if (user.user_roles?.some(ur => ur.role === roleFilter)) return true;
        return false;
      });
    }

    setFilteredUsers(filtered);
  }, [searchTerm, roleFilter, users]);

  // Fetch units when building is selected
  const handleBuildingChange = async (buildingId: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditUser({ ...editUser, buildingId, unitId: "" });
    } else {
      setNewUser({ ...newUser, buildingId, unitId: "" });
    }

    if (buildingId) {
      const { units: fetchedUnits, error } = await getBuildingUnits(buildingId);
      if (!error) {
        setUnits(fetchedUnits || []);
      }
    } else {
      setUnits([]);
    }
  };

  // Handle role checkbox change for new user
  const handleNewUserRoleChange = (role: UserRole, checked: boolean) => {
    let newRoles = [...newUser.roles];
    if (checked) {
      if (!newRoles.includes(role)) {
        newRoles.push(role);
      }
    } else {
      newRoles = newRoles.filter(r => r !== role);
    }

    // Set primary role to first selected role if not already set
    const primaryRole = newRoles.length > 0 ? newRoles[0] : "tenant";
    setNewUser({ ...newUser, roles: newRoles, primaryRole });
  };

  // Handle role checkbox change for edit user
  const handleEditUserRoleChange = (role: UserRole, checked: boolean) => {
    let newRoles = [...editUser.roles];
    if (checked) {
      if (!newRoles.includes(role)) {
        newRoles.push(role);
      }
    } else {
      newRoles = newRoles.filter(r => r !== role);
    }

    // Set primary role to first selected role if not already set
    const primaryRole = newRoles.length > 0 ? newRoles[0] : editUser.primaryRole;
    setEditUser({ ...editUser, roles: newRoles, primaryRole });
  };

  // Handle create user
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newUser.roles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    setSubmitting(true);
    try {
      const { error: portalError } = await createAuthUsuarioSynced({
        email: profile?.email || undefined,
        payload: {
          correo: newUser.email,
          nombre: newUser.fullName,
          rol: newUser.primaryRole,
          buildingId: newUser.buildingId || undefined,
          unitId: newUser.unitId || undefined,
        },
      });

      if (portalError) {
        console.error("Portal auth/usuarios error:", portalError);
        toast.error(portalError.message || "Error creating portal user");
        return;
      }

      // Create user with primary role
      const { data, error } = await createUserWithRole(
        newUser.email,
        newUser.password,
        newUser.fullName,
        newUser.primaryRole,
        newUser.buildingId || undefined,
        newUser.unitId || undefined
      );

      if (error) {
        console.error('Error creating user:', error);
        toast.error(error.message || "Error creating user");
        return;
      }

      // If user created successfully and has multiple roles, add them to user_roles table
      if (data?.user?.id && newUser.roles.length > 0) {
        const { error: rolesError } = await setUserRoles(data.user.id, newUser.roles);
        if (rolesError) {
          console.error('Error setting user roles:', rolesError);
          // Don't fail the whole operation, user is created
        }
      }

      toast.success("User created successfully");
      setShowCreateDialog(false);
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        roles: [],
        primaryRole: "tenant",
        buildingId: "",
        unitId: "",
      });

      // Refresh users
      const { users: updatedUsers } = await getAllUsersWithRoles();
      setUsers(updatedUsers || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error creating user");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (editUser.roles.length === 0) {
      toast.error("Please select at least one role");
      return;
    }

    setSubmitting(true);
    try {
      // Update user profile with primary role
      const { error } = await updateUserProfile(selectedUser.id, {
        role: editUser.primaryRole,
        building_id: editUser.buildingId || null,
        unit_id: editUser.unitId || null,
      });

      if (error) {
        console.error('Error updating user:', error);
        const errorMessage = error.message || error.toString() || "Error updating user";
        toast.error(`Update failed: ${errorMessage}`);
        return;
      }

      // Update user roles in user_roles table
      const { error: rolesError } = await setUserRoles(selectedUser.id, editUser.roles);
      if (rolesError) {
        console.error('Error updating user roles:', rolesError);
        // Don't fail the whole operation
      }

      toast.success("User updated successfully");
      setShowEditDialog(false);
      setSelectedUser(null);

      // Refresh users
      const { users: updatedUsers } = await getAllUsersWithRoles();
      setUsers(updatedUsers || []);
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error?.message || error?.toString() || "Unknown error";
      toast.error(`Error updating user: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = async (user: User) => {
    setSelectedUser(user);

    // Get user's roles from user_roles array
    const userRoles = user.user_roles?.map(ur => ur.role) || [user.role];

    setEditUser({
      roles: userRoles,
      primaryRole: user.role,
      buildingId: user.building_id || "",
      unitId: user.unit_id || "",
    });

    // Load units if building is set
    if (user.building_id) {
      const { units: fetchedUnits } = await getBuildingUnits(user.building_id);
      setUnits(fetchedUnits || []);
    }

    setShowEditDialog(true);
  };

  // Open password reset dialog
  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };

  // Handle password reset email
  const handleSendPasswordReset = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const { error } = await sendPasswordResetEmail(selectedUser.email);

      if (error) {
        console.error('Error sending password reset:', error);
        toast.error(error.message || "Error sending password reset email");
        return;
      }

      toast.success(`Password reset email sent to ${selectedUser.email}`);
      setShowPasswordDialog(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error sending password reset email");
    } finally {
      setSubmitting(false);
    }
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const { error } = await deleteUser(selectedUser.id);

      if (error) {
        console.error('Error deleting user:', error);
        toast.error(error.message || "Error deleting user");
        return;
      }

      toast.success(`User ${selectedUser.full_name} deleted successfully`);
      setShowDeleteDialog(false);
      setSelectedUser(null);

      // Refresh users
      const { users: updatedUsers } = await getAllUsersWithRoles();
      setUsers(updatedUsers || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error deleting user");
    } finally {
      setSubmitting(false);
    }
  };

  // Get role badge with color
  const getRoleBadge = (role: UserRole) => {
    const roleConfig: Record<UserRole, { className: string; label: string }> = {
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

  // Get all roles display for a user
  const getUserRolesDisplay = (user: User) => {
    const roles = user.user_roles?.map(ur => ur.role) || [user.role];
    const uniqueRoles = [...new Set(roles)];

    return (
      <div className="flex flex-wrap gap-1">
        {uniqueRoles.map(role => (
          <span key={role}>{getRoleBadge(role)}</span>
        ))}
      </div>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SyncQueuePanel />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">User management and administration</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-primary hover:bg-primary/90 gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or building..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="regular_user">Regular User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getUserRolesDisplay(user)}</TableCell>
                      <TableCell>{user.building?.name || '-'}</TableCell>
                      <TableCell>{user.unit?.unit_number || '-'}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(user)}
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {profile?.role === 'super_admin' && user.id !== profile.id && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openPasswordDialog(user)}
                                title="Send password reset email"
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openDeleteDialog(user)}
                                title="Delete user"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
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

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with multiple roles and building assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <Label>Roles * (select one or more)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 p-4 border rounded-lg">
                {AVAILABLE_ROLES.map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-role-${value}`}
                      checked={newUser.roles.includes(value)}
                      onCheckedChange={(checked) => handleNewUserRoleChange(value, checked as boolean)}
                    />
                    <label
                      htmlFor={`new-role-${value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
              {newUser.roles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Primary role: {AVAILABLE_ROLES.find(r => r.value === newUser.primaryRole)?.label}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="building">Building</Label>
                <Select
                  value={newUser.buildingId}
                  onValueChange={(value) => handleBuildingChange(value, false)}
                >
                  <SelectTrigger id="building">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={newUser.unitId}
                  onValueChange={(value) => setNewUser({ ...newUser, unitId: value })}
                  disabled={!newUser.buildingId || units.length === 0}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={submitting}>
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user roles, building, and unit assignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={selectedUser?.full_name || ""} disabled />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={selectedUser?.email || ""} disabled />
              </div>
            </div>

            <div>
              <Label>Roles * (select one or more)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2 p-4 border rounded-lg">
                {AVAILABLE_ROLES.map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-role-${value}`}
                      checked={editUser.roles.includes(value)}
                      onCheckedChange={(checked) => handleEditUserRoleChange(value, checked as boolean)}
                    />
                    <label
                      htmlFor={`edit-role-${value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
              {editUser.roles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Primary role: {AVAILABLE_ROLES.find(r => r.value === editUser.primaryRole)?.label}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editBuilding">Building</Label>
                <Select
                  value={editUser.buildingId}
                  onValueChange={(value) => handleBuildingChange(value, true)}
                >
                  <SelectTrigger id="editBuilding">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editUnit">Unit</Label>
                <Select
                  value={editUser.unitId}
                  onValueChange={(value) => setEditUser({ ...editUser, unitId: value })}
                  disabled={!editUser.buildingId || units.length === 0}
                >
                  <SelectTrigger id="editUnit">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.unit_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={submitting}>
              {submitting ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Send a password reset email to this user
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800">{selectedUser?.full_name}</p>
              <p className="text-sm text-blue-600">{selectedUser?.email}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              A password reset link will be sent to the user's email address.
              They can use it to set a new password.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendPasswordReset} disabled={submitting}>
              {submitting ? "Sending..." : "Send Reset Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-red-800">{selectedUser?.full_name}</p>
              <p className="text-sm text-red-600">{selectedUser?.email}</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
