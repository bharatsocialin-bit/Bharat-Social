'use client';

import { useState, useMemo } from 'react';
import { MapPin, Search, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PULSE_CITIES } from '@/data/pulse-cities';
import { useSocialStore } from '@/store/useSocialStore';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/** City chooser for India Pulse — searchable, accessible dropdown. */
export function CityChooser() {
  const selectedCityId = useSocialStore((s) => s.pulseCityId);
  const setPulseCityId = useSocialStore((s) => s.setPulseCityId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = PULSE_CITIES.find((c) => c.id === selectedCityId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PULSE_CITIES;
    return PULSE_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'group inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition-all',
              'hover:brightness-105 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            aria-label="Choose your city"
          >
            <MapPin className="h-4 w-4" />
            <span className="max-w-[160px] truncate">
              {selected ? selected.name : 'Choose city'}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-80 transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 sm:w-[360px]" align="start">
          <div className="border-b border-border p-2">
            <label htmlFor="pulse-city-search" className="sr-only">
              Search cities
            </label>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                id="pulse-city-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city or state…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                type="search"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-80 overflow-y-auto scrollbar-thin" role="listbox" aria-label="Cities">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                No city matches “{query}”.
              </li>
            )}
            {filtered.map((c) => {
              const active = c.id === selectedCityId;
              return (
                <li key={c.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      setPulseCityId(c.id);
                      setOpen(false);
                      setQuery('');
                      toast({
                        title: `Showing ${c.name}`,
                        description: `Switched India Pulse to ${c.name}, ${c.state}.`,
                      });
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      active && 'bg-accent',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white shadow-sm',
                        c.gradient,
                      )}
                    >
                      {c.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.state} · {c.region} India
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-brand" aria-label="Selected" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
