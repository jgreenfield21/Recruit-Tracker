const EASTERN_TZ = "America/New_York";

function getETPartsFromDate(date: Date): Record<string, string> {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const parts: Record<string, string> = {};
  for (const p of formatted) {
    parts[p.type] = p.value;
  }
  return parts;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatET(dateStr: string, formatStr: string): string {
  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) {
    return dateStr;
  }

  const parts = getETPartsFromDate(date);
  const monthIdx = parseInt(parts.month, 10) - 1;
  const monthShort = MONTH_NAMES[monthIdx];
  const day = parseInt(parts.day, 10);
  const year = parts.year;
  const hour12 = parts.hour;
  const minute = parts.minute;
  const dayPeriod = parts.dayPeriod;

  if (formatStr === "MMM d, yyyy") {
    return `${monthShort} ${day}, ${year}`;
  }
  if (formatStr === "MMM d") {
    return `${monthShort} ${day}`;
  }
  if (formatStr === "MMM d, yyyy 'at' h:mm a 'ET'") {
    return `${monthShort} ${day}, ${year} at ${hour12}:${minute} ${dayPeriod} ET`;
  }

  return `${monthShort} ${day}, ${year}`;
}

export function toEasternISO(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  for (let offsetHours = 5; offsetHours >= 4; offsetHours--) {
    const utcMs = Date.UTC(year, month - 1, day, hours + offsetHours, minutes, 0);
    const candidate = new Date(utcMs);

    const etParts = getETPartsFromDate(candidate);
    const etHour24 = parseInt(etParts.hour, 10) + (etParts.dayPeriod === "PM" && etParts.hour !== "12" ? 12 : 0) + (etParts.dayPeriod === "AM" && etParts.hour === "12" ? -12 : 0);
    const etMin = parseInt(etParts.minute, 10);
    const etDay = parseInt(etParts.day, 10);
    const etMonth = parseInt(etParts.month, 10);

    if (etHour24 === hours && etMin === minutes && etDay === day && etMonth === month) {
      return candidate.toISOString();
    }
  }

  const utcMs = Date.UTC(year, month - 1, day, hours + 5, minutes, 0);
  return new Date(utcMs).toISOString();
}

export function nowET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: EASTERN_TZ });
}
