import { type ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function HintSpoilerBlock({
  useSpoiler,
  contentKey,
  empty,
  emptyLabel,
  /** Si vide : message dynamique (ex. décompte avant révélation) ; sinon `emptyLabel`. */
  emptyHint,
  tapLabel,
  children,
  align,
}: {
  useSpoiler: boolean;
  contentKey: string;
  empty: boolean;
  emptyLabel: string;
  emptyHint?: string;
  tapLabel: string;
  children: ReactNode;
  align: 'left' | 'right';
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [contentKey]);

  if (empty) {
    return (
      <div
        className={cn(
          'flex min-h-[7rem] flex-col justify-center rounded-lg border border-border border-dashed bg-muted/20 p-3 text-muted-foreground text-sm',
          align === 'left' ? 'text-left' : 'text-right',
        )}
      >
        {emptyHint ?? emptyLabel}
      </div>
    );
  }

  if (!useSpoiler) {
    return (
      <div
        className={cn(
          'min-h-[7rem] rounded-lg border border-border bg-muted/10 p-3 text-sm',
          align === 'left' ? 'text-left' : 'text-right',
        )}
      >
        {children}
      </div>
    );
  }

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className={cn(
          'flex min-h-[7rem] w-full flex-col items-center justify-center rounded-lg border border-primary/40 border-dashed bg-muted/30 p-3 text-center font-medium text-primary text-sm transition hover:bg-muted/50',
        )}
      >
        {tapLabel}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'min-h-[7rem] rounded-lg border border-border bg-muted/10 p-3 text-sm',
        align === 'left' ? 'text-left' : 'text-right',
      )}
    >
      {children}
    </div>
  );
}
