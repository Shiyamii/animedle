import { Button } from "@/components/ui/button";
import { useAccountViewModel, getAvatarUrl } from "./useAccountViewModel";
import { useTranslation } from "react-i18next";

function AvatarSection({
    avatarSeed,
    onRandomize,
}: {
    avatarSeed: string;
    onRandomize: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary bg-muted">
                {avatarSeed && (
                    <img
                        src={getAvatarUrl(avatarSeed)}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
            <Button variant="outline" size="sm" onClick={onRandomize} type="button">
                {t("account.profile.generateAvatar")}
            </Button>
        </div>
    );
}

function ProfileSection({
    name,
    email,
    avatarSeed,
    onNameChange,
    onRandomizeAvatar,
    onSubmit,
    loading,
    error,
    success,
}: {
    name: string;
    email: string;
    avatarSeed: string;
    onNameChange: (v: string) => void;
    onRandomizeAvatar: () => void;
    onSubmit: () => void;
    loading: boolean;
    error: string | null;
    success: boolean;
}) {
    const { t } = useTranslation();
    return (
        <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border border-border flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-foreground">{t("account.profile.title")}</h2>

            <AvatarSection avatarSeed={avatarSeed} onRandomize={onRandomizeAvatar} />

            <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">{t("account.profile.username")}</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">{t("common.email")}</label>
                <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-muted text-muted-foreground border border-border rounded-md px-3 py-2 text-sm outline-none cursor-not-allowed"
                />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-sm" style={{ color: "var(--secondary)" }}>{t("account.profile.success")}</p>}

            <Button onClick={onSubmit} disabled={loading} className="w-full">
                {loading ? t("common.saving") : t("account.profile.save")}
            </Button>
        </div>
    );
}

function PasswordSection({
    currentPassword,
    newPassword,
    confirmPassword,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
    loading,
    error,
    success,
}: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    onCurrentPasswordChange: (v: string) => void;
    onNewPasswordChange: (v: string) => void;
    onConfirmPasswordChange: (v: string) => void;
    onSubmit: () => void;
    loading: boolean;
    error: string | null;
    success: boolean;
}) {
    const { t } = useTranslation();
    return (
        <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border border-border flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">{t("account.password.title")}</h2>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">{t("account.password.current")}</label>
                <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => onCurrentPasswordChange(e.target.value)}
                    className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">{t("account.password.new")}</label>
                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => onNewPasswordChange(e.target.value)}
                    className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground">{t("account.password.confirm")}</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => onConfirmPasswordChange(e.target.value)}
                    className="w-full bg-input text-foreground border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
            {success && <p className="text-sm" style={{ color: "var(--secondary)" }}>{t("account.password.success")}</p>}

            <Button onClick={onSubmit} disabled={loading} className="w-full">
                {loading ? t("common.saving") : t("account.password.change")}
            </Button>
        </div>
    );
}

export default function AccountPage() {
    const { t } = useTranslation();
    const vm = useAccountViewModel();

    if (vm.isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
        );
    }

    if (!vm.user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">{t("account.notConnected")}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-10 px-4">
            <div className="max-w-lg mx-auto flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-foreground font-sans">{t("account.title")}</h1>
                    <Button variant="destructive" size="sm" onClick={vm.signOut}>
                        {t("account.signOut")}
                    </Button>
                </div>

                <ProfileSection
                    name={vm.name}
                    email={vm.user.email}
                    avatarSeed={vm.avatarSeed}
                    onNameChange={vm.setName}
                    onRandomizeAvatar={vm.randomizeAvatar}
                    onSubmit={vm.updateProfile}
                    loading={vm.profileLoading}
                    error={vm.profileError}
                    success={vm.profileSuccess}
                />

                <PasswordSection
                    currentPassword={vm.currentPassword}
                    newPassword={vm.newPassword}
                    confirmPassword={vm.confirmPassword}
                    onCurrentPasswordChange={vm.setCurrentPassword}
                    onNewPasswordChange={vm.setNewPassword}
                    onConfirmPasswordChange={vm.setConfirmPassword}
                    onSubmit={vm.updatePassword}
                    loading={vm.passwordLoading}
                    error={vm.passwordError}
                    success={vm.passwordSuccess}
                />
            </div>
        </div>
    );
}
