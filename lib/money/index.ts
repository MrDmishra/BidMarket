const BPS_DENOMINATOR = 10_000n;
const RUPEE_FORMAT = new Intl.NumberFormat("en-IN");

function assertPaise(paise: number) {
  if (!Number.isSafeInteger(paise)) throw new RangeError("Paise must be a safe integer");
}

/** Formats integer paise for display, such as ₹1,25,000 or ₹604.96. */
export function formatInr(paise: number): string {
  assertPaise(paise);
  const absolute = Math.abs(paise);
  const rupees = RUPEE_FORMAT.format(Math.floor(absolute / 100));
  const remainder = absolute % 100;
  const fraction = remainder === 0 ? "" : `.${String(remainder).padStart(2, "0")}`;
  return `${paise < 0 ? "-" : ""}₹${rupees}${fraction}`;
}

/** Parses a rupee amount without floating-point arithmetic. */
export function rupeesToPaise(rupees: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(rupees.trim());
  if (!match) throw new RangeError("Enter an amount such as 1250 or 1250.50");
  const whole = BigInt(match[1] ?? "0");
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0"));
  const paise = Number(whole * 100n + fraction);
  assertPaise(paise);
  return paise;
}

/** Applies a basis-point rate and rounds half up to the nearest paisa. */
export function applyBps(basePaise: number, rateBps: number): number {
  assertPaise(basePaise);
  if (basePaise < 0 || !Number.isInteger(rateBps) || rateBps < 0) {
    throw new RangeError("Base and rate must be non-negative integers");
  }
  const scaled = BigInt(basePaise) * BigInt(rateBps);
  return Number((scaled + BPS_DENOMINATOR / 2n) / BPS_DENOMINATOR);
}
