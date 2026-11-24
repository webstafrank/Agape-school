import type { Result } from "@/lib/api";

export type TermResults = { term: number; label: string; results: Result[]; average: number };

/** Groups results by term, keeping the API's newest-term-first order. */
export function groupByTerm(results: Result[]): TermResults[] {
  const groups = new Map<number, TermResults>();
  for (const r of results) {
    let g = groups.get(r.term);
    if (!g) {
      g = { term: r.term, label: r.term_label, results: [], average: 0 };
      groups.set(r.term, g);
    }
    g.results.push(r);
  }
  for (const g of groups.values()) {
    g.average = Math.round((g.results.reduce((sum, r) => sum + Number(r.score), 0) / g.results.length) * 10) / 10;
  }
  return [...groups.values()];
}
