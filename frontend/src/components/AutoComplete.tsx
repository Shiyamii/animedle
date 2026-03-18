"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { AnimeItemDTO } from "@/stores/animeStore"

export type AutoCompleteProps = {
  values: AnimeItemDTO[],
  inputValue: string,
  setInputValue: (value: string) => void,
  isFilteringLoading: boolean,
  onSelect?: (value: string) => void,
}


export function AutocompleteTextInput({ values, inputValue, setInputValue, isFilteringLoading, onSelect }: AutoCompleteProps) {
  const [selectedValue, setSelectedValue] = React.useState<string | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  // Référence pour détecter les clics en dehors du composant
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  // Fermer le menu si on clique ailleurs sur la page
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])


  return (
    <Command 
    ref={wrapperRef} 
    shouldFilter={false} 
    className="relative w-full overflow-visible">
      <CommandPrimitive.Input
        placeholder="Commencez à taper (ex: React)..."
        value={inputValue}
        autoComplete="off"
        name="searchAnime"

        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
        
        onValueChange={(value: string) => {
          setInputValue(value)
          setIsOpen(value.length > 0) 
          if (selectedValue) setSelectedValue(null)
        }}
        onFocus={() => {
          if (inputValue.length > 0) setIsOpen(true)
        }}
      />

      {isOpen && (
        <div className="absolute top-full z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <CommandList>
              {values.length === 0 || isFilteringLoading ? (
                <CommandEmpty className="py-6 text-center text-sm">
                  {isFilteringLoading ? "Chargement..." : "Aucun résultat trouvé."}
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {values.map((anime) => (
                    <CommandItem
                      key={anime.id}
                      value={anime.title}
                      onSelect={() => {
                        setInputValue(anime.title) 
                        setSelectedValue(anime.id) 
                        setIsOpen(false)
                        onSelect?.(anime.id)
                      }}
                      className="cursor-pointer"
                    >
                        <div className="flex flex-row items-center gap-2 h-16">
                            <img src={anime.imageUrl} alt={anime.title} className="h-16 w-14 rounded-md object-cover" />
                            <div className="flex flex-col">
                                <p className="text-lg ">{anime.title}</p>
                                <p className="text-sm text-muted-foreground">{anime.alias[0]}</p>
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
  )
}