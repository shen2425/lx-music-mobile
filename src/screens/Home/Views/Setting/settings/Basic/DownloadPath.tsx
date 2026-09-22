import { memo } from 'react'
import { View } from 'react-native'

import { updateSetting } from '@/core/common'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { selectManagedFolder } from '@/utils/fs'
import { createStyle, toast } from '@/utils/tools'
import Button from '../../components/Button'
import SubTitle from '../../components/SubTitle'

const DEFAULT_DOWNLOAD_DIR = '/storage/emulated/0/Music/LX Music'

export default memo(() => {
  const t = useI18n()
  const theme = useTheme()
  const savePath = useSettingValue('download.savePath')

  const handleSelectPath = () => {
    void selectManagedFolder(true).then((dir) => {
      if (!dir?.path) return
      updateSetting({ 'download.savePath': dir.path })
      toast(t('setting_basic_download_path_update_tip'))
    }).catch((err: Error) => {
      toast(t('setting_basic_download_path_update_failed_tip', { msg: err.message }), 'long')
    })
  }
  const handleResetPath = () => {
    updateSetting({ 'download.savePath': DEFAULT_DOWNLOAD_DIR })
    toast(t('setting_basic_download_path_reset_tip'))
  }

  return (
    <SubTitle title={t('setting_basic_download_path')}>
      <Text style={styles.path} size={12} color={theme['c-font-label']}>{savePath || DEFAULT_DOWNLOAD_DIR}</Text>
      <View style={styles.buttons}>
        <Button onPress={handleSelectPath}>{t('setting_basic_download_path_select')}</Button>
        <Button onPress={handleResetPath}>{t('setting_basic_download_path_reset')}</Button>
      </View>
      <Text style={styles.tip} size={12} color={theme['c-font-label']}>{t('setting_basic_download_path_tip')}</Text>
    </SubTitle>
  )
})

const styles = createStyle({
  path: {
    marginBottom: 8,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tip: {
    paddingRight: 15,
  },
})
