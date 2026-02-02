import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Users, UserPlus, Trash2, Loader2, Edit } from "lucide-react";

interface Member {
    id: string;
    full_name: string;
    membership_number: string;
    id_number?: string;
    created_at: string;
}

export default function Members() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        membership_number: "",
        id_number: ""
    });

    useEffect(() => {
        fetchMembers();
    }, []);

    async function fetchMembers() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('store_members')
            .select('*')
            .eq('store_owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching members:', error);
            // If table doesn't exist, show empty state
            setMembers([]);
        } else {
            setMembers(data || []);
        }
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (editingMember) {
            // Update existing member
            const { error } = await supabase
                .from('store_members')
                .update({
                    full_name: formData.full_name,
                    membership_number: formData.membership_number,
                    id_number: formData.id_number || null
                })
                .eq('id', editingMember.id);

            if (error) {
                alert('Error updating member: ' + error.message);
            }
        } else {
            // Create new member
            const { error } = await supabase
                .from('store_members')
                .insert({
                    store_owner_id: user.id,
                    full_name: formData.full_name,
                    membership_number: formData.membership_number,
                    id_number: formData.id_number || null
                });

            if (error) {
                alert('Error adding member: ' + error.message);
            }
        }

        setFormLoading(false);
        setDialogOpen(false);
        setEditingMember(null);
        setFormData({ full_name: "", membership_number: "", id_number: "" });
        fetchMembers();
    }

    async function handleDelete(memberId: string) {
        if (!confirm('Are you sure you want to remove this member?')) return;

        const { error } = await supabase
            .from('store_members')
            .delete()
            .eq('id', memberId);

        if (error) {
            alert('Error removing member: ' + error.message);
        } else {
            fetchMembers();
        }
    }

    function openEditDialog(member: Member) {
        setEditingMember(member);
        setFormData({
            full_name: member.full_name,
            membership_number: member.membership_number,
            id_number: member.id_number || ""
        });
        setDialogOpen(true);
    }

    function openAddDialog() {
        setEditingMember(null);
        setFormData({ full_name: "", membership_number: "", id_number: "" });
        setDialogOpen(true);
    }

    // Generate next membership number
    function generateMembershipNumber() {
        const prefix = 'MEM';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${timestamp}-${random}`;
    }

    const filteredMembers = members.filter(member =>
        member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.membership_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Members</h1>
                    <p className="text-slate-400">Manage your store members and memberships.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={openAddDialog}
                            className="gap-2 bg-green-500 hover:bg-green-400 text-black font-medium"
                        >
                            <UserPlus size={16} />
                            Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
                        <DialogHeader>
                            <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                    placeholder="Enter full name"
                                    className="bg-slate-950 border-slate-800"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="membership_number">Membership Number *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="membership_number"
                                        value={formData.membership_number}
                                        onChange={(e) => setFormData({ ...formData, membership_number: e.target.value })}
                                        required
                                        placeholder="e.g. MEM-123456"
                                        className="bg-slate-950 border-slate-800"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setFormData({ ...formData, membership_number: generateMembershipNumber() })}
                                        className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                                    >
                                        Generate
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="id_number">ID Number (Optional)</Label>
                                <Input
                                    id="id_number"
                                    value={formData.id_number}
                                    onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                                    placeholder="Enter ID number"
                                    className="bg-slate-950 border-slate-800"
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={formLoading}
                                    className="w-full bg-green-500 hover:bg-green-400 text-black font-medium"
                                >
                                    {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingMember ? 'Update Member' : 'Add Member'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
                <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
                />
            </div>

            {/* Members List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800" />
                    ))}
                </div>
            ) : filteredMembers.length === 0 ? (
                <Card className="p-12 bg-slate-900 border-slate-800 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-slate-800 rounded-full">
                            <Users className="h-8 w-8 text-slate-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white">No members yet</h3>
                            <p className="text-slate-400 mt-1">Add your first store member to get started.</p>
                        </div>
                        <Button
                            onClick={openAddDialog}
                            className="mt-4 gap-2 bg-green-500 hover:bg-green-400 text-black font-medium"
                        >
                            <Plus size={16} />
                            Add First Member
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembers.map((member) => (
                        <Card key={member.id} className="p-5 bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-400 font-bold text-sm">
                                        {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{member.full_name}</h3>
                                        <p className="text-sm text-slate-400 font-mono">{member.membership_number}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditDialog(member)}
                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                                    >
                                        <Edit size={14} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(member.id)}
                                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                            {member.id_number && (
                                <p className="mt-3 text-xs text-slate-500">ID: {member.id_number.slice(0, 6)}...</p>
                            )}
                            <p className="mt-2 text-xs text-slate-500">
                                Added {new Date(member.created_at).toLocaleDateString()}
                            </p>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
