/**
 * HoverLiftCard wrapper component.
 *
 * Adds the .elev-card utility class from site/styles/elevated.css to a
 * Blok Card, enabling the V4 hover-lift effect:
 *   - translateY(calc(var(--v4-hover-lift-distance) * -1))
 *   - scale(var(--v4-hover-lift-scale))
 *   - primary-tinted hover glow via --v4-hover-glow-*
 *
 * Props:
 *   className? — additional classes for composition
 *   children   — card content
 *
 * Depends on: T001 (elevated.css with .elev-card utility class)
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HoverLiftCardProps {
  className?: string;
  children: ReactNode;
}

export function HoverLiftCard({ className, children }: HoverLiftCardProps) {
  return (
    <div className={cn('elev-card', className)}>
      {children}
    </div>
  );
}
