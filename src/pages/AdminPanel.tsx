import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { UserPlus, Edit, Search, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllUsers,
  getAllBuildings,
  getBuildingUnits,
  createUserWithRole,
  updateUserProfile,
} from "@/lib/supabase";
import { toast } from "sonner";
import type { UserRole } from "@/lib/database.types";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  building_id: string | null;
  is_active: boolean;
  created_at: string;
  building?: { name: string } | null;
  unit?: { unit_number: string } | null;
}

interface Building {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
}

const AdminPanel = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for creating user
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "tenant" as UserRole,
    buildingId: "",
    unitId: "",
  });

  // Form state for editing user
  const [editUser, setEditUser] = useState({
    role: "tenant" as UserRole,
    buildingId: "",
    unitId: "",
    isActive: true,
  });

  // Fetch users and buildings
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;

      setLoading(true);
      try {
        const [usersResult, buildingsResult] = await Promise.all([
          getAllUsers(),
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
      filtered = filtered.filter(user => user.role === roleFilter);
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

  // Handle create user
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await createUserWithRole(
        newUser.email,
        newUser.password,
        newUser.fullName,
        newUser.role,
        newUser.buildingId || undefined,
        newUser.unitId || undefined
      );

      if (error) {
        console.error('Error creating user:', error);
        toast.error(error.message || "Error creating user");
        return;
      }

      toast.success("User created successfully");
      setShowCreateDialog(false);
      setNewUser({
        email: "",
        password: "",
        fullName: "",
        role: "tenant",
        buildingId: "",
        unitId: "",
      });

      // Refresh users
      const { users: updatedUsers } = await getAllUsers();
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

    setSubmitting(true);
    try {
      const { user, error } = await updateUserProfile(selectedUser.id, {
        role: editUser.role,
        building_id: editUser.buildingId || null,
        unit_id: editUser.unitId || null,
        is_active: editUser.isActive,
      });

      if (error) {
        console.error('Error updating user:', error);
        toast.error("Error updating user");
        return;
      }

      toast.success("User updated successfully");
      setShowEditDialog(false);
      setSelectedUser(null);

      // Refresh users
      const { users: updatedUsers } = await getAllUsers();
      setUsers(updatedUsers || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error updating user");
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = async (user: User) => {
    setSelectedUser(user);
    setEditUser({
      role: user.role,
      buildingId: user.building_id || "",
      unitId: user.unit_id || "",
      isActive: user.is_active,
    });

    // Load units if building is set
    if (user.building_id) {
      const { units: fetchedUnits } = await getBuildingUnits(user.building_id);
      setUnits(fetchedUnits || []);
    }

    setShowEditDialog(true);
  };

  // Get role badge
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
                    <TableHead>Role</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.building?.name || '-'}</TableCell>
                      <TableCell>{user.unit?.unit_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(user)}
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specific role and building assignment
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

            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="regular_user">Regular User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              Update user role, building, and unit assignment
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => setEditUser({ ...editUser, role: value as UserRole })}
                >
                  <SelectTrigger id="editRole">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="regular_user">Regular User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={editUser.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setEditUser({ ...editUser, isActive: value === "active" })}
                >
                  <SelectTrigger id="editStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
    </div>
  );
};

export default AdminPanel;
