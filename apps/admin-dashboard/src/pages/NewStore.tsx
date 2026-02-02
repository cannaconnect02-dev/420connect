import { useState, useRef } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Upload, Store, User, MapPin, Mail, Lock, Loader2, Save } from 'lucide-react';

export default function NewStore() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        email: '',
        password: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large (max 5MB)');
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Create User (using temporary client to avoid signing out admin)
            // Note: We're creating a new client instance that doesn't persist the session
            // so we can sign up a new user without affecting the current admin session
            const tempClient = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            });

            console.log('Creating user...');
            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: `Owner - ${formData.name}`,
                        role: 'store_admin'
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create user');

            const userId = authData.user.id;
            console.log('User created:', userId);

            // 2. Upload Logo (if selected)
            let imageUrl = null;
            if (imageFile) {
                console.log('Uploading image...');
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${userId}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('store-images')
                    .upload(fileName, imageFile);

                if (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    // Continue anyway, it's not critical
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from('store-images')
                        .getPublicUrl(fileName);
                    imageUrl = publicUrlData.publicUrl;
                }
            }

            // 3. Create Store
            console.log('Creating store record...');
            const { error: storeError } = await supabase
                .from('stores')
                .insert({
                    owner_id: userId,
                    name: formData.name,
                    address: formData.address,
                    email: formData.email,
                    image: imageUrl,
                    is_open: false, // Default to closed
                    operating_hours: {
                        monday: { open: '09:00', close: '21:00' },
                        tuesday: { open: '09:00', close: '21:00' },
                        wednesday: { open: '09:00', close: '21:00' },
                        thursday: { open: '09:00', close: '21:00' },
                        friday: { open: '09:00', close: '21:00' },
                        saturday: { open: '10:00', close: '22:00' },
                        sunday: { open: '10:00', close: '20:00' },
                    }
                });

            if (storeError) throw storeError;

            // 4. Assign Role (explicitly if needed, though meta_data might handle it via triggers)
            // Check if user_roles table exists and we have access
            console.log('Assigning role...');
            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: userId,
                    role: 'store_admin'
                });

            if (roleError) {
                console.warn('Could not insert into user_roles (might be handled by trigger or not accessible):', roleError);
            }

            alert('Store onboarded successfully!');

            // Reset form
            setFormData({
                name: '',
                address: '',
                email: '',
                password: '',
            });
            setImageFile(null);
            setImagePreview('');

        } catch (error: any) {
            console.error('Onboarding error:', error);
            alert(`Error: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Onboard New Store</h1>
                <p className="text-slate-400">Create a new store account and profile.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section: Store Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            <Store size={20} className="text-blue-500" /> Store Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Store Name</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="e.g. Green Leaf Dispensary"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        name="address"
                                        required
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="e.g. 123 Main St, City"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800 my-6" />

                    {/* Section: Account Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            <User size={20} className="text-blue-500" /> Owner Account
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="store.admin@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-800 my-6" />

                    {/* Section: Branding */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                            <Upload size={20} className="text-blue-500" /> Branding
                        </h3>

                        <div className="flex items-start gap-6">
                            <div className="w-32 h-32 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="text-slate-700" size={32} />
                                )}
                            </div>

                            <div className="space-y-2 flex-1">
                                <label className="text-sm font-medium text-slate-400">Store Logo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    ref={fileInputRef}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                                >
                                    <Upload size={16} /> Choose Image
                                </button>
                                <p className="text-xs text-slate-500">
                                    Recommended: 500x500px, Max 5MB. used for store listings.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} /> Onboarding Store...
                                </>
                            ) : (
                                <>
                                    <Save size={20} /> Complete Onboarding
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
