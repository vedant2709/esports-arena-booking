// Computes the price of a booking on the SERVER. The client never sends a price
// — it only sends what they want (station, package, squad size), and we derive
// the cost here. This is a core payment-security rule (no tampering with totals).
//
// MVP pricing model: per player, per 1-hour slot.
//   price = station.pricePerHour × squadSize
// (The venue's flat "unlimited pass" packages are out of scope for the MVP;
//  packageType is kept as a descriptive label.)
export function computePrice(station, packageType, squadSize) {
  return station.pricePerHour * squadSize;
}
