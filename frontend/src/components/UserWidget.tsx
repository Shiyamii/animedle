import { useNavigate } from "react-router";
import { useUserStore } from "@/stores/userStore";
import { getAvatarUrl } from "@/lib/avatar";
import { useTranslation } from "react-i18next";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { LogIn, LogOut, Moon, Sun, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import i18n from "@/i18n/i18n";
import { useCallback, useEffect, useRef, useState } from "react";

type SessionUser = { role?: string };
import { flushSync } from "react-dom";

function ThemeToggleItem() {
    const [isDark, setIsDark] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const update = () => setIsDark(document.documentElement.classList.contains("dark"));
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    const toggle = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const button = buttonRef.current;
        if (!button) return;

        const { top, left, width, height } = button.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const vw = window.visualViewport?.width ?? window.innerWidth;
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));

        const applyTheme = () => {
            const newDark = !isDark;
            setIsDark(newDark);
            document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme", newDark ? "dark" : "light");
        };

        if (typeof document.startViewTransition !== "function") {
            applyTheme();
            return;
        }

        const transition = document.startViewTransition(() => flushSync(applyTheme));
        transition?.ready?.then(() => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
                { duration: 400, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
            );
        });
    }, [isDark]);

    return (
        <button
            ref={buttonRef}
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Clair" : "Sombre"}
        </button>
    );
}

export function UserWidget() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useUserStore((s) => s.user);
    const { data: session } = authClient.useSession();
    const isAdmin = (session?.user as unknown as SessionUser)?.role === 'admin';
    const [currentLang, setCurrentLang] = useState(i18n.language);

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("language", lang);
        setCurrentLang(lang);
    };

    const handleSignOut = async () => {
        await authClient.signOut();
        navigate("/");
    };

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button
                    className="fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                    aria-label="Menu utilisateur"
                >
                    {user ? (
                        user.avatarSeed ? (
                            <img src={getAvatarUrl(user.avatarSeed)} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="h-5 w-5 text-foreground" />
                        )
                    ) : (
                        <LogIn className="h-5 w-5 text-muted-foreground" />
                    )}
                </button>
            </DropdownMenuPrimitive.Trigger>

            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    className={cn(
                        "z-50 min-w-48 rounded-lg border border-border bg-card p-1.5 shadow-lg",
                        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                        "data-[side=bottom]:slide-in-from-top-2"
                    )}
                >
                    {/* Header: user info or sign in */}
                    {user ? (
                        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0 border border-border">
                                {user.avatarSeed ? (
                                    <img src={getAvatarUrl(user.avatarSeed)} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary" />
                                )}
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-32">{user.name}</span>
                        </div>
                    ) : (
                        <DropdownMenuPrimitive.Item
                            onSelect={() => navigate("/login")}
                            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none mb-1"
                        >
                            <LogIn className="h-4 w-4" />
                            {t("userWidget.signIn")}
                        </DropdownMenuPrimitive.Item>
                    )}

                    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />

                    {/* Mon compte */}
                    {user && (
                        <>
                            <DropdownMenuPrimitive.Item
                                onSelect={() => navigate("/account")}
                                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none"
                            >
                                <User className="h-4 w-4" />
                                {t("userWidget.myAccount")}
                            </DropdownMenuPrimitive.Item>
                            {isAdmin && (
                                <DropdownMenuPrimitive.Item
                                    onSelect={() => navigate("/admin")}
                                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer outline-none"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    Administration
                                </DropdownMenuPrimitive.Item>
                            )}
                            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                        </>
                    )}

                    {/* Language switcher */}
                    <DropdownMenuPrimitive.Label className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        {t("userWidget.language")}
                    </DropdownMenuPrimitive.Label>
                    <DropdownMenuPrimitive.Item
                        onSelect={(e) => { e.preventDefault(); changeLanguage("fr"); }}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors cursor-pointer outline-none",
                            currentLang === "fr"
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <span className="text-base leading-none">🇫🇷</span>
                        Français
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                        onSelect={(e) => { e.preventDefault(); changeLanguage("en"); }}
                        className={cn(
                            "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors cursor-pointer outline-none",
                            currentLang === "en"
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <span className="text-base leading-none">🇬🇧</span>
                        English
                    </DropdownMenuPrimitive.Item>

                    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />

                    {/* Theme switcher */}
                    <DropdownMenuPrimitive.Label className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        {t("userWidget.theme")}
                    </DropdownMenuPrimitive.Label>
                    <DropdownMenuPrimitive.Item asChild onSelect={(e) => e.preventDefault()}>
                        <ThemeToggleItem />
                    </DropdownMenuPrimitive.Item>

                    {/* Sign out */}
                    {user && (
                        <>
                            <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
                            <DropdownMenuPrimitive.Item
                                onSelect={handleSignOut}
                                className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer outline-none"
                            >
                                <LogOut className="h-4 w-4" />
                                {t("userWidget.signOut")}
                            </DropdownMenuPrimitive.Item>
                        </>
                    )}
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}
