"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { useApp, Role, User } from "@/lib/store";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Key, UserPlus, ShieldAlert, Sparkles, UserRoundPen } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { currentUser, users, addUser, deleteUser, updateUserRole } = useApp();
  const { theme, setTheme } = useTheme();
  
  // Permission Gate: Boss and Consigliere are administrators
  const isAdmin = currentUser.role === "Boss";

  // Create User form state
  const [newUsername, setNewUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("Associate");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== "Boss") {
      toast.error("Only Bosses are authorized to create staff accounts.");
      return;
    }
    if (!newUsername.trim() || !newUserPassword.trim()) return;
    
    // Check if user already exists
    const exists = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase());
    if (exists) {
      toast.error("A user with this username already exists.");
      return;
    }

    addUser(newUsername.trim(), newUserRole, newUserPassword.trim());
    toast.success(`Account @${newUsername} created with role: ${newUserRole}`);
    setNewUsername("");
    setNewUserPassword("");
    setNewUserRole("Associate");
    setIsCreateOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (currentUser.role !== "Boss") {
      toast.error("Only Bosses are authorized to delete staff accounts.");
      return;
    }
    if (id === currentUser.id) {
      toast.error("You cannot delete your own active profile.");
      return;
    }
    deleteUser(id);
    toast.info("User account removed.");
  };

  const handleRoleChange = (userId: string, role: Role) => {
    if (currentUser.role !== "Boss") {
      toast.error("Only Bosses are authorized to adjust user permissions.");
      return;
    }
    updateUserRole(userId, role);
    toast.success("User role updated successfully.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure profile preferences, security layers, and user permissions.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-muted/40 p-1 rounded-lg">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="permissions">User Permissions</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                Overview of your administrative profile identifiers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Username</Label>
                <Input value={currentUser.username} disabled className="bg-muted/30 max-w-md" />
              </div>
              <div className="grid gap-2">
                <Label>Active Role</Label>
                <div className="flex items-center gap-2">
                  <Input value={currentUser.role} disabled className="bg-muted/30 max-w-sm" />
                  <Badge variant="outline" className="h-8">System Secured</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Permissions Management (Admin only) */}
          <TabsContent value="permissions">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Staff Accounts Manager</CardTitle>
                  <CardDescription>
                    Create accounts, set starting passwords, and manage hierarchy classifications.
                  </CardDescription>
                </div>

                {currentUser.role === "Boss" && (
                  <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger render={<Button className="gap-2 rounded-full" />}>
                      <UserPlus className="h-4 w-4" />
                      Create Staff Account
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <form onSubmit={handleCreateUser}>
                        <DialogHeader>
                          <DialogTitle>Create Staff Profile</DialogTitle>
                          <DialogDescription>
                            Set credentials and choose a hierarchy role. Users will log in with these credentials.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <div className="relative">
                              <UserRoundPen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="username" 
                                value={newUsername} 
                                onChange={(e) => setNewUsername(e.target.value)} 
                                placeholder="e.g. paulie_g" 
                                required 
                                autoComplete="off"
                                className="ps-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="password">Security Password</Label>
                            <div className="relative">
                              <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input 
                                id="password" 
                                type="password"
                                value={newUserPassword} 
                                onChange={(e) => setNewUserPassword(e.target.value)} 
                                placeholder="Enter password" 
                                required 
                                readOnly={isReadOnly}
                                onFocus={() => setIsReadOnly(false)}
                                onBlur={() => setIsReadOnly(true)}
                                className="ps-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Hierarchy Role</Label>
                            <Select 
                              value={newUserRole} 
                              onValueChange={(val) => setNewUserRole(val as Role)}
                            >
                              <SelectTrigger id="role">
                                <SelectValue placeholder="Select hierarchy role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Boss" className="ps-3 py-2">Boss</SelectItem>
                                <SelectItem value="Consigliere" className="ps-3 py-2">Consigliere</SelectItem>
                                <SelectItem value="Bagman" className="ps-3 py-2">Bagman</SelectItem>
                                <SelectItem value="Associate" className="ps-3 py-2">Associate</SelectItem>
                                <SelectItem value="Custodian" className="ps-3 py-2">Custodian</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Create Account</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="px-6 py-4">Username</th>
                        <th className="px-6 py-4">Current Role</th>
                        <th className="px-6 py-4">Actions / Classifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground">
                            @{u.username}
                          </td>
                          <td className="px-6 py-4">
                            <Select 
                              value={u.role} 
                              onValueChange={(val) => handleRoleChange(u.id, val as Role)}
                              disabled={u.id === currentUser.id || currentUser.role !== "Boss"}
                            >
                              <SelectTrigger className="w-[180px] bg-transparent border-none">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Boss">Boss</SelectItem>
                                <SelectItem value="Consigliere">Consigliere</SelectItem>
                                <SelectItem value="Bagman">Bagman</SelectItem>
                                <SelectItem value="Associate">Associate</SelectItem>
                                <SelectItem value="Custodian">Custodian</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {u.id === currentUser.id ? (
                                <Badge variant="secondary">Active Session</Badge>
                              ) : (
                                currentUser.role === "Boss" ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleDeleteUser(u.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Protected</Badge>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme Customization</CardTitle>
              <CardDescription>
                Select your preferred visual aesthetic for the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all hover:bg-muted/10 text-left ${
                    theme === "light"
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <span className="font-semibold text-sm">Light Mode</span>
                  <span className="text-xs text-muted-foreground mt-1">Default clean light palette.</span>
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all hover:bg-muted/10 text-left ${
                    theme === "dark"
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <span className="font-semibold text-sm">Dark Mode</span>
                  <span className="text-xs text-muted-foreground mt-1">High contrast sleek dark theme.</span>
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all hover:bg-muted/10 text-left ${
                    theme === "system"
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                  }`}
                >
                  <span className="font-semibold text-sm">System Theme</span>
                  <span className="text-xs text-muted-foreground mt-1">Syncs with your device settings.</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
