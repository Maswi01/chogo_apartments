// Convert a non-negative integer (up to 999,999,999,999) to English words.
// Used for printing the "sum of shillings ... (in words)" line on receipts.
const ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function below1000(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) {
    const t = Math.floor(n / 10), r = n % 10
    return TENS[t] + (r ? '-' + ONES[r] : '')
  }
  const h = Math.floor(n / 100), r = n % 100
  return ONES[h] + ' hundred' + (r ? ' ' + below1000(r) : '')
}

export function numberToWords(num: number): string {
  if (!isFinite(num)) return ''
  const n = Math.floor(Math.abs(num))
  if (n === 0) return 'zero'
  const groups = ['', 'thousand', 'million', 'billion']
  const parts: string[] = []
  let i = 0
  let rest = n
  while (rest > 0 && i < groups.length) {
    const chunk = rest % 1000
    if (chunk) {
      const word = below1000(chunk) + (groups[i] ? ' ' + groups[i] : '')
      parts.unshift(word)
    }
    rest = Math.floor(rest / 1000)
    i++
  }
  return parts.join(' ').trim()
}
