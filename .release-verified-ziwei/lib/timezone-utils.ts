const TZ_FORMAT_CACHE = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cached = TZ_FORMAT_CACHE.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  TZ_FORMAT_CACHE.set(timeZone, formatter);
  return formatter;
}

function wallClockMs(instant: Date, timeZone: string) {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const lookup = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const hour = lookup.hour === '24' ? '00' : lookup.hour;
  return Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
}

/**
 * Converts a local civil date/time in a given IANA timezone into the corresponding
 * UTC instant, accounting for historical DST rules via Intl (no external tz database needed).
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const asIfUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(asIfUtc.getTime())) throw new Error('日期或時間格式不正確。');

  let guess = asIfUtc.getTime();
  for (let i = 0; i < 2; i += 1) {
    const shown = wallClockMs(new Date(guess), timeZone);
    const diff = shown - asIfUtc.getTime();
    guess -= diff;
  }
  return new Date(guess);
}
