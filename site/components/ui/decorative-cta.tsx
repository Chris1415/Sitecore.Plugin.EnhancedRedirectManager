/**
 * T010 — DecorativeCta wrapper component.
 *
 * ADR-0030: Full Page hero CTAs (View activity, Publish all) are decorative in
 * PRD-002. Buttons render with V4 chrome; onClick shows a Sonner toast with
 * "coming in a follow-on release" copy. Wiring to real actions deferred.
 *
 * Uses existing Button from @/components/ui/button and toast from sonner (already
 * a project dependency from PRD-000 — see site/package.json).
 *
 * Props:
 *   label      — visible button text
 *   toastCopy  — exact string passed to toast() on click
 *   variant?   — Button variant passthrough (default | outline | ghost | link)
 *   className? — additional class passthrough
 *   + all other React button props
 *
 * Depends on: T001 (elevated.css foundation for button styling context)
 */

import type { ComponentProps } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

interface DecorativeCtaProps
  extends Omit<ComponentProps<'button'>, 'onClick'>,
    VariantProps<typeof buttonVariants> {
  label: string;
  toastCopy: string;
}

export function DecorativeCta({
  label,
  toastCopy,
  variant,
  size,
  colorScheme,
  className,
  ...rest
}: DecorativeCtaProps) {
  return (
    <Button
      variant={variant}
      size={size}
      colorScheme={colorScheme}
      className={cn(className)}
      onClick={() => toast(toastCopy)}
      {...rest}
    >
      {label}
    </Button>
  );
}
