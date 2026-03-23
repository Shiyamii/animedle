import { NavLink } from "react-router";
import { CalendarDays, Infinity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type ModeMenuProps = {
    orientation?: "vertical" | "horizontal";
    className?: string;
};

export function ModeMenu({ orientation = "vertical", className }: ModeMenuProps) {
    const { t } = useTranslation();

    const containerClass = orientation === "vertical"
        ? "flex flex-col gap-4"
        : "flex flex-row flex-wrap items-center justify-center gap-3";

    const itemClass = orientation === "vertical"
        ? "w-full justify-center text-lg"
        : "justify-center";

    return (
        <div className={cn(containerClass, className)}>
            <NavLink
                to="/daily"
                className={({ isActive }) => cn(
                    "flex items-center gap-2 rounded-md border border-border bg-background px-4 py-3 font-semibold text-foreground transition hover:bg-accent",
                    itemClass,
                    isActive && "bg-accent"
                )}
            >
                <CalendarDays className="size-5" />
                <span>{t("home.dailyButton")}</span>
            </NavLink>

            <NavLink
                to="/endless"
                className={({ isActive }) => cn(
                    "flex items-center gap-2 rounded-md border border-border bg-background px-4 py-3 font-semibold text-foreground transition hover:bg-accent",
                    itemClass,
                    isActive && "bg-accent"
                )}
            >
                <Infinity className="size-5" />
                <span>{t("home.endlessButton")}</span>
            </NavLink>
        </div>
    );
}
