export function monthlyDividendRecordId(uuid: string) {
  const normalized = uuid.trim().toLowerCase().replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    throw new RangeError("Invalid monthly dividend record UUID");
  }
  return `mdr_${normalized}`;
}
