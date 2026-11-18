import { TIME_ZONE } from "../../site.config";
import type { ActivityData, RecentCommit } from "../data/types";

export type Day = [date: string, count: number];

export const ALL = "all";

export function buildSeries(calendar: Record<string, number[]>): Day[] {
  return Object.keys(calendar)
    .sort()
    .flatMap((year) => calendar[year]!.map((count, index): Day => [new Date(Date.UTC(Number(year), 0, 1 + index)).toISOString().slice(0, 10), count]));
}

export function seriesForRepo(series: Day[], daily: Record<string, number>): Day[] {
  return series.map(([date]) => [date, daily[date] ?? 0]);
}

export const total = (days: Day[]): number => days.reduce((sum, [, count]) => sum + count, 0);

export function currentStreak(series: Day[]): number {
  let streak = 0;
  for (let index = series.length - 1; index >= 0 && series[index]![1] > 0; index--) streak++;
  return streak;
}

export const busiestDay = (series: Day[]): Day => series.reduce((best, day) => (day[1] > best[1] ? day : best));

export function yearTotals(series: Day[]): [year: string, total: number][] {
  const totals = new Map<string, number>();
  for (const [date, count] of series) totals.set(date.slice(0, 4), (totals.get(date.slice(0, 4)) ?? 0) + count);
  return [...totals.entries()];
}

export const formatNumber = (value: number): string => value.toLocaleString("en-US");

export const formatDate = (iso: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });

export function plainSubject(subject: string): string {
  const text = subject.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, "").replace(/\s*\(#\d+\)$/, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const NOISE = /^(chore|ci|build)\b|^bump\b|^merge\b|^\d+\.\d+\.\d+$/i;

export type ChangelogEntry = RecentCommit & { repo: string };

export function changelog(data: ActivityData, repos: readonly string[], days: number, perDay: number): [day: string, entries: ChangelogEntry[]][] {
  const entries = repos
    .flatMap((repo) => (data.repos[repo]?.recent ?? []).map((commit) => ({ ...commit, repo })))
    .filter((entry) => !NOISE.test(entry.subject))
    .sort((first, second) => Date.parse(second.at) - Date.parse(first.at));
  const byDay = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(entry.at));
    const list = byDay.get(day) ?? [];
    if (list.length < perDay) list.push(entry);
    byDay.set(day, list);
  }
  return [...byDay.entries()].slice(0, days);
}
