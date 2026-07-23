export interface SutraIndexEntry {
  id: string              // e.g. 'avatamsaka', 'heart-sutra'
  titleZh: string         // 華嚴經
  titleEn: string         // Avatamsaka Sutra
  totalVolumes: number    // 80
  storageType: 'bundled' | 'remote'
  description: string
}

export interface ZhuyinChar {
  char: string            // 大
  yin: string             // ㄉㄚˋ
}

export interface SutraBlock {
  type: 'heading' | 'paragraph' | 'verse'
  text: string
  zhuyin?: ZhuyinChar[]
}

export interface SutraVolume {
  sutraId: string
  volumeId: string        // '001', '002', ...
  titleZh: string         // 大方廣佛華嚴經卷第一
  blocks: SutraBlock[]
  source?: string         // attribution, e.g. CBETA edition
}

export interface VolumeProgress {
  count: number           // times recited
  lastRead: string        // ISO timestamp
}

export interface SutraProgress {
  sutraId: string
  volumes: Record<string, VolumeProgress>  // volumeId → progress
  totalCompleted: number  // volumes with count >= 1
  isFullyComplete: boolean
  completedAt?: string
}
