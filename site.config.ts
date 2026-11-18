export const SITE_ORIGIN = "https://lvndry.github.io";
export const GITHUB_USER = "lvndry";
export const CONTACT_EMAIL = "lvndry@protonmail.com";
export const TIME_ZONE = "Europe/Paris";
export const FIRST_YEAR = 2016;

export type RepoConfig = {
  id: string;
  name: string;
  hue: string;
  logo?: string;
  description?: string;
};

export const REPOS: RepoConfig[] = [
  { id: "jazz", name: "Jazz", hue: "#00D7FF", logo: "/logos/jazz.svg" },
  { id: "euphoria", name: "Euphoria", hue: "#A78BFA", logo: "/logos/euphoria.svg" },
  { id: "clausea", name: "Clausea", hue: "#3DDC97", logo: "/logos/clausea.png" },
  {
    id: "one-dollar-digest",
    name: "One Dollar Digest",
    hue: "#F4D35E",
    logo: "/logos/one-dollar-digest.png",
    description: "AI-curated daily news that reads like a morning paper: a fixed set of stories each day, with real sources.",
  },
  {
    id: "drone",
    name: "drone",
    hue: "#FF6B6B",
    logo: "/logos/drone.svg",
    description: "A small musical-key classifier, 109,128 parameters. It runs inside Euphoria.",
  },
  {
    id: "tangent",
    name: "Tangent",
    hue: "#34D399",
    logo: "/logos/tangent.svg",
    description: "Website of Tangent Consulting, an independent AI and engineering advisory based in Paris.",
  },
  { id: "tizen-tap", name: "tizen-tap", hue: "#F78C6C" },
  { id: "tv-dashboard", name: "tv-dashboard", hue: "#C792EA" },
  { id: "ps5-firmware-pin", name: "ps5-firmware-pin", hue: "#82AAFF" },
];

export const PRODUCTS = ["jazz", "euphoria", "clausea", "one-dollar-digest", "drone", "tangent"] as const;

export const BOOK = {
  title: "How to Stand Out as a Software Engineer",
  url: "https://github.com/lvndry/how-to-stand-out-as-a-software-engineer",
  year: 2023,
};
