/**
 * lib/dev/t1-probe-specs.ts — PRD-004 Tranche 1 diagnostic
 *
 * Static spec array for the T1 regex round-trip probe.
 * Each spec matches a row in project-planning/captures/tranche-1-regex-roundtrip-20260520.md § "T001 — Authored rows".
 *
 * These specs are authoritative — the probe runner creates a throwaway Redirect Map
 * with exactly these mappings, reads them back, and diffs byte-for-byte.
 *
 * Character-class taxonomy matches the per-class matrix in the capture file § T002.
 *
 * NOT production code — this file is dead unless NEXT_PUBLIC_T1_PROBE=true.
 */

export interface T1ProbeSpec {
  /** Stable row identifier, e.g. "row1-anchors" */
  id: string;
  /** One-line description surfaced in the dialog results table */
  description: string;
  /** Source regex as it will be authored into the UrlMapping field */
  authoredSource: string;
  /** Target URL/pattern as authored */
  authoredTarget: string;
  /** Character classes this row exercises — matched against the per-class matrix */
  characterClasses: string[];
}

export const T1_PROBE_SPECS: T1ProbeSpec[] = [
  {
    id: 'row1-anchors',
    description: 'Anchors only (^ and $)',
    authoredSource: '^/products$',
    authoredTarget: '/catalog',
    characterClasses: ['anchors-^', 'anchors-$'],
  },
  {
    id: 'row2-groups',
    description: 'Groups — capturing (.+) and non-capturing (?:legacy)',
    authoredSource: '^/blog/(.+)/(?:legacy)$',
    authoredTarget: '/blog/$1',
    characterClasses: [
      'anchors-^',
      'anchors-$',
      'capturing-group',
      'non-capturing-group',
      'quantifier-+',
      'capture-ref-$N',
    ],
  },
  {
    id: 'row3-escapes',
    description: 'Escapes (\\.html) and quantifier-? in source; $0 in target',
    authoredSource: '\\.html?$',
    authoredTarget: '/static$0',
    characterClasses: ['escape-dot', 'quantifier-?', 'anchors-$', '$0-ref'],
  },
  {
    id: 'row4-quantifiers',
    description: 'Quantifier {N,M} and char class [0-9]',
    authoredSource: '^/items/[0-9]{4,6}$',
    authoredTarget: '/products/$0',
    characterClasses: [
      'anchors-^',
      'anchors-$',
      'quantifier-{N,M}',
      'char-class',
      '$0-ref',
    ],
  },
  {
    id: 'row5-char-classes',
    description: 'Char class [a-zA-Z0-9_-] and quantifier-+',
    authoredSource: '^/users/[a-zA-Z0-9_-]+$',
    authoredTarget: '/profiles/$0',
    characterClasses: [
      'anchors-^',
      'anchors-$',
      'char-class',
      'quantifier-+',
      '$0-ref',
    ],
  },
  {
    id: 'row6-alternation',
    description: 'Alternation (news|press|media) and capturing groups',
    authoredSource: '^/(news|press|media)/(.+)$',
    authoredTarget: '/announcements/$2',
    characterClasses: [
      'anchors-^',
      'anchors-$',
      'alternation-|',
      'capturing-group',
      'quantifier-+',
      'capture-ref-$N',
    ],
  },
  {
    id: 'row7-pattern-mode',
    description: 'Pattern-mode control case — plain URL path (no regex)',
    authoredSource: '/old-page',
    authoredTarget: '/new-page',
    characterClasses: [],
  },
  {
    id: 'row8-mixed',
    description: 'Mixed — char class + capturing group + optional quantifier',
    authoredSource: '^/legacy/[a-z]+/(.+)?$',
    authoredTarget: '/archive/$1',
    characterClasses: [
      'anchors-^',
      'anchors-$',
      'char-class',
      'quantifier-+',
      'quantifier-?',
      'capturing-group',
      'capture-ref-$N',
    ],
  },
];

/** All unique character class names across all specs — for matrix construction */
export const ALL_CHARACTER_CLASSES = [
  { key: 'anchors-^',          label: 'Anchors — `^`',                        rows: ['row1', 'row2', 'row4', 'row5', 'row6', 'row8'] },
  { key: 'anchors-$',          label: 'Anchors — `$`',                        rows: ['row1', 'row2', 'row3', 'row4', 'row5', 'row6', 'row8'] },
  { key: 'capturing-group',    label: 'Capturing group — `(` `)`',            rows: ['row2', 'row6', 'row8'] },
  { key: 'non-capturing-group',label: 'Non-capturing group — `(?:`',          rows: ['row2'] },
  { key: 'escape-dot',         label: 'Escape — `\\.`',                       rows: ['row3'] },
  { key: 'quantifier-?',       label: 'Quantifier — `?`',                     rows: ['row3', 'row8'] },
  { key: 'quantifier-+',       label: 'Quantifier — `+`',                     rows: ['row2', 'row5', 'row8'] },
  { key: 'quantifier-{N,M}',   label: 'Quantifier — `{N,M}`',                rows: ['row4'] },
  { key: 'char-class',         label: 'Char class — `[a-z]` etc.',            rows: ['row4', 'row5', 'row8'] },
  { key: 'alternation-|',      label: 'Alternation — `|`',                    rows: ['row6'] },
  { key: 'capture-ref-$N',     label: 'Capture-group ref — `$N` (target)',    rows: ['row2', 'row6', 'row8'] },
  { key: '$0-ref',             label: '`$0` reference (target)',              rows: ['row3', 'row4', 'row5'] },
] as const;
