/**
 * Format number to Indonesian style (e.g., 1.200 -> "1,2rb")
 */
export function formatSoldCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  
  // Format to "X,Xrb" style
  const thousands = count / 1000;
  if (thousands >= 10) {
    // 10.000+ -> "10rb", "15rb"
    return Math.floor(thousands).toLocaleString('id-ID') + 'rb';
  }
  // 1.000-9.999 -> "1,2rb", "5,5rb"
  return thousands.toFixed(1).replace('.', ',') + 'rb';
}

/**
 * Format rating display with count
 */
export function formatRatingCount(count: number): string {
  if (count === 0) {
    return 'Baru';
  }
  return formatSoldCount(count);
}
