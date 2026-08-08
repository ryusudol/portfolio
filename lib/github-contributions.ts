const API = "https://github-contributions-api.jogruber.de/v4";

export type ContributionDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type Contributions = {
  total: number;
  start: string;
  levels: string;
  counts: number[];
};

// Snapshot matching github.com/users/ryusudol/contributions (last year, incl. private).
const fallback: Contributions = {
  total: 487,
  start: "2025-08-03",
  levels:
    "2110000010000010000010000000100110010000000000000000010000000000000000000000021101000000110000111010100000101110001000001012100000000010000100000000000001112012101021111230111001121111000000000000000000000000000000000000000000000000011000001000011101000010000000011001010101000000000000210101112111121114211111111001010000000000000000000000000000000000000000000001110",
  counts:
    "16,6,8,0,0,0,0,0,1,0,0,0,0,0,4,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,2,1,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,4,7,0,1,0,0,0,0,0,0,2,1,0,0,0,0,3,2,3,0,2,0,1,0,0,0,0,0,2,0,1,3,4,0,0,0,2,0,0,0,0,0,2,0,2,15,2,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,5,16,0,4,14,5,0,2,0,10,8,4,2,7,18,24,0,6,1,3,0,0,2,5,14,1,4,4,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,0,0,0,0,3,2,1,0,3,0,0,0,0,4,0,0,0,0,0,0,0,0,1,2,0,0,1,0,1,0,9,0,1,0,0,0,0,0,0,0,0,0,0,0,0,12,8,0,2,0,3,3,1,13,9,5,5,5,10,8,3,3,39,15,3,8,4,1,1,3,1,1,0,0,1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,1,0"
      .split(",")
      .map(Number),
};

function fromDays(days: ContributionDay[]): Contributions {
  return {
    total: days.reduce((sum, day) => sum + day.count, 0),
    start: days[0]?.date ?? "",
    levels: days.map((day) => day.level).join(""),
    counts: days.map((day) => day.count),
  };
}

/** Parse github.com/users/<user>/contributions — the calendar source of truth. */
function parseGithubContributionsHtml(html: string): ContributionDay[] | null {
  const cells: {
    row: number;
    week: number;
    date: string;
    level: ContributionDay["level"];
  }[] = [];

  for (const tag of html.matchAll(/<td\b[^>]*>/g)) {
    const td = tag[0];
    const date = td.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const levelRaw = td.match(/data-level="(\d)"/)?.[1];
    const id = td.match(
      /id="contribution-day-component-(\d+)-(\d+)"/,
    );
    if (!date || levelRaw === undefined || !id) continue;
    cells.push({
      row: Number(id[1]),
      week: Number(id[2]),
      date,
      level: Number(levelRaw) as ContributionDay["level"],
    });
  }

  if (cells.length < 300) return null;

  const counts = new Map<string, number>();
  for (const tip of html.matchAll(
    /<tool-tip[^>]*\sfor="(contribution-day-component-\d+-\d+)"[^>]*>([^<]*)<\/tool-tip>/g,
  )) {
    const text = tip[2].trim();
    const count = text.startsWith("No contributions")
      ? 0
      : Number(text.match(/^(\d+) contribution/)?.[1] ?? 0);
    counts.set(tip[1], count);
  }

  const days = cells
    .map((cell) => ({
      date: cell.date,
      count:
        counts.get(
          `contribution-day-component-${cell.row}-${cell.week}`,
        ) ?? 0,
      level: cell.level,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return days;
}

async function fetchFromGithubHtml(
  username: string,
): Promise<Contributions | null> {
  try {
    const response = await fetch(
      `https://github.com/users/${username}/contributions`,
      {
        headers: {
          Accept: "text/html",
          "User-Agent": "portfolio-contributions",
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return null;
    const html = await response.text();
    const days = parseGithubContributionsHtml(html);
    if (!days) return null;
    const totalMatch = html.match(
      /([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i,
    );
    const parsed = fromDays(days);
    if (totalMatch) {
      parsed.total = Number(totalMatch[1].replaceAll(",", ""));
    }
    return parsed;
  } catch {
    return null;
  }
}

async function fetchFromApi(username: string): Promise<Contributions | null> {
  try {
    const response = await fetch(`${API}/${username}?y=last`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      total: Record<string, number>;
      contributions: ContributionDay[];
    };
    const days = data.contributions;
    if (days.length < 300) return null;

    return {
      total: data.total.lastYear ?? fromDays(days).total,
      start: days[0]?.date ?? "",
      levels: days.map((day) => day.level).join(""),
      counts: days.map((day) => day.count),
    };
  } catch {
    return null;
  }
}

export async function getGithubContributions(
  username: string,
): Promise<Contributions> {
  return (
    (await fetchFromGithubHtml(username)) ??
    (await fetchFromApi(username)) ??
    fallback
  );
}

/**
 * GitHub-style week columns (Sun → Sat).
 * Matches colinlienard.com `toWeeks`: leading empties align the first week;
 * trailing empties pad the final week so every column has 7 rows.
 */
export function toWeeks({ start, levels, counts }: Contributions) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const weeks: (ContributionDay | undefined)[][] = [];
  let week: (ContributionDay | undefined)[] = Array.from({
    length: startDate.getUTCDay(),
  });

  for (const [index, count] of counts.entries()) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + index);
    week.push({
      date: date.toISOString().slice(0, 10),
      count,
      level: Number(levels[index] ?? 0) as ContributionDay["level"],
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    weeks.push([
      ...week,
      ...Array.from<undefined>({ length: 7 - week.length }),
    ]);
  }

  return weeks;
}
