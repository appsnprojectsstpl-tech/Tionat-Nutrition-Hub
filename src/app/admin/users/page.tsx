
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from "@/firebase";
import { collection, query, doc, where } from "firebase/firestore";
import type { UserProfile, Warehouse } from "@/lib/types"; // Added Warehouse
import { cn } from "@/lib/utils";
import { MoreHorizontal, ShieldCheck, User as UserIcon, Crown, Store, Plus } from "lucide-react"; // Added Plus
import { Input } from "@/components/ui/input";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { logAdminAction } from "@/lib/audit-logger";

const roleIcons: { [key: string]: React.ReactNode } = {
  superadmin: <Crown className="h-3.5 w-3.5" />,
  warehouse_admin: <Store className="h-3.5 w-3.5" />, // Added Icon
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  user: <UserIcon className="h-3.5 w-3.5" />
}

const roleColors: { [key: string]: string } = {
  superadmin: "bg-purple-200 text-purple-800",
  warehouse_admin: "bg-orange-200 text-orange-800", // Added Color
  admin: "bg-blue-200 text-blue-800",
  user: "bg-gray-200 text-gray-800",
};

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { auth } = useAuth();
  const { toast } = useToast();

  const { user, isUserLoading } = useUser();

  const usersCollection = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'users')) : null),
    [firestore, user]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersCollection);

  const warehousesCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'warehouses') : null),
    [firestore, user]
  );
  const { data: warehouses } = useCollection<Warehouse>(warehousesCollection);

  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

  const handleRoleChange = (user: UserProfile, newRole: 'admin' | 'user' | 'warehouse_admin') => {
    if (!firestore || user.role === 'superadmin') {
      toast({ title: 'Permission Denied', description: 'Cannot change the role of a superadmin.', variant: 'destructive' });
      return;
    };

    if (newRole === 'warehouse_admin') {
      setSelectedUser(user);
      setIsRoleDialogOpen(true);
      return;
    }

    // Standard Switch
    const userRef = doc(firestore, 'users', user.id);
    setDocumentNonBlocking(userRef, { role: newRole, managedWarehouseId: null }, { merge: true }); // Clear warehouse id if switching away

    logAdminAction({
      action: 'USER_ROLE_UPDATE',
      performedBy: auth?.currentUser?.email || 'unknown',
      targetId: user.id,
      targetType: 'USER',
      details: `Changed role from ${user.role} to ${newRole}`
    });

    toast({
      title: 'Role Updated',
      description: `${user.firstName}'s role has been changed to ${newRole}.`
    })
  }

  const confirmWarehouseAdmin = async () => {
    if (!firestore || !selectedUser || !selectedWarehouseId) return;

    const userRef = doc(firestore, 'users', selectedUser.id);
    await setDocumentNonBlocking(userRef, {
      role: 'warehouse_admin',
      managedWarehouseId: selectedWarehouseId
    }, { merge: true });

    logAdminAction({
      action: 'USER_ROLE_UPDATE',
      performedBy: auth?.currentUser?.email || 'unknown',
      targetId: selectedUser.id,
      targetType: 'USER',
      details: `Promoted to Warehouse Admin for ${selectedWarehouseId}`
    });

    toast({
      title: 'Role Updated',
      description: `${selectedUser.firstName} is now a Warehouse Admin.`
    });
    setIsRoleDialogOpen(false);
    setSelectedWarehouseId("");
    setSelectedUser(null);
  };


  const handlePasswordReset = (user: UserProfile) => {
    if (!auth) return;
    if (confirm(`Are you sure you want to send a password reset email to ${user.email}?`)) {
      sendPasswordResetEmail(auth, user.email)
        .then(() => {
          toast({
            title: 'Password Reset Email Sent',
            description: `An email has been sent to ${user.email} with instructions.`
          })
        })
        .catch((error) => {
          console.error("Password reset error:", error);
          toast({
            title: 'Error',
            description: 'Failed to send password reset email.',
            variant: 'destructive'
          })
        });
    }
  }

  const admins = users?.filter(u => u.role === 'superadmin' || u.role === 'warehouse_admin' || u.role === 'admin') || [];
  const customers = users?.filter(u => !u.role || u.role === 'user') || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">User Management</h1>
        {/* Planned: Create User Button Here */}
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
          <TabsTrigger value="staff">Admins & Staff ({admins.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <CardDescription>View and manage registered customers.</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable users={customers} isLoading={isLoading} warehouses={warehouses} roleColors={roleColors} roleIcons={roleIcons} handlePasswordReset={handlePasswordReset} handleRoleChange={handleRoleChange} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff & Admins</CardTitle>
              <CardDescription>Manage platform administrators and warehouse managers.</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersTable users={admins} isLoading={isLoading} warehouses={warehouses} roleColors={roleColors} roleIcons={roleIcons} handlePasswordReset={handlePasswordReset} handleRoleChange={handleRoleChange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Warehouse</DialogTitle>
            <DialogDescription>
              Select which warehouse <strong>{selectedUser?.firstName}</strong> will manage.
              They will only see orders and stock for this specific location.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="warehouse" className="text-right">
                Warehouse
              </Label>
              <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmWarehouseAdmin} disabled={!selectedWarehouseId}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Component to avoid duplication
function UsersTable({ users, isLoading, warehouses, roleColors, roleIcons, handlePasswordReset, handleRoleChange }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead className="hidden sm:table-cell">Phone</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right sticky right-0 bg-card">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-4">Loading users...</TableCell></TableRow>}
        {users && users.length > 0 ? (
          users.map((userItem: UserProfile) => (
            <TableRow key={userItem.id}>
              <TableCell className="font-medium text-xs sm:text-sm">{userItem.firstName} {userItem.lastName}</TableCell>
              <TableCell className="text-xs sm:text-sm">{userItem.email}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{userItem.phoneNumber || 'N/A'}</TableCell>
              <TableCell>
                <Badge className={cn("capitalize gap-1 pl-2 text-[10px] sm:text-xs", roleColors[userItem.role || 'user'])}>
                  {roleIcons[userItem.role || 'user']}
                  {userItem.role || 'user'}
                </Badge>
                {userItem.managedWarehouseId && (
                  <span className="text-[10px] text-muted-foreground block ml-1">
                    {warehouses?.find((w: Warehouse) => w.id === userItem.managedWarehouseId)?.name || userItem.managedWarehouseId}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right sticky right-0 bg-card">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={userItem.role === 'superadmin'}>
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions for {userItem.firstName}</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => handlePasswordReset(userItem)}>Reset Password</DropdownMenuItem>
                    {userItem.role !== 'admin' && (
                      <DropdownMenuItem onSelect={() => handleRoleChange(userItem, 'admin')}>Promote to Global Admin</DropdownMenuItem>
                    )}
                    {userItem.role !== 'warehouse_admin' && (
                      <DropdownMenuItem onSelect={() => handleRoleChange(userItem, 'warehouse_admin')}>Promote to Warehouse Admin</DropdownMenuItem>
                    )}
                    {(userItem.role === 'admin' || userItem.role === 'warehouse_admin') && (
                      <DropdownMenuItem onSelect={() => handleRoleChange(userItem, 'user')} className="text-amber-600 focus:text-amber-600">Demote to User</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          !isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4">No users found.</TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  )
}
