import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const BACKUP_FILE_NAME = 'abc_controle_chamados_backup.json';
const APP_STORAGE_PREFIX = '@abc_';

export async function exportBackupFile() {
  const allKeys = await AsyncStorage.getAllKeys();
  const appKeys = allKeys.filter(key => key.startsWith(APP_STORAGE_PREFIX));
  const items = await AsyncStorage.multiGet(appKeys);
  const backupData = Object.fromEntries(items);
  const fileUri = `${FileSystem.documentDirectory}${BACKUP_FILE_NAME}`;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Salvar Backup',
  });
}

export async function importBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return false;

  const jsonString = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const backupData = JSON.parse(jsonString);

  if (!backupData || Array.isArray(backupData) || typeof backupData !== 'object') {
    throw new Error('Formato de backup inválido.');
  }

  const entries = Object.entries(backupData);
  const isValid = entries.length > 0 && entries.every(([key, value]) =>
    key.startsWith(APP_STORAGE_PREFIX) && (typeof value === 'string' || value === null)
  );
  if (!isValid) throw new Error('Conteúdo de backup inválido.');

  await AsyncStorage.multiSet(entries.map(([key, value]) => [key, value ?? '']));
  return true;
}
