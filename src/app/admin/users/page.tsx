
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
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoreHorizontal, ShieldCheck, User as UserIcon, Crown } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { sendPasswordResetEmail } from "firebase/auth";

const roleIcons: { [key: string]: React.ReactNode } = {
  superadmin: <Crown className="h-3.5 w-3.5" />,
  admin: <ShieldCheck className="h-3.5 w-3.5" />,
  user: <UserIcon className="h-3.5 w-3.5" />
}

const roleColors: { [key: string]: string } = {
  superadmin: "bg-purple-200 text-purple-800",
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

  const handleRoleChange = (user: UserProfile, newRole: 'admin' | 'user') => {
    if (!firestore || user.role === 'superadmin') {
      toast({ title: 'Permission Denied', description: 'Cannot change the role of a superadmin.', variant: 'destructive' });
      return;
    };

    const userRef = doc(firestore, 'users', user.id);
    setDocumentNonBlocking(userRef, { role: newRole }, { merge: true });

    toast({
      title: 'Role Updated',
      description: `${user.firstName}'s role has been changed to ${newRole}.`
    })
  }

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl font-headline">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View, manage, and assign roles to all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-xs sm:text-sm">{user.firstName} {user.lastName}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{user.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{user.phoneNumber || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize gap-1 pl-2 text-[10px] sm:text-xs", roleColors[user.role || 'user'])}>
                        {roleIcons[user.role || 'user']}
                        {user.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-card">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.role === 'superadmin'}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions for {user.firstName}</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handlePasswordReset(user)}>Reset Password</DropdownMenuItem>
                          {user.role === 'user' && (
                            <DropdownMenuItem onSelect={() => handleRoleChange(user, 'admin')}>Promote to Admin</DropdownMenuItem>
                          )}
                          {user.role === 'admin' && (
                            <DropdownMenuItem onSelect={() => handleRoleChange(user, 'user')} className="text-amber-600 focus:text-amber-600">Demote to User</DropdownMenuItem>
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
        </CardContent>
      </Card>
    </div>
  );
}
