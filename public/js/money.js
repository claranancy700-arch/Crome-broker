/**
 * Shared money / number formatting — use on every page for consistent totals.
 */
(function () {
  'use strict';

  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const usdCompact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: 'standard'
  });

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /** Always $1,234.56 */
  function format(v) {
    return usd.format(num(v));
  }

  /** Signed: +$1,234.56 / -$1,234.56 / $0.00 */
  function formatDelta(v) {
    const n = num(v);
    const abs = usd.format(Math.abs(n));
    if (n > 0) return '+' + abs;
    if (n < 0) return '-' + abs;
    return abs;
  }

  const formatSigned = formatDelta;

  /** Plain number with 2 decimals, thousands separators */
  function formatNumber(v, digits) {
    const d = digits == null ? 2 : digits;
    return num(v).toLocaleString('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  function formatQty(v) {
    const n = num(v);
    const digits = Math.abs(n) >= 1 ? 4 : 6;
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    });
  }

  window.money = {
    format,
    formatSigned: formatDelta,
    formatDelta,
    formatNumber,
    formatQty,
    num
  };
})();
