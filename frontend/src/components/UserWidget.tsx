import { useNavigate } from "react-router";
import { useUserStore } from "@/stores/userStore";
import { getAvatarUrl } from "@/lib/avatar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useTranslation } from "react-i18next";

export default function UserWidget() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useUserStore((s) => s.user);

    return (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
            <AnimatedThemeToggler className="p-2 bg-card border border-border rounded-full shadow-md hover:shadow-lg transition-shadow cursor-pointer" />
            {user ? (
                <button
                    onClick={() => navigate("/account")}
                    className="flex items-center gap-2.5 bg-card border border-border rounded-full pl-1 pr-3 py-1 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                        {user.avatarSeed ? (
                            <img
                                src={getAvatarUrl(user.avatarSeed)}
                                alt="avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary" />
                        )}
                    </div>
                    <span className="text-lg font-medium text-foreground max-w-32 min-w-12 truncate text-start">
                        {user.name}
                    </span>
                </button>
            ) : (
                <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                >
                    <span className="text-sm font-medium text-muted-foreground">{t("userWidget.signIn")}</span>
                </button>
            )}
        </div>
    );
}
