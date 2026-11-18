export type RecentCommit = {
  at: string;
  subject: string;
};

export type RepoActivity = {
  id: string;
  name: string;
  hue: string;
  logo: string | null;
  description: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  latestRelease: string | null;
  commitCount: number;
  firstCommit: string;
  lastCommit: string;
  daily: Record<string, number>;
  recent: RecentCommit[];
};

export type ActivityData = {
  generatedAt: string;
  today: string;
  user: { login: string; createdAt: string; publicRepos: number };
  calendar: Record<string, number[]>;
  repos: Record<string, RepoActivity>;
  facts: { hours: number[]; weekdays: number[] };
};
