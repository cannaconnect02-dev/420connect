import { useState } from "react";
import { ProductTable } from "@/components/menu/ProductTable";
import { AddProductDialog } from "@/components/menu/AddProductDialog";

export default function Menu() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleProductAdded = () => {
        setRefreshKey(prev => prev + 1);
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

            <ProductTable key={refreshKey} />
        </div>
    );
}
