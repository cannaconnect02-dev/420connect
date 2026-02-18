import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader, CheckCircle, Upload, Eye, EyeOff, Store, FileText, User, MapPin } from 'lucide-react';
import ReactGoogleAutocomplete from 'react-google-autocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Clean Auth component - admin-dashboard styling pattern
// NO inline styles - only Tailwind classes

export default function Auth() {
    const { createMerchant } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    // Auth State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [storeName, setStoreName] = useState('');
    const [regNumber, setRegNumber] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Address State
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);

    // Google Maps API Key
    const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!isLogin) {
                if (!storeName) throw new Error("Store Name is required");
                if (!regNumber) throw new Error("Registration Number is required");
                if (!address || !lat || !lng) throw new Error("Store Address is required. Please select from the dropdown.");
            }

            const email = username.includes('@') ? username : `${username}@temp.420connect.local`;

            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                // Upload document if exists
                let documentUrl = '';
                if (documentFile) {
                    const fileExt = documentFile.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('merchant-documents')
                        .upload(filePath, documentFile);

                    if (uploadError) throw new Error(`Error uploading document: ${uploadError.message}`);

                    const { data: { publicUrl } } = supabase.storage
                        .from('merchant-documents')
                        .getPublicUrl(filePath);

                    documentUrl = publicUrl;
                }

                // Use new createMerchant function
                const { error } = await createMerchant(username, password, {
                    first_name: firstName,
                    surname: surname,
                    full_name: `${firstName} ${surname}`,
                    role: 'merchant',
                    store_name: storeName,
                    registration_number: regNumber,
                    document_url: documentUrl,
                    address: address,
                    latitude: lat,
                    longitude: lng,
                    date_of_birth: '' // Optional given user request to "use date_of_birth" but assuming field isn't added back yet unless asked. 
                    // Actually, if I don't send date_of_birth, the trigger sets it to null which is fine.
                    // But to be safe and consistent with "dont use dob use date_of_birth", I'll send the key.
                });

                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError(null);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Store className="h-6 w-6 text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        {isLogin ? 'Welcome Back' : 'Partner Application'}
                    </h1>
                    <p className="text-slate-400">
                        {isLogin ? 'Sign in to your merchant account' : 'Apply to become a 420connect partner'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <>
                            {/* Full Name */}
                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <Input
                                        type="text"
                                        placeholder="Surname"
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Store Name */}
                            <div className="relative">
                                <Store className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder="Store Name"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    required
                                    className="pl-11"
                                />
                            </div>

                            {/* Address Autocomplete */}
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none z-10" />
                                <ReactGoogleAutocomplete
                                    apiKey={GOOGLE_MAPS_API_KEY}
                                    onPlaceSelected={(place) => {
                                        if (place.geometry?.location) {
                                            setAddress(place.formatted_address || '');
                                            setLat(place.geometry.location.lat());
                                            setLng(place.geometry.location.lng());
                                        } else {
                                            console.error("No geometry info available for place");
                                        }
                                    }}
                                    options={{
                                        types: ['establishment', 'geocode'],
                                    }}
                                    placeholder="Store Address"
                                    className="flex h-10 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-11 text-white"
                                />
                            </div>

                            {/* Registration Number */}
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder="Registration Number"
                                    value={regNumber}
                                    onChange={(e) => setRegNumber(e.target.value)}
                                    required
                                    className="pl-11"
                                />
                            </div>

                            {/* Document Upload */}
                            <label className="flex items-center justify-center w-full h-14 bg-slate-950 border border-slate-800 border-dashed rounded-xl cursor-pointer hover:border-green-500/50 transition-colors">
                                {documentFile ? (
                                    <span className="text-green-400 text-sm font-medium flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        {documentFile.name.slice(0, 25)}...
                                    </span>
                                ) : (
                                    <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                                        <Upload className="h-4 w-4" />
                                        Upload Business License (Optional)
                                    </span>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,image/*"
                                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </>
                    )}

                    {/* Username */}
                    <div>
                        <Input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="pl-11"
                        />
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="pr-12"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-400 text-black font-medium py-3 rounded-xl transition-colors"
                    >
                        {loading ? <Loader className="animate-spin h-5 w-5" /> : (isLogin ? 'Sign In' : 'Submit Application')}
                    </Button>
                </form>

                {/* Toggle Mode */}
                <div className="mt-6 text-center">
                    <button
                        onClick={toggleMode}
                        className="text-green-400 hover:text-green-300 text-sm"
                    >
                        {isLogin ? "Don't have an account? Apply now" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
