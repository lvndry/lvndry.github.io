import { mkdir, writeFile } from "node:fs/promises";

import { FIRST_YEAR, GITHUB_USER, REPOS, TIME_ZONE } from "../site.config";
import type { ActivityData, RecentCommit, RepoActivity } from "../src/data/types";

const OUTPUT = new URL("../src/data/activity.json", import.meta.url);
const RECENT_PER_REPO = 40;
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("GITHUB_TOKEN is not set. Locally, run: GITHUB_TOKEN=$(gh auth token) bun run fetch-data");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "lvndry.github.io-build",
  "X-GitHub-Api-Version": "2022-11-28",
};

const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const parisHour = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" });
const parisWeekday = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

async function rest<Result>(path: string): Promise<Result> {
  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) throw new Error(`GET ${path} failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as Result;
}

async function graphql<Result>(query: string): Promise<Result> {
  const response = await fetch("https://api.github.com/graphql", { method: "POST", headers, body: JSON.stringify({ query }) });
  const body = (await response.json()) as { data?: Result; errors?: unknown };
  if (!response.ok || body.errors || !body.data) throw new Error(`GraphQL query failed: ${response.status} ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

type CalendarResponse = {
  user: { contributionsCollection: { contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } } };
};

async function fetchCalendar(today: string): Promise<Record<string, number[]>> {
  const calendar: Record<string, number[]> = {};
  const lastYear = Number(today.slice(0, 4));
  for (let year = FIRST_YEAR; year <= lastYear; year++) {
    const to = year === lastYear ? new Date().toISOString() : `${year}-12-31T23:59:59Z`;
    const data = await graphql<CalendarResponse>(
      `{ user(login: "${GITHUB_USER}") { contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${to}") { contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`,
    );
    calendar[year] = data.user.contributionsCollection.contributionCalendar.weeks
      .flatMap((week) => week.contributionDays)
      .filter((day) => day.date.startsWith(String(year)) && day.date <= today)
      .map((day) => day.contributionCount);
  }
  return calendar;
}

type CommitResponse = { commit: { author: { date: string }; message: string }; author: { login: string } | null };
type RepoResponse = { description: string | null; homepage: string | null; language: string | null; stargazers_count: number; forks_count: number };

async function fetchCommits(repo: string): Promise<CommitResponse[]> {
  const commits: CommitResponse[] = [];
  for (let page = 1; ; page++) {
    const batch = await rest<CommitResponse[]>(`/repos/${GITHUB_USER}/${repo}/commits?per_page=100&page=${page}`);
    commits.push(...batch);
    if (batch.length < 100) return commits;
  }
}

async function fetchLatestRelease(repo: string): Promise<string | null> {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${repo}/releases/latest`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`latest release of ${repo} failed: ${response.status}`);
  return ((await response.json()) as { tag_name: string }).tag_name;
}

const hours = Array<number>(24).fill(0);
const weekdays = Array<number>(7).fill(0);

async function fetchRepo(config: (typeof REPOS)[number]): Promise<RepoActivity> {
  const [info, commits, latestRelease] = await Promise.all([
    rest<RepoResponse>(`/repos/${GITHUB_USER}/${config.id}`),
    fetchCommits(config.id),
    fetchLatestRelease(config.id),
  ]);
  const daily: Record<string, number> = {};
  const recent: RecentCommit[] = [];
  for (const entry of commits) {
    const authored = new Date(entry.commit.author.date);
    const day = parisDay.format(authored);
    daily[day] = (daily[day] ?? 0) + 1;
    if (recent.length < RECENT_PER_REPO) recent.push({ at: entry.commit.author.date, subject: entry.commit.message.split("\n")[0] ?? "" });
    if (entry.author?.login === GITHUB_USER) {
      hours[Number(parisHour.format(authored))]! += 1;
      weekdays[WEEKDAYS.indexOf(parisWeekday.format(authored))]! += 1;
    }
  }
  const days = Object.keys(daily).sort();
  return {
    id: config.id,
    name: config.name,
    hue: config.hue,
    logo: config.logo ?? null,
    description: config.description ?? info.description ?? "",
    homepage: info.homepage || null,
    language: info.language,
    stars: info.stargazers_count,
    forks: info.forks_count,
    latestRelease,
    commitCount: commits.length,
    firstCommit: days[0] ?? "",
    lastCommit: days[days.length - 1] ?? "",
    daily,
    recent,
  };
}

const today = parisDay.format(new Date());
const user = await rest<{ login: string; created_at: string; public_repos: number }>(`/users/${GITHUB_USER}`);
const calendar = await fetchCalendar(today);
const repos: Record<string, RepoActivity> = {};
for (const config of REPOS) {
  repos[config.id] = await fetchRepo(config);
  console.log(`${config.id}: ${repos[config.id]!.commitCount} commits`);
}

const data: ActivityData = {
  generatedAt: new Date().toISOString(),
  today,
  user: { login: user.login, createdAt: user.created_at, publicRepos: user.public_repos },
  calendar,
  repos,
  facts: { hours, weekdays },
};

await mkdir(new URL(".", OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(data));
const total = Object.values(calendar).flat().reduce((sum, count) => sum + count, 0);
console.log(`Wrote ${OUTPUT.pathname}: ${total} contributions since ${FIRST_YEAR}, data for ${today}`);
