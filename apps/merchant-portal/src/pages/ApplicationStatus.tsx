import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ApplicationStatus() {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate("/auth");
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-slate-900 border-slate-800">
                <CardHeader className="text-center space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto">
                        <Clock className="w-10 h-10 text-amber-500" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">Application Under Review</CardTitle>
                        <CardDescription className="text-slate-400 mt-2">
                            Thanks for signing up, {profile?.full_name || 'Merchant'}!
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                        <p className="text-sm text-slate-300 leading-relaxed text-center">
                            Your store owner application is currently being reviewed by our team. This process typically takes 24-48 hours.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs text-center text-slate-500">
                            You will receive an email notification once your account is approved.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full border-slate-700 hover:bg-slate-800 hover:text-white"
                            onClick={handleSignOut}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
