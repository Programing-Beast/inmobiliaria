import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Building2, Home, Shield, Edit, Lock, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UnitSwitcher } from "@/components/UnitSwitcher";

const Profile = () => {
  const { t, i18n } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({
    fullName: profile?.full_name || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Get role badge
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { className: string; label: string }> = {
      owner: { className: "bg-purple-100 text-purple-700 border-purple-200", label: "Owner" },
      tenant: { className: "bg-blue-100 text-blue-700 border-blue-200", label: "Tenant" },
      super_admin: { className: "bg-red-100 text-red-700 border-red-200", label: "Super Admin" },
      regular_user: { className: "bg-gray-100 text-gray-700 border-gray-200", label: "Regular User" },
    };

    const config = roleConfig[role] || roleConfig.regular_user;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Open edit dialog
  const openEditDialog = () => {
    setEditForm({
      fullName: profile?.full_name || "",
    });
    setShowEditDialog(true);
  };

  // Handle update profile
  const handleUpdateProfile = async () => {
    if (!profile?.id || !editForm.fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const { user, error } = await updateUserProfile(profile.id, {
        full_name: editForm.fullName,
      });

      if (error) {
        console.error('Error updating profile:', error);
        toast.error("Error updating profile");
        return;
      }

      toast.success("Profile updated successfully");
      await refreshProfile();
      setShowEditDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error updating profile");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        console.error('Error changing password:', error);
        toast.error(error.message || "Error changing password");
        return;
      }

      toast.success("Password changed successfully");
      setShowPasswordDialog(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error changing password");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle language change
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    toast.success(lang === 'en' ? 'Language changed to English' : 'Idioma cambiado a Español');
  };

  if (!profile) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground mt-1">View and manage your profile information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Profile Information</span>
              <Button size="sm" variant="ghost" onClick={openEditDialog}>
                <Edit className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{profile.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="p-2 bg-primary/10 rounded-full">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {profile.roles && profile.roles.length > 1 ? 'Roles' : 'Role'}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {profile.roles && profile.roles.length > 0 ? (
                    profile.roles.map((role) => (
                      <span key={role}>{getRoleBadge(role)}</span>
                    ))
                  ) : (
                    getRoleBadge(profile.role)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Building & Unit Information Card - Show simple card for single unit, UnitSwitcher for multiple */}
        {profile.units && profile.units.length > 1 ? (
          <div className="md:col-span-2 space-y-3">
            <UnitSwitcher variant="card" />
            {profile.role === "owner" && (
              <div className="text-xs text-muted-foreground">
                <p>{t("ownerContext.note")}</p>
                <p>{t("ownerContext.noteAction")}</p>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Building & Unit</CardTitle>
              <CardDescription>Your building and unit information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Building</p>
                  <p className="font-medium">
                    {profile.building?.name || profile.currentUnit?.building_name || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Unit</p>
                  <p className="font-medium">
                    {profile.unit?.unit_number || profile.currentUnit?.unit_number || 'Not assigned'}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Contact your building administrator if this information is incorrect.
                </p>
                {profile.role === "owner" && (
                  <>
                    <p className="text-xs text-muted-foreground mt-2">{t("ownerContext.note")}</p>
                    <p className="text-xs text-muted-foreground">{t("ownerContext.noteAction")}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Lock className="w-4 h-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="language" className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" />
                Language
              </Label>
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile.email} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Contact support to change your email
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your new password below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Re-enter your new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={submitting}>
              {submitting ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
