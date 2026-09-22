import settingState from '@/store/setting/state'
import { downloadFile, existsFile, mkdir, privateStorageDirectoryPath } from '@/utils/fs'
import { filterFileName } from '@/utils'
import { formatMusicName, toast } from '@/utils/tools'
import {
  getMusicUrl as getOnlineMusicUrl,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import { buildLyricInfo, getCachedLyricInfo } from './utils'

const DEFAULT_DOWNLOAD_DIR = '/storage/emulated/0/Music/LX Music'
const PRIVATE_DOWNLOAD_DIR = `${privateStorageDirectoryPath}/downloads`

const qualityExtMap: Partial<Record<LX.Quality, string>> = {
  flac24bit: 'flac',
  flac: 'flac',
  ape: 'ape',
  '320k': 'mp3',
  '128k': 'mp3',
}

const getUrlExt = (url: string) => {
  const match = /[?&]format=([^&#]+)|\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(url)
  return (match?.[1] || match?.[2] || '').toLowerCase()
}

const getExt = (url: string, quality: LX.Quality) => {
  const ext = getUrlExt(url)
  return ext || qualityExtMap[quality] || 'mp3'
}

const buildSavePath = async(musicInfo: LX.Music.MusicInfoOnline, ext: string, dir: string) => {
  const fileName = filterFileName(formatMusicName(settingState.setting['download.fileName'], musicInfo.name, musicInfo.singer)).trim() || filterFileName(musicInfo.name).trim() || musicInfo.id
  let path = `${dir}/${fileName}.${ext}`
  if (!await existsFile(path)) return path

  let index = 1
  do {
    path = `${dir}/${fileName} (${index++}).${ext}`
  } while (await existsFile(path))
  return path
}

const ensureDir = async(dir: string) => {
  const paths = dir.split('/').filter(Boolean)
  let path = dir.startsWith('/') ? '' : paths.shift() ?? ''
  for (const item of paths) {
    path += `/${item}`
    if (!await existsFile(path)) await mkdir(path)
  }
  return dir
}

const ensureDownloadDir = async() => {
  const savePath = settingState.setting['download.savePath'] || DEFAULT_DOWNLOAD_DIR
  try {
    return await ensureDir(savePath)
  } catch (err) {
    if (!await existsFile(PRIVATE_DOWNLOAD_DIR)) await mkdir(PRIVATE_DOWNLOAD_DIR)
    return PRIVATE_DOWNLOAD_DIR
  }
}

const downloadToPath = async(url: string, savePath: string) => {
  const { promise } = downloadFile(url, savePath)
  await promise
}

export const downloadMusic = async(musicInfo: LX.Music.MusicInfoOnline) => {
  toast(global.i18n.t('download_status_url_getting'))
  const downloadDir = await ensureDownloadDir()

  const url = await getOnlineMusicUrl({
    musicInfo,
    isRefresh: true,
    allowToggleSource: true,
  })
  const savePath = await buildSavePath(musicInfo, getExt(url, settingState.setting['player.playQuality']), downloadDir)

  toast(global.i18n.t('download_status_start'))
  try {
    await downloadToPath(url, savePath)
    toast(global.i18n.t('download_status_completed', { path: savePath }), 'long')
    return savePath
  } catch (err) {
    if (downloadDir == PRIVATE_DOWNLOAD_DIR) throw err
    if (!await existsFile(PRIVATE_DOWNLOAD_DIR)) await mkdir(PRIVATE_DOWNLOAD_DIR)
    const privateSavePath = await buildSavePath(musicInfo, getExt(url, settingState.setting['player.playQuality']), PRIVATE_DOWNLOAD_DIR)
    await downloadToPath(url, privateSavePath)
    toast(global.i18n.t('download_status_completed', { path: privateSavePath }), 'long')
    return privateSavePath
  }
}

export const getMusicUrl = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}): Promise<string> => {
  // if (!isRefresh) {
  //   const path = await getDownloadFilePath(musicInfo, appSetting['download.savePath'])
  //   if (path) return path
  // }

  return getOnlineMusicUrl({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource, allowToggleSource })
}

export const getPicUrl = async({ musicInfo, isRefresh, listId, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (!isRefresh) {
    // const path = await getDownloadFilePath(musicInfo, appSetting['download.savePath'])
    // if (path) {
    //   const pic = await global.lx.worker.main.getMusicFilePic(path)
    //   if (pic) return pic
    // }

    const onlineMusicInfo = musicInfo.metadata.musicInfo
    if (onlineMusicInfo.meta.picUrl) return onlineMusicInfo.meta.picUrl
  }

  return getOnlinePicUrl({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource }).then((url) => {
    // TODO: when listId required save url (update downloadInfo)

    return url
  })
}

export const getLyricInfo = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo.metadata.musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  return getOnlineLyricInfo({
    musicInfo: musicInfo.metadata.musicInfo,
    isRefresh,
    onToggleSource,
  }).catch(async() => {
    // 尝试读取文件内歌词
    // const path = await getDownloadFilePath(musicInfo, appSetting['download.savePath'])
    // if (path) {
    //   const rawlrcInfo = await window.lx.worker.main.getMusicFileLyric(path)
    //   if (rawlrcInfo) return buildLyricInfo(rawlrcInfo)
    // }

    throw new Error('failed')
  })
}
