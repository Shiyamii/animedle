import { Button } from "@/components/ui/button";
import { useAuthViewModel } from "./useAuthViewModel.ts";
import { useTranslation } from "react-i18next";

export function AuthPage() {
    const { t } = useTranslation();
    const { mode, email, setEmail, password, setPassword, name, setName, error, loading, handleSubmit, toggleMode } = useAuthViewModel();

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-full max-w-sm bg-card text-card-foreground rounded-xl p-8 shadow-md border border-border">
                <h1 className="text-2xl font-bold text-foreground mb-6 text-center font-sans">
                    {mode === "login" ? t("auth.login") : t("auth.register")}
                </h1>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === "register" && (
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-muted-foreground">{t("auth.name")}</label>
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
                        <label className="text-sm text-muted-foreground">{t("common.email")}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-muted-foreground">{t("auth.password")}</label>
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
                        {loading ? t("common.loading") : mode === "login" ? t("auth.loginButton") : t("auth.registerButton")}
                    </Button>
                </form>

                <p className="text-center text-muted-foreground text-sm mt-6">
                    {mode === "login" ? t("auth.noAccount") : t("auth.alreadyAccount")}{" "}
                    <button onClick={toggleMode} className="text-primary font-medium hover:underline">
                        {mode === "login" ? t("auth.registerButton") : t("auth.loginButton")}
                    </button>
                </p>
            </div>
        </div>
    );
}
