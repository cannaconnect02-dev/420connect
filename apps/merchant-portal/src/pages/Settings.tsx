import { useState, useEffect, useRef, useCallback } from 'react';
import { logError } from '@/lib/error-handler';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Store,
    Clock,
    MapPin,
    Phone,
    Mail,
    Save,
    Loader2,
    ShieldCheck,
    Plus,
    Trash2,
    Upload,
    ImageIcon,
    ClockIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { StoreAddressAutocomplete } from '@/components/store/StoreAddressAutocomplete';
// @ts-ignore - Supabase type might be missing in target, treating as any for migration
import type { Json } from '@/integrations/supabase/types';
import { format } from 'date-fns';

interface DayHours {
    open: string;
    close: string;
}

interface OperatingHours {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
}


interface StoreData {
    id: string;
    name: string;
    description: string;
    address: string;
    phone: string;
    email: string;
    is_open: boolean;
    image_url: string | null;
    operating_hours: OperatingHours;
    latitude: number | null;
    longitude: number | null;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<typeof DAYS[number], string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
};

const DEFAULT_HOURS: OperatingHours = {
    monday: { open: '09:00', close: '21:00' },
    tuesday: { open: '09:00', close: '21:00' },
    wednesday: { open: '09:00', close: '21:00' },
    thursday: { open: '09:00', close: '21:00' },
    friday: { open: '09:00', close: '21:00' },
    saturday: { open: '10:00', close: '22:00' },
    sunday: { open: '10:00', close: '20:00' },
};

export default function Settings() {
    const { user, hasRole, requestRole } = useAuth();
    const { toast } = useToast();
    const { loaded: googleMapsLoaded } = useGoogleMaps();
    const [store, setStore] = useState<StoreData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasStore, setHasStore] = useState(true);
    const [isRequestingRole, setIsRequestingRole] = useState(false);
    const [hasStoreAdminRole, setHasStoreAdminRole] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [pendingRequestDate, setPendingRequestDate] = useState<string | null>(null);
    const [closedDays, setClosedDays] = useState<Set<typeof DAYS[number]>>(new Set());
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            const roleCheck = hasRole('store_admin');
            setHasStoreAdminRole(roleCheck);
            if (roleCheck) {
                fetchStore();
            } else {
                // Check for pending store_admin role request
                checkPendingRequest();
            }
        }
    }, [user, hasRole]);

    const checkPendingRequest = async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('role_requests')
                .select('id, requested_at, status')
                .eq('user_id', user.id)
                .eq('role', 'store_admin')
                .order('requested_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data && data.status === 'pending') {
                setHasPendingRequest(true);
                setPendingRequestDate(data.requested_at);
            }
        } catch (error) {
            console.error('Error checking pending request:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStore = async () => {
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .select('*')
                .eq('owner_id', user?.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                const operatingHours = (data.operating_hours as unknown as OperatingHours) || DEFAULT_HOURS;
                setStore({
                    ...data,
                    operating_hours: operatingHours,
                    latitude: data.latitude ? Number(data.latitude) : null,
                    longitude: data.longitude ? Number(data.longitude) : null,
                });

                // Detect closed days (where open and close are both empty or same)
                const closed = new Set<typeof DAYS[number]>();
                DAYS.forEach(day => {
                    const hours = operatingHours[day];
                    if (!hours || (!hours.open && !hours.close)) {
                        closed.add(day);
                    }
                });
                setClosedDays(closed);
                setHasStore(true);
                setHasStore(true);
                // Set initial image preview from existing store image
                if (data.image_url) {
                    setImagePreview(data.image_url);
                }
            } else {
                setHasStore(false);
            }
        } catch (error) {
            console.error('Error fetching store:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestStoreRole = async () => {
        setIsRequestingRole(true);
        try {
            const result = await requestRole('store_admin');
            if (result.success) {
                if (result.status === 'approved' || result.status === 'already_assigned') {
                    setHasStoreAdminRole(true);
                    setHasPendingRequest(false);
                    toast({
                        title: 'Store access granted!',
                        description: 'You can now create your store.'
                    });
                } else if (result.status === 'pending') {
                    setHasPendingRequest(true);
                    setPendingRequestDate(new Date().toISOString());
                    toast({
                        title: 'Application submitted!',
                        description: 'Your store access request has been submitted for review.'
                    });
                }
            } else {
                toast({
                    title: 'Error',
                    description: result.error || 'Failed to request store access',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            logError('Request store role', error);
            toast({
                title: 'Error',
                description: 'Failed to request store access',
                variant: 'destructive',
            });
        } finally {
            setIsRequestingRole(false);
        }
    };

    const handleCreateStore = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('restaurants')
                .insert({
                    owner_id: user.id,
                    name: 'My Store',
                    address: 'Enter your address',
                    description: '',
                    phone: '',
                    email: user.email || '',
                    is_open: true,
                    is_active: true,
                    operating_hours: DEFAULT_HOURS as unknown as Json,
                    location: 'POINT(18.4241 -33.9249)', // Default to Cape Town
                })
                .select()
                .single();

            if (error) throw error;

            setStore({
                ...data,
                operating_hours: DEFAULT_HOURS,
            });
            setHasStore(true);
            toast({ title: 'Store created successfully!' });
        } catch (error: any) {
            logError('Store creation', error);
            toast({
                title: 'Error creating store',
                description: 'Unable to create store. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleHoursChange = (day: typeof DAYS[number], field: 'open' | 'close', value: string) => {
        if (!store) return;
        setStore(prev => prev ? {
            ...prev,
            operating_hours: {
                ...prev.operating_hours,
                [day]: {
                    ...prev.operating_hours[day],
                    [field]: value,
                },
            },
        } : null);
    };

    const toggleDayClosed = (day: typeof DAYS[number]) => {
        setClosedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(day)) {
                newSet.delete(day);
                // Restore default hours
                if (store) {
                    setStore(s => s ? {
                        ...s,
                        operating_hours: {
                            ...s.operating_hours,
                            [day]: DEFAULT_HOURS[day],
                        },
                    } : null);
                }
            } else {
                newSet.add(day);
                // Clear hours
                if (store) {
                    setStore(s => s ? {
                        ...s,
                        operating_hours: {
                            ...s.operating_hours,
                            [day]: { open: '', close: '' },
                        },
                    } : null);
                }
            }
            return newSet;
        });
    };

    const handleAddressChange = useCallback((address: string, latitude: number | null, longitude: number | null) => {
        setStore(prev => prev ? {
            ...prev,
            address,
            latitude,
            longitude,
        } : null);
    }, []);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast({
                title: 'Invalid file type',
                description: 'Please upload a JPG, PNG, or WebP image',
                variant: 'destructive',
            });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please upload an image under 5MB',
                variant: 'destructive',
            });
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const uploadStoreImage = async (): Promise<string | null> => {
        if (!imageFile || !store) return store?.image_url || null;

        setIsUploading(true);
        try {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${store.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('store-images')
                .upload(fileName, imageFile, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('store-images')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            logError('Store image upload', error);
            toast({
                title: 'Upload failed',
                description: 'Failed to upload image. Please try again.',
                variant: 'destructive',
            });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store) return;

        setIsSaving(true);
        try {
            // Upload image first if a new file was selected
            let imageUrl = store.image_url;
            if (imageFile) {
                const uploadedUrl = await uploadStoreImage();
                if (uploadedUrl) {
                    imageUrl = uploadedUrl;
                }
            }

            const { error } = await supabase
                .from('restaurants')
                .update({
                    name: store.name,
                    description: store.description,
                    address: store.address,
                    phone: store.phone,
                    email: store.email,
                    is_open: store.is_open,
                    image_url: imageUrl,
                    operating_hours: store.operating_hours as unknown as Json,
                    latitude: store.latitude,
                    longitude: store.longitude,
                    // Attempt to update PostGIS location if coords exist
                    ...(store.latitude && store.longitude
                        ? { location: `POINT(${store.longitude} ${store.latitude})` }
                        : {})
                })
                .eq('id', store.id);

            if (error) throw error;

            // Update local state with new image URL
            setStore(prev => prev ? { ...prev, image_url: imageUrl } : null);
            setImageFile(null);

            toast({ title: 'Settings saved successfully!' });
        } catch (error: any) {
            logError('Store settings save', error);
            toast({
                title: 'Error saving settings',
                description: 'Unable to save settings. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Show pending state if user has submitted a request
    if (!hasStoreAdminRole && hasPendingRequest) {
        return (
            <Card className="max-w-lg mx-auto mt-12">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <ClockIcon className="w-8 h-8 text-amber-500" />
                    </div>
                    <CardTitle>Application Under Review</CardTitle>
                    <CardDescription className="mt-2">
                        Your store access request has been submitted. An administrator will review your application and notify you once approved.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Submitted:</span>{' '}
                            {pendingRequestDate ? format(new Date(pendingRequestDate), 'MMM d, yyyy \'at\' h:mm a') : 'Recently'}
                        </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        You will receive an email notification when your application is approved.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Show role request if user doesn't have store_admin role
    if (!hasStoreAdminRole) {
        return (
            <Card className="max-w-lg mx-auto mt-12">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle>Complete Store Setup</CardTitle>
                    <CardDescription>
                        To create and manage your store, you need to request store owner access. An administrator will review your application.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleRequestStoreRole}
                        className="w-full"
                        disabled={isRequestingRole}
                    >
                        {isRequestingRole ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Request Store Access'
                        )}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!hasStore) {
        return (
            <Card className="max-w-lg mx-auto mt-12">
                <CardHeader className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <Store className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle>Create Your Store</CardTitle>
                    <CardDescription>
                        Set up your store to start selling on 420Connect
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleCreateStore}
                        className="w-full"
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Store'
                        )}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Store Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your store information</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Store Status */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Store className="w-5 h-5" />
                            Store Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Store is Open</p>
                                <p className="text-sm text-muted-foreground">
                                    {store?.is_open ? 'Accepting orders' : 'Not accepting orders'}
                                </p>
                            </div>
                            <Switch
                                checked={store?.is_open || false}
                                onCheckedChange={(checked) => setStore(prev => prev ? { ...prev, is_open: checked } : null)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Basic Info */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Store Name</Label>
                            <Input
                                id="name"
                                value={store?.name || ''}
                                onChange={(e) => setStore(prev => prev ? { ...prev, name: e.target.value } : null)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={store?.description || ''}
                                onChange={(e) => setStore(prev => prev ? { ...prev, description: e.target.value } : null)}
                                rows={3}
                                placeholder="Tell customers about your store..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Store Image</Label>
                            <div className="space-y-3">
                                {/* Image Preview */}
                                <div className="w-full h-48 rounded-lg border border-border bg-muted/50 overflow-hidden flex items-center justify-center">
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Store preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <ImageIcon className="w-12 h-12" />
                                            <span className="text-sm">No image uploaded</span>
                                        </div>
                                    )}
                                </div>

                                {/* Upload Button */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full sm:w-auto"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload Photo
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Accepted: JPG, PNG, WebP (max 5MB)
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Contact & Location
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {googleMapsLoaded ? (
                            <StoreAddressAutocomplete
                                value={store?.address || ''}
                                onChange={handleAddressChange}
                                hasCoordinates={!!(store?.latitude && store?.longitude)}
                            />
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    value={store?.address || ''}
                                    onChange={(e) => setStore(prev => prev ? { ...prev, address: e.target.value } : null)}
                                    required
                                />
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Loading address autocomplete...
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        type="tel"
                                        className="pl-10"
                                        value={store?.phone || ''}
                                        onChange={(e) => setStore(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        className="pl-10"
                                        value={store?.email || ''}
                                        onChange={(e) => setStore(prev => prev ? { ...prev, email: e.target.value } : null)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Operating Hours */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Operating Hours
                        </CardTitle>
                        <CardDescription>Set your business hours for each day of the week</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {DAYS.map((day) => {
                            const isClosed = closedDays.has(day);
                            const hours = store?.operating_hours?.[day] || { open: '', close: '' };

                            return (
                                <div key={day} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                                    <div className="w-28 font-medium text-foreground">
                                        {DAY_LABELS[day]}
                                    </div>

                                    {isClosed ? (
                                        <div className="flex-1 flex items-center justify-between">
                                            <span className="text-muted-foreground italic">Closed</span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleDayClosed(day)}
                                                className="gap-1"
                                            >
                                                <Plus className="w-4 h-4" />
                                                Add Hours
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center gap-2">
                                            <Input
                                                type="time"
                                                value={hours.open}
                                                onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                                className="w-32"
                                            />
                                            <span className="text-muted-foreground">to</span>
                                            <Input
                                                type="time"
                                                value={hours.close}
                                                onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                                className="w-32"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleDayClosed(day)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                <Button type="submit" className="gap-2" disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
