import { useState } from "react";
import { ProductTable, type Product } from "@/components/menu/ProductTable";
import { AddProductDialog } from "@/components/menu/AddProductDialog";
import { EditProductDialog } from "@/components/menu/EditProductDialog";

export default function Menu() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const handleProductAdded = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleProductUpdated = () => {
        setRefreshKey(prev => prev + 1);
        setEditingProduct(null);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Menu Management</h2>
                    <p className="text-muted-foreground">Manage your products and inventory.</p>
                </div>
                <AddProductDialog onProductAdded={handleProductAdded} />
            </div>

            <ProductTable
                key={refreshKey}
                onEditProduct={setEditingProduct}
            />

            <EditProductDialog
                product={editingProduct}
                open={!!editingProduct}
                onOpenChange={(open) => !open && setEditingProduct(null)}
                onProductUpdated={handleProductUpdated}
            />
        </div>
    );
}
