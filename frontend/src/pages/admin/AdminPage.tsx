import { useTranslation } from 'react-i18next';
import { AdminAnimesTab } from './AdminAnimesTab';
import { AdminCharactersTab } from './AdminCharactersTab';
import { AdminDailyTab } from './AdminDailyTab';
import { AdminStatsTab } from './AdminStatsTab';
import { AnimeFormDialog } from './AnimeFormDialog';
import { CharacterFormDialog } from './CharacterFormDialog';
import { DeleteCharacterConfirmDialog } from './DeleteCharacterConfirmDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { DisableAnimeConfirmDialog } from './DisableAnimeConfirmDialog';
import { useAdminViewModel } from './useAdminViewModel';

const TABS = ['animes', 'characters', 'daily', 'stats'] as const;

export function AdminPage() {
  const { t } = useTranslation();
  const vm = useAdminViewModel();
  const { activeTab, setActiveTab } = vm;

  return (
    <div className="min-h-screen bg-background px-4 pt-20 pb-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 font-bold text-2xl">{t('admin.title')}</h1>

        <div className="mb-6 flex gap-1 border-border border-b">
          {TABS.map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
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
        {activeTab === 'characters' && <AdminCharactersTab vm={vm} />}
        {activeTab === 'daily' && <AdminDailyTab vm={vm} />}
        {activeTab === 'stats' && <AdminStatsTab vm={vm} />}
      </div>

      <AnimeFormDialog vm={vm} />
      <DeleteConfirmDialog vm={vm} />
      <DisableAnimeConfirmDialog vm={vm} />
      <CharacterFormDialog vm={vm} />
      <DeleteCharacterConfirmDialog vm={vm} />
    </div>
  );
}
