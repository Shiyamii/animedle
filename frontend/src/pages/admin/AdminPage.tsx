import { useTranslation } from 'react-i18next';
import { useAdminViewModel } from './useAdminViewModel';
import { AdminAnimesTab } from './AdminAnimesTab';
import { AdminDailyTab } from './AdminDailyTab';
import { AdminStatsTab } from './AdminStatsTab';
import { AnimeFormDialog } from './AnimeFormDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

const TABS = ['animes', 'daily', 'stats'] as const;

export function AdminPage() {
    const { t } = useTranslation();
    const vm = useAdminViewModel();
    const { activeTab, setActiveTab } = vm;

    return (
        <div className="min-h-screen bg-background px-4 pt-20 pb-10">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">{t('admin.title')}</h1>

                <div className="flex gap-1 border-b border-border mb-6">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {t(`admin.tabs.${tab}`)}
                        </button>
                    ))}
                </div>

                {activeTab === 'animes' && <AdminAnimesTab vm={vm} />}
                {activeTab === 'daily' && <AdminDailyTab vm={vm} />}
                {activeTab === 'stats' && <AdminStatsTab vm={vm} />}
            </div>

            <AnimeFormDialog vm={vm} />
            <DeleteConfirmDialog vm={vm} />
        </div>
    );
}
