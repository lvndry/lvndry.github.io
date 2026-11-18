import { ALL, buildSeries, type Day, formatDate, formatNumber, seriesForRepo, total } from "../lib/stats";

export type DashboardRepo = { id: string; name: string; hue: string; firstCommit: string; commitCount: number; daily: Record<string, number> };
export type DashboardData = { calendar: Record<string, number[]>; firstDay: string; repos: DashboardRepo[] };

const RANGES: Record<string, number> = { "7D": 7, "1M": 30, "6M": 182, "1Y": 365, YOY: 0, MAX: -1 };
const WORDS: Record<string, [current: string, previous: string]> = {
  "7D": ["this week", "the week before"],
  "1M": ["in 30 days", "the 30 days before"],
  "6M": ["in 6 months", "the 6 months before"],
  "1Y": ["in the last year", "the year before"],
};
const ALL_HUE = "#3DDC97";
const WIDTH = 800;
const HEIGHT = 300;
const PLOT = 262;

function mount(root: HTMLElement, data: DashboardData): void {
  const series = buildSeries(data.calendar);
  const repoById = new Map(data.repos.map((repo) => [repo.id, repo]));
  const state = { repo: ALL, range: "1Y" };
  const hueOf = (repo: string): string => repoById.get(repo)?.hue ?? ALL_HUE;
  const daysFor = (repo: string): Day[] => (repo === ALL ? series : seriesForRepo(series, repoById.get(repo)!.daily));
  const firstDayOf = (repo: string): string => (repo === ALL ? data.firstDay : repoById.get(repo)!.firstCommit);

  const valueElement = root.querySelector<HTMLElement>("[data-value]")!;
  const whatElement = root.querySelector<HTMLElement>("[data-what]")!;
  const deltaElement = root.querySelector<HTMLElement>("[data-delta]")!;
  const chart = root.querySelector<SVGSVGElement>("[data-chart]")!;
  const tip = root.querySelector<HTMLElement>("[data-tip]")!;

  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const repoButton = target.closest<HTMLElement>("[data-repo]");
    const rangeButton = target.closest<HTMLElement>("[data-range]");
    if (repoButton) state.repo = repoButton.dataset.repo!;
    if (rangeButton) state.range = rangeButton.dataset.range!;
    if (repoButton || rangeButton) draw();
  });
  chart.addEventListener("mousemove", (event) => {
    const target = (event.target as Element).closest<SVGElement>("[data-tip]");
    if (!target) {
      tip.style.opacity = "0";
      return;
    }
    const box = chart.parentElement!.getBoundingClientRect();
    tip.innerHTML = target.dataset.tip!;
    tip.style.opacity = "1";
    tip.style.left = `${Math.max(0, Math.min(box.width - 200, event.clientX - box.left + 12))}px`;
    tip.style.top = `${event.clientY - box.top - 50}px`;
  });
  chart.addEventListener("mouseleave", () => (tip.style.opacity = "0"));

  function headline(value: number, what: string, deltaHtml: string): void {
    valueElement.textContent = formatNumber(value);
    whatElement.textContent = what;
    deltaElement.innerHTML = deltaHtml;
  }

  function change(current: number, previous: number, label: string): string {
    if (!previous) return `nothing in ${label} to compare with`;
    const percent = Math.round(((current - previous) / previous) * 100);
    return `<b class="${percent < 0 ? "down" : ""}">${percent >= 0 ? "+" : ""}${formatNumber(percent)}%</b> vs ${label}`;
  }

  const rangeLabel = root.querySelector<HTMLElement>("[data-range-label]");
  const thisYear = series[series.length - 1]![0].slice(0, 4);

  function rangeCount(repo: string, range: string): number {
    const days = daysFor(repo);
    if (range === "MAX") return total(days);
    if (range === "YOY") return total(days.filter(([date]) => date.startsWith(thisYear)));
    return total(days.slice(-RANGES[range]!));
  }

  function updateSidebar(range: string): void {
    if (rangeLabel) rangeLabel.textContent = range === "MAX" ? "· all time" : range === "YOY" ? `· in ${thisYear}` : `· last ${range}`;
    root.querySelectorAll<HTMLElement>("aside [data-repo]").forEach((button) => {
      const count = rangeCount(button.dataset.repo!, range);
      const counter = button.querySelector("em");
      if (counter) counter.textContent = formatNumber(count);
      button.classList.toggle("quiet", count === 0);
    });
  }

  function draw(): void {
    const { repo, range } = state;
    updateSidebar(range);
    const hue = hueOf(repo);
    const days = daysFor(repo);
    const unit = repo === ALL ? "contributions" : `commits to ${repoById.get(repo)!.name}`;
    root.querySelectorAll<HTMLElement>("[data-repo]").forEach((button) => button.classList.toggle("on", button.dataset.repo === repo));
    root.querySelectorAll<HTMLElement>("[data-range]").forEach((button) => button.classList.toggle("on", button.dataset.range === range));
    let markup = "";
    for (let line = 0; line <= 3; line++) markup += `<line x1="0" x2="${WIDTH}" y1="${8 + (PLOT / 3) * line}" y2="${8 + (PLOT / 3) * line}" class="grid${line < 3 ? " dashed" : ""}"/>`;
    if (range === "YOY") markup += yearOverYear(repo, days, hue, unit);
    else markup += timeline(repo, range, days, hue, unit);
    chart.innerHTML = markup;
  }

  function yearOverYear(repo: string, days: Day[], hue: string, unit: string): string {
    const years: string[] = [];
    for (let year = Number(firstDayOf(repo).slice(0, 4)); year <= Number(series[series.length - 1]![0].slice(0, 4)); year++) years.push(String(year));
    const totals = years.map((year) => total(days.filter(([date]) => date.startsWith(year))));
    const last = totals.length - 1;
    headline(totals[last]!, `${unit} in ${years[last]} so far`, change(totals[last]!, totals[last - 1] ?? 0, `all of ${Number(years[last]) - 1}`));
    const peak = Math.max(...totals, 1);
    const slot = WIDTH / Math.max(years.length, 4);
    return years
      .map((year, index) => {
        const height = Math.max(2, (totals[index]! / peak) * (PLOT - 24));
        const left = index * slot + slot * 0.18;
        const barWidth = slot * 0.64;
        return `<rect x="${left}" y="${8 + PLOT - height}" width="${barWidth}" height="${height}" rx="5" fill="${hue}" opacity="${index === last ? 1 : 0.35}" data-tip="${year}: ${formatNumber(totals[index]!)}"/><text x="${left + barWidth / 2}" y="${PLOT + 2 - height}" text-anchor="middle" class="strong">${formatNumber(totals[index]!)}</text><text x="${left + barWidth / 2}" y="${HEIGHT - 6}" text-anchor="middle">${year}</text>`;
      })
      .join("");
  }

  function timeline(repo: string, range: string, days: Day[], hue: string, unit: string): string {
    let window: Day[];
    let bucket = 1;
    if (range === "MAX") {
      const sinceFirst = days.filter(([date]) => date >= firstDayOf(repo));
      bucket = sinceFirst.length > 900 ? 30 : sinceFirst.length > 150 ? 7 : 1;
      window = [];
      for (let index = 0; index < sinceFirst.length; index += bucket) window.push([sinceFirst[index]![0], total(sinceFirst.slice(index, index + bucket))]);
      const busiest = window.reduce((best, entry) => (entry[1] > best[1] ? entry : best), window[0]!);
      const bucketName = bucket === 30 ? "30 days" : bucket === 7 ? "week" : "day";
      const busiestWhen = bucket === 30 ? `from ${formatDate(busiest[0])}` : bucket === 7 ? `week of ${formatDate(busiest[0])}` : formatDate(busiest[0]);
      headline(total(sinceFirst), `${unit} since ${formatDate(firstDayOf(repo))}`, `busiest ${bucketName}: <b>${formatNumber(busiest[1])}</b>, ${busiestWhen}`);
    } else {
      const length = RANGES[range]!;
      window = days.slice(-length);
      const [current, previous] = WORDS[range]!;
      headline(total(window), `${unit} ${current}`, change(total(window), total(days.slice(-length * 2, -length)), previous));
    }
    const peak = Math.max(...window.map(([, count]) => count), 1);
    const xFor = (index: number): number => (index / Math.max(window.length - 1, 1)) * WIDTH;
    const yFor = (count: number): number => 8 + PLOT - (count / peak) * PLOT;
    const line = window.map(([, count], index) => `${index ? "L" : "M"}${xFor(index).toFixed(1)} ${yFor(count).toFixed(1)}`).join("");
    let markup = `<defs><linearGradient id="dashboard-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${hue}" stop-opacity=".28"/><stop offset="1" stop-color="${hue}" stop-opacity="0"/></linearGradient></defs>`;
    markup += `<path d="${line} L${WIDTH} ${8 + PLOT} L0 ${8 + PLOT}Z" fill="url(#dashboard-fill)"/><path d="${line}" fill="none" stroke="${hue}" stroke-width="2" stroke-linejoin="round"/>`;
    const step = WIDTH / window.length;
    const period = bucket === 30 ? "Month from " : bucket === 7 ? "Week of " : "";
    const noun = repo === ALL ? "contributions" : "commits";
    markup += window.map(([date, count], index) => `<rect x="${xFor(index) - step / 2}" y="8" width="${step}" height="${PLOT}" fill="transparent" data-tip="${period}${formatDate(date)}<br><b>${count}</b> ${noun}"/>`).join("");
    const spansYears = range === "MAX" && window[0]![0].slice(0, 4) !== window[window.length - 1]![0].slice(0, 4);
    for (let tick = 0; tick < 5; tick++) {
      const index = Math.round((tick / 4) * (window.length - 1));
      const anchor = tick === 0 ? "start" : tick === 4 ? "end" : "middle";
      const label = spansYears ? formatDate(window[index]![0]) : formatDate(window[index]![0], { day: "numeric", month: "short" });
      markup += `<text x="${xFor(index)}" y="${HEIGHT - 6}" text-anchor="${anchor}">${label}</text>`;
    }
    return markup;
  }

  draw();
}

const root = document.querySelector<HTMLElement>("[data-dashboard]");
const payload = document.getElementById("dashboard-data");
if (root && payload) mount(root, JSON.parse(payload.textContent ?? "{}") as DashboardData);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("wait");
        observer.unobserve(entry.target);
      }),
    { threshold: 0 },
  );
  document.querySelectorAll<HTMLElement>(".reveal").forEach((element, index) => {
    if (element.getBoundingClientRect().top <= window.innerHeight) return;
    element.classList.add("wait");
    element.style.transitionDelay = `${(index % 3) * 70}ms`;
    observer.observe(element);
  });
}
