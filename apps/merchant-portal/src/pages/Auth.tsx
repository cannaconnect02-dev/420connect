import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader, CheckCircle, Upload, Eye, EyeOff, Store, MapPin, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Clean Auth component - admin-dashboard styling pattern
// NO inline styles - only Tailwind classes

export default function Auth() {
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [regNumber, setRegNumber] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!isLogin) {
                if (!dob) throw new Error("Date of birth is required");
                if (!storeName) throw new Error("Store Name is required");
                if (!storeAddress) throw new Error("Store Address is required");
                if (!regNumber) throw new Error("Registration Number is required");

                const birthDate = new Date(dob);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                if (age < 18) throw new Error('You must be at least 18 years old to sign up.');
            }

            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: 'merchant',
                            date_of_birth: dob,
                            store_name: storeName,
                            store_address: storeAddress,
                            registration_number: regNumber
                        }
                    },
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
                            <div>
                                <Input
                                    type="text"
                                    placeholder="Full Name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Date of Birth */}
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    required
                                    className="pl-11"
                                />
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

                            {/* Store Address */}
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                <Input
                                    type="text"
                                    placeholder="Store Address"
                                    value={storeAddress}
                                    onChange={(e) => setStoreAddress(e.target.value)}
                                    required
                                    className="pl-11"
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

                    {/* Email */}
                    <div>
                        <Input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
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
