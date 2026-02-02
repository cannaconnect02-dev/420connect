import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AddProductDialog({ onProductAdded }: { onProductAdded: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        category: "flower",
        stock_quantity: "",
        unit: "g",
        thc_percentage: "",
        cbd_percentage: "",
        strain_type: "hybrid",
        is_available: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the merchant's restaurant ID first
        const { data: restaurant } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', user.id)
            .single();

        if (!restaurant) {
            alert("Error: No store found for this merchant account.");
            setLoading(false);
            return;
        }

        const { error } = await supabase.from("menu_items").insert({
            restaurant_id: restaurant.id,
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            stock_quantity: parseInt(formData.stock_quantity),
            unit: formData.unit,
            thc_percentage: parseFloat(formData.thc_percentage) || 0,
            cbd_percentage: parseFloat(formData.cbd_percentage) || 0,
            strain_type: formData.strain_type,
            is_available: formData.is_available,
            image_url: null // Placeholder
        });

        setLoading(false);
        if (!error) {
            setOpen(false);
            setFormData({
                name: "",
                description: "",
                price: "",
                category: "flower",
                stock_quantity: "",
                unit: "g",
                thc_percentage: "",
                cbd_percentage: "",
                strain_type: "hybrid",
                is_available: true
            });
            onProductAdded();
        } else {
            alert("Error adding product: " + error.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-green-500 hover:bg-green-400 text-black font-medium">
                    <Plus size={16} />
                    Add Product
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleChange} required className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                                <SelectTrigger className="bg-slate-950 border-white/10">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="flower">Flower</SelectItem>
                                    <SelectItem value="pre-rolls">Pre-Rolls</SelectItem>
                                    <SelectItem value="edibles">Edibles</SelectItem>
                                    <SelectItem value="vapes">Vapes</SelectItem>
                                    <SelectItem value="concentrates">Concentrates</SelectItem>
                                    <SelectItem value="tinctures">Tinctures</SelectItem>
                                    <SelectItem value="mens-health">Men's Health</SelectItem>
                                    <SelectItem value="womens-health">Women's Health</SelectItem>
                                    <SelectItem value="wellness">Wellness</SelectItem>
                                    <SelectItem value="immunity">Immunity</SelectItem>
                                    <SelectItem value="herbal-remedy">Herbal Remedy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="bg-slate-950 border-white/10" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price">Price ($)</Label>
                            <Input id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="stock">Stock Qty</Label>
                            <Input id="stock" name="stock_quantity" type="number" value={formData.stock_quantity} onChange={handleChange} required className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                                <SelectTrigger className="bg-slate-950 border-white/10">
                                    <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="g">Gram (g)</SelectItem>
                                    <SelectItem value="oz">Ounce (oz)</SelectItem>
                                    <SelectItem value="unit">Piece/Unit</SelectItem>
                                    <SelectItem value="ml">Milliliter (ml)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="thc">THC %</Label>
                            <Input id="thc" name="thc_percentage" type="number" step="0.1" value={formData.thc_percentage} onChange={handleChange} className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cbd">CBD %</Label>
                            <Input id="cbd" name="cbd_percentage" type="number" step="0.1" value={formData.cbd_percentage} onChange={handleChange} className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="strain">Strain Type</Label>
                            <Select value={formData.strain_type} onValueChange={(val) => setFormData({ ...formData, strain_type: val })}>
                                <SelectTrigger className="bg-slate-950 border-white/10">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sativa">Sativa</SelectItem>
                                    <SelectItem value="indica">Indica</SelectItem>
                                    <SelectItem value="hybrid">Hybrid</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            id="available"
                            checked={formData.is_available}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                        />
                        <Label htmlFor="available">Available for sale</Label>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-400 text-black font-medium">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Product
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
