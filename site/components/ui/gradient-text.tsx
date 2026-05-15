/**
 * T009 — GradientText utility component.
 *
 * Wraps children in an element with the .elev-hero-text--gradient utility class
 * from site/styles/elevated.css. Gradient is composed via CSS custom properties
 * (color-mix in oklch) — theme-aware with no JS branching.
 *
 * Props:
 *   as?        — element type (default: 'span'); also accepts 'h1', 'h2'
 *   className? — additional classes for composition
 *   children   — content to render with gradient text treatment
 *   ...rest    — additional HTML attributes (data-*, aria-*, id, role, etc.)
 *                forwarded to the rendered element so callers can pair the
 *                element with structural guards (e.g. data-preview-mock="true").
 *
 * Depends on: T001 (elevated.css with .elev-hero-text--gradient class)
 */

import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type GradientTextProps<T extends ElementType = 'span'> = {
  as?: T;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className' | 'children'>;

export function GradientText<T extends ElementType = 'span'>({
  as,
  className,
  children,
  ...rest
}: GradientTextProps<T>) {
  const Tag = (as ?? 'span') as ElementType;
  return (
    <Tag className={cn('elev-hero-text--gradient', className)} {...rest}>
      {children}
    </Tag>
  );
}
