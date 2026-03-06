import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (mode === "login") {
            const { error } = await authClient.signIn.email({ email, password });
            if (error) {
                setError(error.message ?? "Erreur de connexion");
            } else {
                navigate("/");
            }
        } else {
            const { error } = await authClient.signUp.email({ email, password, name });
            if (error) {
                setError(error.message ?? "Erreur d'inscription");
            } else {
                navigate("/");
            }
        }

        setLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-sm bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border">
                <h1 className="text-2xl font-bold text-foreground mb-6 text-center font-sans">
                    {mode === "login" ? "Connexion" : "Inscription"}
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === "register" && (
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-muted-foreground">Nom</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-muted-foreground">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-muted-foreground">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {error && (
                        <p className="text-destructive text-sm">{error}</p>
                    )}

                    <Button type="submit" disabled={loading} className="w-full mt-2">
                        {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "S'inscrire"}
                    </Button>
                </form>

                <p className="text-center text-muted-foreground text-sm mt-6">
                    {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
                    <button
                        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                        className="text-primary font-medium hover:underline"
                    >
                        {mode === "login" ? "S'inscrire" : "Se connecter"}
                    </button>
                </p>
            </div>
        </div>
    );
}
