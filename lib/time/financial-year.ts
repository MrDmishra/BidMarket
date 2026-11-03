/** Lists the last three completed Indian financial years, newest first. */
export function recentFinancialYears(today = new Date()): string[] {
  const month = today.getMonth();
  const currentStart = month >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return [1, 2, 3].map((yearsBack) => {
    const start = currentStart - yearsBack;
    return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
  });
}
