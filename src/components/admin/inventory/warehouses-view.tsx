'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useAuth } from '@/firebase';
import { logAdminAction } from "@/lib/audit-logger";
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Warehouse } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Download, Box } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationMonitor } from "@/components/admin/reservation-monitor";

export function WarehousesView() {
    const firestore = useFirestore();
    const { user } = useAuth();
    const { toast } = useToast();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Warehouse>>({
        name: '',
        address: '',
        city: 'Bangalore',
        serviceablePincodes: [],
        contactNumber: '',
        isActive: true
    });
    const [pincodeInput, setPincodeInput] = useState('');

    useEffect(() => {
        fetchWarehouses();
    }, [firestore]);

    const fetchWarehouses = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const q = query(collection(firestore, 'warehouses'));
            const snap = await getDocs(q);
            const data = snap.docs.map(doc => doc.data() as Warehouse);
            setWarehouses(data);
        } catch (error) {
            console.error("Error fetching warehouses:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!firestore) return;
        if (!formData.name || !formData.address || !formData.contactNumber) {
            toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
            return;
        }

        try {
            const id = editingWarehouse ? editingWarehouse.id : `wh-${Date.now()}`;
            const warehouseData: Warehouse = {
                id,
                name: formData.name!,
                address: formData.address!,
                city: formData.city || 'Bangalore',
                serviceablePincodes: formData.serviceablePincodes || [],
                contactNumber: formData.contactNumber!,
                isActive: formData.isActive ?? true,
                openingTime: formData.openingTime,
                closingTime: formData.closingTime
            };

            await setDoc(doc(firestore, 'warehouses', id), warehouseData, { merge: true });

            logAdminAction({
                action: 'WAREHOUSE_UPDATE',
                performedBy: user?.email || 'unknown',
                targetId: id,
                targetType: 'WAREHOUSE',
                details: editingWarehouse ? `Updated warehouse ${formData.name}` : `Created warehouse ${formData.name}`
            });

            toast({ title: "Success", description: "Warehouse saved successfully." });
            setIsDialogOpen(false);
            fetchWarehouses();
        } catch (error) {
            toast({ title: "Error", description: "Failed to save warehouse.", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This cannot be undone.")) return;
        if (!firestore) return;

        try {
            await deleteDoc(doc(firestore, 'warehouses', id));
            logAdminAction({
                action: 'WAREHOUSE_UPDATE',
                performedBy: user?.email || 'unknown',
                targetId: id,
                targetType: 'WAREHOUSE',
                details: 'Deleted warehouse'
            });

            toast({ title: "Deleted", description: "Warehouse deleted successfully." });
            fetchWarehouses();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete warehouse.", variant: "destructive" });
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            city: 'Bangalore',
            serviceablePincodes: [],
            contactNumber: '',
            isActive: true,
            openingTime: '09:00',
            closingTime: '22:00'
        });
        setPincodeInput('');
    };

    const openEdit = (wh: Warehouse) => {
        setEditingWarehouse(wh);
        setFormData(wh);
        setIsDialogOpen(true);
    };

    const addPincode = () => {
        if (pincodeInput.length === 6 && !formData.serviceablePincodes?.includes(pincodeInput)) {
            setFormData(prev => ({ ...prev, serviceablePincodes: [...(prev.serviceablePincodes || []), pincodeInput] }));
            setPincodeInput('');
        }
    };

    const removePincode = (code: string) => {
        setFormData(prev => ({ ...prev, serviceablePincodes: prev.serviceablePincodes?.filter(p => p !== code) }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-muted-foreground">Manage fulfillment centers and zones.</p>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setEditingWarehouse(null); resetForm(); } }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingWarehouse(null); resetForm(); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Warehouse
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Warehouse Name</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Indiranagar Central" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Address</Label>
                                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Full physical address" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>City</Label>
                                    <Input value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Contact Number</Label>
                                    <Input value={formData.contactNumber} onChange={e => setFormData({ ...formData, contactNumber: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Serviceable Pincodes (Zones)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={pincodeInput}
                                        onChange={e => setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="Enter 6-digit Pincode"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPincode())}
                                    />
                                    <Button type="button" variant="secondary" onClick={addPincode}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.serviceablePincodes?.map(code => (
                                        <Badge key={code} variant="outline" className="flex items-center gap-1">
                                            {code}
                                            <button onClick={() => removePincode(code)} className="ml-1 hover:text-destructive"><small>x</small></button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Opening Time</Label>
                                    <Input
                                        type="time"
                                        value={formData.openingTime || ''}
                                        onChange={e => setFormData({ ...formData, openingTime: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Closing Time</Label>
                                    <Input
                                        type="time"
                                        value={formData.closingTime || ''}
                                        onChange={e => setFormData({ ...formData, closingTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch id="active-mode" checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                                <Label htmlFor="active-mode">Active / Open for Orders</Label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save Warehouse</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>City</TableHead>
                            <TableHead>Pincodes</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {warehouses.map((wh) => (
                            <TableRow key={wh.id}>
                                <TableCell className="font-medium">
                                    {wh.name}
                                    <div className="text-xs text-muted-foreground">{wh.address}</div>
                                </TableCell>
                                <TableCell>{wh.city}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {wh.serviceablePincodes.slice(0, 3).map(p => (
                                            <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                                        ))}
                                        {wh.serviceablePincodes.length > 3 && <span className="text-xs text-muted-foreground">+{wh.serviceablePincodes.length - 3} more</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={wh.isActive ? 'default' : 'destructive'}>
                                        {wh.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(wh)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(wh.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
