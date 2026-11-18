import { join } from "node:path";

import { Resvg } from "@resvg/resvg-js";

import { GITHUB_USER } from "../../site.config";
import type { ActivityData } from "../data/types";
import { buildSeries, currentStreak, formatNumber, total } from "./stats";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// The build bundles this module, so the fonts are found from the project root, where the build runs.
const FONT_DIRECTORY = join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans");
const FONT_FILES = ["Geist-Bold.ttf", "Geist-Medium.ttf"].map((name) => join(FONT_DIRECTORY, name));

const GREEN = "#3DDC97";
const CHART_TOP = 470;
const CHART_BOTTOM = 612;

function chartPath(values: number[]): { line: string; area: string } {
  const peak = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * OG_WIDTH;
    const y = CHART_BOTTOM - (value / peak) * (CHART_BOTTOM - CHART_TOP);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point}`).join("");
  return { line, area: `${line}L${OG_WIDTH} ${OG_HEIGHT}L0 ${OG_HEIGHT}Z` };
}

export function ogSummary(data: ActivityData): { streak: number; contributions: number; since: string } {
  const series = buildSeries(data.calendar);
  return { streak: currentStreak(series), contributions: total(series), since: Object.keys(data.calendar).sort()[0]! };
}

export function renderOgImage(data: ActivityData): Uint8Array<ArrayBuffer> {
  const series = buildSeries(data.calendar);
  const { streak, contributions, since } = ogSummary(data);
  const lastYear = series.slice(-364).map(([, count]) => count);
  const weekly: number[] = [];
  for (let index = 0; index < lastYear.length; index += 7) weekly.push(lastYear.slice(index, index + 7).reduce((sum, count) => sum + count, 0));
  const { line, area } = chartPath(weekly);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
  <defs>
    <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${GREEN}" stop-opacity=".34"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="${GREEN}" stop-opacity=".16"/><stop offset="1" stop-color="${GREEN}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#0A0A0B"/>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#glow)"/>
  <rect x="72" y="64" width="44" height="44" rx="12" fill="#EDEDEF"/>
  <path d="M85 77v18h16" stroke="#0A0A0B" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="132" y="97" font-family="Geist" font-weight="700" font-size="34" fill="#EDEDEF" letter-spacing="-0.6">${GITHUB_USER}</text>
  <text x="1128" y="97" text-anchor="end" font-family="Geist" font-weight="500" font-size="28" fill="#6B6B74">${GITHUB_USER}.github.io</text>
  <text x="68" y="262" font-family="Geist" font-weight="700" font-size="124" fill="#EDEDEF" letter-spacing="-6.5">I ship products</text>
  <text x="68" y="382" font-family="Geist" font-weight="700" font-size="124" fill="#8A8A93" letter-spacing="-6.5">I care about.</text>
  <path d="${area}" fill="url(#fill)"/>
  <path d="${line}" fill="none" stroke="${GREEN}" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="72" y="418" width="${String(streak).length * 17 + 332}" height="52" rx="26" fill="#111113" stroke="#2E2E33" stroke-width="1.5"/>
  <circle cx="102" cy="444" r="7" fill="${GREEN}"/>
  <text x="122" y="453" font-family="Geist" font-weight="700" font-size="26" fill="#EDEDEF">${streak}<tspan dx="9" font-weight="500" fill="#A1A1AA">days in a row shipping</tspan></text>
  <text x="${String(streak).length * 17 + 332 + 96}" y="453" font-family="Geist" font-weight="500" font-size="26" fill="#A1A1AA">${formatNumber(contributions)} contributions since ${since}</text>
</svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_WIDTH },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Geist" },
  });
  return new Uint8Array(resvg.render().asPng());
}
