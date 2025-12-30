
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
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

const tierColors: { [key: string]: string } = {
  Bronze: "bg-orange-200 text-orange-800",
  Silver: "bg-slate-200 text-slate-800",
  Gold: "bg-yellow-200 text-yellow-800",
};


export default function AdminAdminsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const usersCollection = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, 'users'), where('role', '==', 'admin')) : null),
    [firestore, user]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersCollection);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold md:text-2xl font-headline">Administrators</h1>
      <Card>
        <CardHeader>
          <CardTitle>Administrator List</CardTitle>
          <CardDescription>
            View and manage all administrator users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-4">Loading admins...</TableCell></TableRow>}
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">{user.phoneNumber || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{user.address || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="gap-1 pl-2">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">No administrators found.</TableCell>
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
