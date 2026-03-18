"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
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
}


export function AutocompleteTextInput({ values, inputValue, setInputValue }: AutoCompleteProps) {
  const [selectedValue, setSelectedValue] = React.useState<number | null>(null)
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
    <div ref={wrapperRef} className="relative w-full">
      <Input
        type="text"
        placeholder="Commencez à taper (ex: React)..."
        value={inputValue}
        autoComplete="off"
        name="searchAnime"
        spellCheck={false}
        onChange={(e) => {
          const value = e.target.value
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
          <Command shouldFilter={false}>
            <CommandList>
              {values.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-sm">
                  Aucune proposition trouvée.
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
          </Command>
        </div>
      )}
    </div>
  )
}