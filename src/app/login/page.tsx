import { LoginForm } from "@/components/loginform";
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
    AlertCircle, CheckCircle2, TrendingUp, Users,
} from "lucide-react";

export default function loginForm() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Login</h1>
                <p className="text-muted-foreground mt-1">
                    Please enter your credentials to access the dashboard. 
                </p>
            </div>
            <Card>
                <CardContent>
                    <LoginForm />
                </CardContent>
            </Card>
        </div>
    );
}