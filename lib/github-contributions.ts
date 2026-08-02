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

// Verified public snapshot for ryusudol on 2026-08-02. The live build-time
// request below refreshes it; this keeps local builds reliable if the API is down.
const fallback: Contributions = {
  total: 479,
  start: "2025-08-03",
  levels:
    "21100000100000100000100000000001100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100001000000000000011120121010211112301110011211110000000000000000000000000000000000000000000000000000000010000111010000100000000110000101010000000000002101011121111211142111111110010100000000000000000000000000000000000000000000000",
  counts:
    "16,6,8,0,0,0,0,0,1,0,0,0,0,0,4,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,5,16,0,4,14,5,0,2,0,10,8,4,2,7,18,24,0,6,1,3,0,0,2,5,14,1,4,4,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,3,2,1,0,3,0,0,0,0,4,0,0,0,0,0,0,0,0,1,2,0,0,0,0,1,0,9,0,1,0,0,0,0,0,0,0,0,0,0,0,0,12,8,0,2,0,3,3,1,13,9,5,5,5,10,6,1,2,39,15,3,8,4,1,1,3,1,1,0,0,1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0"
      .split(",")
      .map(Number)
      .slice(0, 365),
};

export async function getGithubContributions(
  username: string,
): Promise<Contributions> {
  try {
    const response = await fetch(`${API}/${username}?y=last`, {
      cache: "force-cache",
    });
    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      total: Record<string, number>;
      contributions: ContributionDay[];
    };
    const days = data.contributions;
    if (days.length < 365) return fallback;

    return {
      total: data.total.lastYear ?? 0,
      start: days[0]?.date ?? "",
      levels: days.map((day) => day.level).join(""),
      counts: days.map((day) => day.count),
    };
  } catch {
    return fallback;
  }
}

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
