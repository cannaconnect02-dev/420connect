import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, Image as ImageIcon, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type Product } from "./ProductTable";

interface EditProductDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductUpdated: () => void;
}

export function EditProductDialog({ product, open, onOpenChange, onProductUpdated }: EditProductDialogProps) {
    const [loading, setLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [markupPercent, setMarkupPercent] = useState(20); // Default 20%
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial form state - we'll update this when product changes
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "", // Base Price (Your Cost)
        category: "flower",
        stock_quantity: "",
        unit: "g",
        thc_percentage: "",
        cbd_percentage: "",
        strain_type: "hybrid",
        is_available: true
    });

    // Populate form when product changes
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                description: (product as any).description || "",
                price: (product.base_price ?? product.price).toString(), // Use base_price if available, else fallback
                category: product.category,
                stock_quantity: product.stock_quantity.toString(),
                unit: (product as any).unit || "g",
                thc_percentage: ((product as any).thc_percentage || "").toString(),
                cbd_percentage: ((product as any).cbd_percentage || "").toString(),
                strain_type: (product as any).strain_type || "hybrid",
                is_available: product.is_available
            });
            setImagePreview(product.image_url);
            setImageFile(null); // Reset new file

            // Fetch markup when dialog opens
            fetchMarkup();
        }
    }, [product, open]);

    const fetchMarkup = async () => {
        const { data } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'global_markup_percent')
            .single();

        if (data?.value?.percent) {
            setMarkupPercent(Number(data.value.percent));
        }
    };

    const calculateCustomerPrice = (basePrice: string) => {
        if (!basePrice) return "0.00";
        const base = parseFloat(basePrice);
        if (isNaN(base)) return "0.00";

        const withMarkup = base + (base * (markupPercent / 100));
        // Round up to nearest 5
        const rounded = Math.ceil(withMarkup / 5) * 5;
        return rounded.toFixed(2);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('Image must be less than 5MB');
                return;
            }
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const uploadImage = async (storeId: string): Promise<string | null> => {
        if (!imageFile) return null;

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${storeId}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, imageFile, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Error uploading image:', error);
            throw new Error('Failed to upload image');
        }

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(data.path);

        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Look up store again to be safe
            const { data: store } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!store) throw new Error("Store not found");

            let imageUrl = product.image_url;
            if (imageFile) {
                imageUrl = await uploadImage(store.id);
            } else if (!imagePreview && product.image_url) {
                imageUrl = null;
            }

            const { error } = await supabase
                .from("menu_items")
                .update({
                    name: formData.name,
                    description: formData.description,
                    base_price: parseFloat(formData.price), // Update base_price
                    // price: ... trigger will set this
                    category: formData.category,
                    stock_quantity: parseInt(formData.stock_quantity),
                    unit: formData.unit,
                    thc_percentage: parseFloat(formData.thc_percentage) || 0,
                    cbd_percentage: parseFloat(formData.cbd_percentage) || 0,
                    strain_type: formData.strain_type,
                    is_available: formData.is_available,
                    image_url: imageUrl
                })
                .eq('id', product.id);

            if (error) throw error;

            onProductUpdated();
            onOpenChange(false);

        } catch (err: any) {
            alert("Error updating product: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Image Upload Section */}
                    <div className="grid gap-2">
                        <Label>Product Image</Label>
                        <div className="flex items-center gap-4">
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-24 h-24 object-cover rounded-lg border border-white/10"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors"
                                >
                                    <ImageIcon size={24} className="text-white/40" />
                                    <span className="text-xs text-white/40 mt-1">Add Image</span>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            {!imagePreview && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-white/10 text-white hover:bg-white/10"
                                >
                                    <Upload size={16} className="mr-2" />
                                    Choose File
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Product Name</Label>
                            <Input id="edit-name" name="name" value={formData.name} onChange={handleChange} required className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-category">Category</Label>
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
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} className="bg-slate-950 border-white/10" />
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5 space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 text-sm mb-2">
                            <Info size={16} />
                            <span className="font-semibold">Pricing Calculator</span>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-price" className="text-green-400">Your Cost (Base Price)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400">R</span>
                                    <Input
                                        id="edit-price"
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        className="bg-slate-950 border-white/10 pl-8"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-xs text-slate-400">Enter the amount you want to earn.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-slate-300">Customer Pays (Approx)</Label>
                                <div className="h-10 px-3 py-2 bg-slate-800 rounded-md border border-white/10 text-white font-medium flex items-center">
                                    R {calculateCustomerPrice(formData.price)}
                                </div>
                                <p className="text-xs text-slate-500">Includes platform markup.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-stock">Stock Qty</Label>
                            <Input id="edit-stock" name="stock_quantity" type="number" value={formData.stock_quantity} onChange={handleChange} required className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-unit">Unit</Label>
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
                            <Label htmlFor="edit-thc">THC %</Label>
                            <Input id="edit-thc" name="thc_percentage" type="number" step="0.1" value={formData.thc_percentage} onChange={handleChange} className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-cbd">CBD %</Label>
                            <Input id="edit-cbd" name="cbd_percentage" type="number" step="0.1" value={formData.cbd_percentage} onChange={handleChange} className="bg-slate-950 border-white/10" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-strain">Strain Type</Label>
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
                            id="edit-available"
                            checked={formData.is_available}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                        />
                        <Label htmlFor="edit-available">Available for sale</Label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white font-medium">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Product
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
