import { pinyin } from 'pinyin-pro'

/**
 * 漢字 → 注音(ㄅㄆㄇ)with tone, for the sutra reader's ruby.
 *
 * pinyin-pro gives numeric-tone pinyin; the pinyin→bopomofo tables and the
 * glide/whole-syllable rules below turn that into zhuyin symbols plus a tone
 * mark, the same standard mapping the 印經坊 reader uses.
 */

const TONES: Record<string, string> = { '1': '', '2': 'ˊ', '3': 'ˇ', '4': 'ˋ', '5': '˙', '0': '˙' }

const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's']

const IMAP: Record<string, string> = {
  zh: 'ㄓ', ch: 'ㄔ', sh: 'ㄕ', b: 'ㄅ', p: 'ㄆ', m: 'ㄇ', f: 'ㄈ', d: 'ㄉ', t: 'ㄊ', n: 'ㄋ',
  l: 'ㄌ', g: 'ㄍ', k: 'ㄎ', h: 'ㄏ', j: 'ㄐ', q: 'ㄑ', x: 'ㄒ', r: 'ㄖ', z: 'ㄗ', c: 'ㄘ', s: 'ㄙ',
}

const FMAP: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ê: 'ㄝ', eh: 'ㄝ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ', an: 'ㄢ',
  en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', ong: 'ㄨㄥ', er: 'ㄦ',
  i: 'ㄧ', ia: 'ㄧㄚ', ie: 'ㄧㄝ', iao: 'ㄧㄠ', iu: 'ㄧㄡ', iou: 'ㄧㄡ', ian: 'ㄧㄢ', in: 'ㄧㄣ',
  iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ', uei: 'ㄨㄟ', uan: 'ㄨㄢ', un: 'ㄨㄣ',
  uen: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ',
  v: 'ㄩ', ve: 'ㄩㄝ', van: 'ㄩㄢ', vn: 'ㄩㄣ',
}

// Whole-syllable spellings (yi/wu/yu…) back to their glide forms.
function normGlide(s: string): string {
  if (s === 'yi') return 'i'
  if (s.startsWith('yu')) return 'v' + s.slice(2)
  const yTable: Record<string, string> = {
    ye: 'ie', ya: 'ia', yao: 'iao', you: 'iou', yan: 'ian', yin: 'in',
    yang: 'iang', ying: 'ing', yong: 'iong',
  }
  if (yTable[s]) return yTable[s]
  if (s.startsWith('y')) return 'i' + s.slice(1)
  const wTable: Record<string, string> = {
    wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'uei', wan: 'uan',
    wen: 'uen', wang: 'uang', weng: 'ueng',
  }
  if (wTable[s]) return wTable[s]
  if (s.startsWith('w')) return 'u' + s.slice(1)
  return s
}

function pyToZhuyin(py: string): string {
  if (!py) return ''
  const m = py.match(/([a-zêü]+)([0-5])?$/i)
  if (!m) return py
  let syl = m[1].toLowerCase().replace(/ü/g, 'v').replace(/u:/g, 'v')
  const t = m[2] ? TONES[m[2]] : ''
  const neutral = m[2] === '5' || m[2] === '0'
  if (syl === 'ng') return 'ㄥ' + t
  if (syl === 'n') return 'ㄣ' + t
  if (syl === 'm') return 'ㄇ' + t
  if (syl === 'hng') return 'ㄏㄥ' + t

  let init = ''
  let rest = syl
  for (const ini of INITIALS) {
    if (syl.startsWith(ini)) {
      init = ini
      rest = syl.slice(ini.length)
      break
    }
  }
  if (rest === 'i' && ['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(init)) {
    return neutral ? '˙' + IMAP[init] : IMAP[init] + t
  }
  if ((init === 'j' || init === 'q' || init === 'x') && rest.startsWith('u')) rest = 'v' + rest.slice(1)
  if (init === '') rest = normGlide(syl)
  const f = FMAP[rest]
  if (f === undefined) return py
  const body = (IMAP[init] || '') + f
  return neutral ? '˙' + body : body + t
}

export interface Zhuyin {
  syms: string
  tone: string
  neutral: boolean
}

export function splitZhuyin(z: string): Zhuyin {
  if (!z) return { syms: '', tone: '', neutral: false }
  if (z[0] === '˙') return { syms: z.slice(1), tone: '˙', neutral: true }
  const last = z[z.length - 1]
  if (last === 'ˊ' || last === 'ˇ' || last === 'ˋ') return { syms: z.slice(0, -1), tone: last, neutral: false }
  return { syms: z, tone: '', neutral: false }
}

const cache = new Map<string, string>()

/** Zhuyin string (with tone) for a single character, memoised. */
export function zhuyinOf(ch: string): string {
  const hit = cache.get(ch)
  if (hit !== undefined) return hit
  let z = ''
  try {
    const py = pinyin(ch, { type: 'array', toneType: 'num', v: true })[0]
    z = pyToZhuyin(py)
  } catch {
    z = ''
  }
  cache.set(ch, z)
  return z
}
