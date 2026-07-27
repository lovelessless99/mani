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

/**
 * 破音字校正 — corrections carried over from the 印經坊 reference so sutra
 * readings are right where auto-conversion would mispronounce them
 * (般若=ㄅㄛㄖㄜˇ, 南無=ㄋㄚˊㄇㄛˊ, 兜率=ㄉㄡㄌㄩˋ…). Single characters
 * override auto-conversion; phrases override by longest match first.
 */
const CHAR_DICT: Record<string, string> = {
  缽: 'ㄅㄛ', 鉢: 'ㄅㄛ', 於: 'ㄩˊ', 囉: 'ㄌㄨㄛˊ', 唎: 'ㄌㄧˋ', 嚧: 'ㄌㄨˊ',
  醯: 'ㄒㄧ', 呬: 'ㄒㄧˋ', 㖿: 'ㄧㄝ', 闍: 'ㄕㄜˊ',
}

const PHRASE_DICT: Record<string, string[]> = {
  般若: ['ㄅㄛ', 'ㄖㄜˇ'], 波羅蜜: ['ㄅㄛ', 'ㄌㄨㄛˊ', 'ㄇㄧˋ'], 波羅蜜多: ['ㄅㄛ', 'ㄌㄨㄛˊ', 'ㄇㄧˋ', 'ㄉㄨㄛ'],
  南無: ['ㄋㄚˊ', 'ㄇㄛˊ'], 南無阿彌陀佛: ['ㄋㄚˊ', 'ㄇㄛˊ', 'ㄜ', 'ㄇㄧˊ', 'ㄊㄨㄛˊ', 'ㄈㄛˊ'],
  阿耨多羅三藐三菩提: ['ㄚ', 'ㄋㄡˋ', 'ㄉㄨㄛ', 'ㄌㄨㄛˊ', 'ㄙㄢ', 'ㄇㄧㄠˇ', 'ㄙㄢ', 'ㄆㄨˊ', 'ㄊㄧˊ'],
  三藐三菩提: ['ㄙㄢ', 'ㄇㄧㄠˇ', 'ㄙㄢ', 'ㄆㄨˊ', 'ㄊㄧˊ'], 阿耨: ['ㄚ', 'ㄋㄡˋ'],
  菩提: ['ㄆㄨˊ', 'ㄊㄧˊ'], 菩薩: ['ㄆㄨˊ', 'ㄙㄚˋ'], 摩訶: ['ㄇㄛˊ', 'ㄏㄜ'],
  須菩提: ['ㄒㄩ', 'ㄆㄨˊ', 'ㄊㄧˊ'], 舍利: ['ㄕㄜˋ', 'ㄌㄧˋ'], 舍衛: ['ㄕㄜˋ', 'ㄨㄟˋ'],
  祇樹: ['ㄑㄧˊ', 'ㄕㄨˋ'], 給孤獨: ['ㄐㄧˇ', 'ㄍㄨ', 'ㄉㄨˊ'], 鳩摩羅什: ['ㄐㄧㄡ', 'ㄇㄛˊ', 'ㄌㄨㄛˊ', 'ㄕˊ'],
  比丘: ['ㄅㄧˇ', 'ㄑㄧㄡ'], 長老: ['ㄓㄤˇ', 'ㄌㄠˇ'], 偏袒: ['ㄆㄧㄢ', 'ㄊㄢˇ'],
  三藏: ['ㄙㄢ', 'ㄗㄤˋ'], 大藏經: ['ㄉㄚˋ', 'ㄗㄤˋ', 'ㄐㄧㄥ'],
  地藏: ['ㄉㄧˋ', 'ㄗㄤˋ'], 地藏菩薩: ['ㄉㄧˋ', 'ㄗㄤˋ', 'ㄆㄨˊ', 'ㄙㄚˋ'],
  維摩詰: ['ㄨㄟˊ', 'ㄇㄛˊ', 'ㄐㄧㄝˊ'], 實叉難陀: ['ㄕˊ', 'ㄔㄚ', 'ㄋㄢˊ', 'ㄊㄨㄛˊ'],
  于闐: ['ㄩˊ', 'ㄊㄧㄢˊ'], 忉利: ['ㄉㄠ', 'ㄌㄧˋ'], 閻浮: ['ㄧㄢˊ', 'ㄈㄨˊ'],
  沙門: ['ㄕㄚ', 'ㄇㄣˊ'], 伽藍: ['ㄑㄧㄝˊ', 'ㄌㄢˊ'], 僧伽: ['ㄙㄥ', 'ㄑㄧㄝˊ'],
  毘耶離: ['ㄆㄧˊ', 'ㄧㄝˊ', 'ㄌㄧˊ'], 菴羅: ['ㄢ', 'ㄌㄨㄛˊ'],
  揭帝: ['ㄐㄧㄝ', 'ㄉㄧˋ'], 莎婆訶: ['ㄙㄨㄛ', 'ㄆㄛˊ', 'ㄏㄜ'],
  涅槃: ['ㄋㄧㄝˋ', 'ㄆㄢˊ'], 罣礙: ['ㄍㄨㄚˋ', 'ㄞˋ'], 薩埵: ['ㄙㄚˋ', 'ㄉㄨㄛˇ'],
  著衣: ['ㄓㄨㄛˊ', 'ㄧ'], 著地: ['ㄓㄨㄛˊ', 'ㄉㄧˋ'], 降伏: ['ㄒㄧㄤˊ', 'ㄈㄨˊ'],
  合掌: ['ㄏㄜˊ', 'ㄓㄤˇ'], 敷座: ['ㄈㄨ', 'ㄗㄨㄛˋ'], 闍: ['ㄕㄜˊ'],
  觀自在: ['ㄍㄨㄢ', 'ㄗˋ', 'ㄗㄞˋ'], 觀世音: ['ㄍㄨㄢ', 'ㄕˋ', 'ㄧㄣ'],
  釋迦牟尼: ['ㄕˋ', 'ㄐㄧㄚ', 'ㄇㄡˊ', 'ㄋㄧˊ'], 釋迦: ['ㄕˋ', 'ㄐㄧㄚ'], 牟尼: ['ㄇㄡˊ', 'ㄋㄧˊ'],
  文殊師利: ['ㄨㄣˊ', 'ㄕㄨ', 'ㄕ', 'ㄌㄧˋ'], 文殊: ['ㄨㄣˊ', 'ㄕㄨ'], 彌勒: ['ㄇㄧˊ', 'ㄌㄜˋ'],
  普賢: ['ㄆㄨˊ', 'ㄒㄧㄢˊ'], 大勢至: ['ㄉㄚˋ', 'ㄕˋ', 'ㄓˋ'], 虛空藏: ['ㄒㄩ', 'ㄎㄨㄥ', 'ㄗㄤˋ'],
  阿難: ['ㄚ', 'ㄋㄢˊ'], 舍利弗: ['ㄕㄜˋ', 'ㄌㄧˋ', 'ㄈㄨˊ'],
  大目犍連: ['ㄉㄚˋ', 'ㄇㄨˋ', 'ㄐㄧㄢ', 'ㄌㄧㄢˊ'], 目犍連: ['ㄇㄨˋ', 'ㄐㄧㄢ', 'ㄌㄧㄢˊ'],
  摩訶迦葉: ['ㄇㄛˊ', 'ㄏㄜ', 'ㄐㄧㄚ', 'ㄕㄜˋ'], 迦葉: ['ㄐㄧㄚ', 'ㄕㄜˋ'],
  富樓那: ['ㄈㄨˋ', 'ㄌㄡˊ', 'ㄋㄚˋ'], 阿那律: ['ㄚ', 'ㄋㄚˋ', 'ㄌㄩˋ'],
  憍陳如: ['ㄐㄧㄠ', 'ㄔㄣˊ', 'ㄖㄨˊ'], 憍陳那: ['ㄐㄧㄠ', 'ㄔㄣˊ', 'ㄋㄚˋ'],
  迦旃延: ['ㄐㄧㄚ', 'ㄓㄢ', 'ㄧㄢˊ'], 優波離: ['ㄧㄡ', 'ㄆㄛ', 'ㄌㄧˊ'], 羅睺羅: ['ㄌㄨㄛˊ', 'ㄏㄡˊ', 'ㄌㄨㄛˊ'],
  憍梵鉢提: ['ㄐㄧㄠ', 'ㄈㄢˋ', 'ㄅㄛ', 'ㄊㄧˊ'], 摩登伽: ['ㄇㄛˊ', 'ㄉㄥ', 'ㄑㄧㄝˊ'],
  阿彌陀佛: ['ㄚ', 'ㄇㄧˊ', 'ㄊㄨㄛˊ', 'ㄈㄛˊ'], 阿彌陀: ['ㄚ', 'ㄇㄧˊ', 'ㄊㄨㄛˊ'],
  毘盧遮那: ['ㄆㄧˊ', 'ㄌㄨˊ', 'ㄓㄜ', 'ㄋㄚˋ'], 盧舍那: ['ㄌㄨˊ', 'ㄕㄜˋ', 'ㄋㄚˋ'],
  波斯匿: ['ㄅㄛ', 'ㄙ', 'ㄋㄧˋ'], 阿闍世: ['ㄚ', 'ㄕㄜˊ', 'ㄕˋ'], 阿闍梨: ['ㄚ', 'ㄕㄜˊ', 'ㄌㄧˊ'],
  頻婆娑羅: ['ㄆㄧㄣˊ', 'ㄆㄛˊ', 'ㄙㄨㄛ', 'ㄌㄨㄛˊ'], 提婆達多: ['ㄊㄧˊ', 'ㄆㄛˊ', 'ㄉㄚˊ', 'ㄉㄨㄛ'],
  阿修羅: ['ㄚ', 'ㄒㄧㄡ', 'ㄌㄨㄛˊ'], 乾闥婆: ['ㄑㄧㄢˊ', 'ㄊㄚˋ', 'ㄆㄛˊ'],
  緊那羅: ['ㄐㄧㄣˇ', 'ㄋㄚˋ', 'ㄌㄨㄛˊ'], 摩睺羅伽: ['ㄇㄛˊ', 'ㄏㄡˊ', 'ㄌㄨㄛˊ', 'ㄑㄧㄝˊ'],
  迦樓羅: ['ㄐㄧㄚ', 'ㄌㄡˊ', 'ㄌㄨㄛˊ'], 夜叉: ['ㄧㄝˋ', 'ㄔㄚ'], 藥叉: ['ㄧㄠˋ', 'ㄔㄚ'],
  羅剎: ['ㄌㄨㄛˊ', 'ㄔㄚˋ'], 鳩槃茶: ['ㄐㄧㄡ', 'ㄆㄢˊ', 'ㄔㄚˊ'], 毘舍遮: ['ㄆㄧˊ', 'ㄕㄜˋ', 'ㄓㄜ'],
  比丘尼: ['ㄅㄧˇ', 'ㄑㄧㄡ', 'ㄋㄧˊ'], 優婆塞: ['ㄧㄡ', 'ㄆㄛˊ', 'ㄙㄞ'], 優婆夷: ['ㄧㄡ', 'ㄆㄛˊ', 'ㄧˊ'],
  婆羅門: ['ㄆㄛˊ', 'ㄌㄨㄛˊ', 'ㄇㄣˊ'], 剎帝利: ['ㄔㄚˋ', 'ㄉㄧˋ', 'ㄌㄧˋ'], 剎利: ['ㄔㄚˋ', 'ㄌㄧˋ'],
  首陀羅: ['ㄕㄡˇ', 'ㄊㄨㄛˊ', 'ㄌㄨㄛˊ'],
  陀羅尼: ['ㄊㄨㄛˊ', 'ㄌㄨㄛˊ', 'ㄋㄧˊ'], 三昧: ['ㄙㄢ', 'ㄇㄟˋ'],
  三摩地: ['ㄙㄢ', 'ㄇㄛˊ', 'ㄉㄧˋ'], 三摩提: ['ㄙㄢ', 'ㄇㄛˊ', 'ㄊㄧˊ'],
  阿羅漢: ['ㄚ', 'ㄌㄨㄛˊ', 'ㄏㄢˋ'], 羅漢: ['ㄌㄨㄛˊ', 'ㄏㄢˋ'], 辟支佛: ['ㄆㄧˋ', 'ㄓ', 'ㄈㄛˊ'],
  袈裟: ['ㄐㄧㄚ', 'ㄕㄚ'], 剎那: ['ㄔㄚˋ', 'ㄋㄚˋ'], 由旬: ['ㄧㄡˊ', 'ㄒㄩㄣˊ'],
  那由他: ['ㄋㄚˋ', 'ㄧㄡˊ', 'ㄊㄚ'], 阿僧祇: ['ㄚ', 'ㄙㄥ', 'ㄑㄧˊ'],
  娑婆: ['ㄙㄨㄛ', 'ㄆㄛˊ'], 兜率: ['ㄉㄡ', 'ㄌㄩˋ'], 曼陀羅: ['ㄇㄢˋ', 'ㄊㄨㄛˊ', 'ㄌㄨㄛˊ'],
  摩尼: ['ㄇㄛˊ', 'ㄋㄧˊ'], 恒河沙: ['ㄏㄥˊ', 'ㄏㄜˊ', 'ㄕㄚ'], 恒河: ['ㄏㄥˊ', 'ㄏㄜˊ'],
  優鉢羅: ['ㄧㄡ', 'ㄅㄛ', 'ㄌㄨㄛˊ'], 蓮華: ['ㄌㄧㄢˊ', 'ㄏㄨㄚ'], 華嚴: ['ㄏㄨㄚˊ', 'ㄧㄢˊ'],
  迦陵頻伽: ['ㄐㄧㄚ', 'ㄌㄧㄥˊ', 'ㄆㄧㄣˊ', 'ㄑㄧㄝˊ'], 頻伽: ['ㄆㄧㄣˊ', 'ㄑㄧㄝˊ'],
  毘舍離: ['ㄆㄧˊ', 'ㄕㄜˋ', 'ㄌㄧˊ'], 王舍城: ['ㄨㄤˊ', 'ㄕㄜˋ', 'ㄔㄥˊ'], 迦毘羅: ['ㄐㄧㄚ', 'ㄆㄧˊ', 'ㄌㄨㄛˊ'],
  願樂欲聞: ['ㄩㄢˋ', 'ㄧㄠˋ', 'ㄩˋ', 'ㄨㄣˊ'], 伎樂: ['ㄐㄧˋ', 'ㄩㄝˋ'], 音樂: ['ㄧㄣ', 'ㄩㄝˋ'],
  供養: ['ㄍㄨㄥˋ', 'ㄧㄤˇ'], 惡道: ['ㄜˋ', 'ㄉㄠˋ'], 惡趣: ['ㄜˋ', 'ㄑㄩˋ'], 憎惡: ['ㄗㄥ', 'ㄨˋ'],
}

const PHRASE_KEYS = Object.keys(PHRASE_DICT).sort((a, b) => b.length - a.length)

const cache = new Map<string, string>()

/** Zhuyin for a single character — correction dict first, then auto. */
export function zhuyinOf(ch: string): string {
  if (CHAR_DICT[ch]) return CHAR_DICT[ch]
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

/**
 * Zhuyin for a whole run of characters, phrase-aware: longest 破音詞 win
 * first (so 般若 reads ㄅㄛㄖㄜˇ across both chars), then any char left over
 * falls back to its single-char reading.
 */
export function zhuyinForChars(chars: string[]): string[] {
  const zy: string[] = new Array(chars.length).fill('')
  const covered: boolean[] = new Array(chars.length).fill(false)
  for (let i = 0; i < chars.length; ) {
    let hit = false
    for (const key of PHRASE_KEYS) {
      if (chars.slice(i, i + key.length).join('') === key) {
        PHRASE_DICT[key].forEach((z, k) => {
          zy[i + k] = z
          covered[i + k] = true
        })
        i += key.length
        hit = true
        break
      }
    }
    if (!hit) i++
  }
  for (let i = 0; i < chars.length; i++) {
    if (!covered[i]) zy[i] = zhuyinOf(chars[i])
  }
  return zy
}
