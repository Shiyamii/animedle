'use client';

import { Command as CommandPrimitive } from 'cmdk';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandInput } from '@/components/ui/command';
import type { AnimeItemDTO } from '@/stores/animeStore';

export type AutoCompleteProps = {
  values: AnimeItemDTO[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isFilteringLoading: boolean;
  onSelect?: (value: string) => void;
};

export function AutocompleteTextInput({
  values,
  inputValue,
  setInputValue,
  isFilteringLoading,
  onSelect,
}: AutoCompleteProps) {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Référence pour détecter les clics en dehors du composant
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique ailleurs sur la page
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <Command ref={wrapperRef} shouldFilter={false} className="relative w-full overflow-visible">
      <input
        type="text"
        placeholder={t('autocomplete.placeholder')}
        value={inputValue}
        autoFocus
        autoComplete="off"
        name="searchAnime"
        style={{ zIndex: 1000, pointerEvents: 'auto', background: 'white', color: 'black', width: '100%', border: '1px solid #ccc', borderRadius: 4, padding: 8, marginBottom: 8 }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          console.log('[DEBUG] onChange autocomplete', value);
          setInputValue(value);
          setIsOpen(value.length > 0);
          if (selectedValue) {
            setSelectedValue(null);
          }
        }}
        onFocus={() => {
          if (inputValue.length > 0) {
            setIsOpen(true);
          }
        }}
      />

      {isOpen && (
        <div className="fade-in-0 zoom-in-95 absolute top-full z-10 mt-1 w-full animate-in rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
          <CommandList>
            {values.length === 0 || isFilteringLoading ? (
              <CommandEmpty className="py-6 text-center text-sm">
                {isFilteringLoading ? t('autocomplete.loading') : t('autocomplete.noResults')}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {values.map((anime) => (
                  <CommandItem
                    key={anime.id}
                    value={anime.title}
                    onSelect={() => {
                      setInputValue('');
                      setSelectedValue(anime.id);
                      setIsOpen(false);
                      onSelect?.(anime.id);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex h-16 flex-row items-center gap-2">
                      <img src={anime.imageUrl} alt={anime.title} className="h-16 w-14 rounded-md object-cover" />
                      <div className="flex flex-col">
                        <p className="text-lg">{anime.title}</p>
                        <p className="text-muted-foreground text-sm">{anime.alias[0]}</p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </div>
      )}
    </Command>
  );
}
