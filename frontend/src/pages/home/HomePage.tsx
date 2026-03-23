import { useTranslation } from "react-i18next";
import { ModeMenu } from "@/components/ModeMenu";

function HomePage() {
    const { t } = useTranslation();

    return (
        <div className="flex min-h-svh w-full items-center justify-center px-6">
            <div className="mt-24 w-full max-w-md rounded-xl border border-border bg-card p-8 text-card-foreground shadow-md">
                <h1 className="text-center text-2xl font-bold text-primary">{t("home.menuTitle")}</h1>
                <ModeMenu className="mt-8" />
            </div>
        </div>
    )
}

export default HomePage;
