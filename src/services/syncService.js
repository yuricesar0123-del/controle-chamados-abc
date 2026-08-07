import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';

const SYNC_QUEUE_KEY = '@abc_pdf_sync_queue';
const LAST_SYNC_KEY = '@abc_pdf_last_sync';
const SERVER_URL_KEY = 'abc_sync_server_url';
const PAIRING_TOKEN_KEY = 'abc_sync_pairing_token';
const WEB_SECRET_PREFIX = '@abc_web_secret_';
const SYNC_DIRECTORY = `${FileSystem.documentDirectory || ''}abc_pdf_sync/`;

export const DEFAULT_SYNC_SERVER_URL = 'https://desktop.taild754e4.ts.net';

async function getSecret(key) {
  if (Platform.OS === 'web') return AsyncStorage.getItem(`${WEB_SECRET_PREFIX}${key}`);
  return SecureStore.getItemAsync(key);
}

async function setSecret(key, value) {
  if (Platform.OS === 'web') return AsyncStorage.setItem(`${WEB_SECRET_PREFIX}${key}`, value);
  return SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

function normalizeServerUrl(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(normalized)) {
    throw new Error('Informe um endereço HTTPS válido do Tailscale.');
  }
  return normalized;
}

function normalizePairingToken(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{8,64}$/.test(normalized)) {
    throw new Error('Informe o código de pareamento exibido no notebook.');
  }
  return normalized;
}

function encodeHeader(value) {
  return encodeURIComponent(String(value || '').replace(/[\r\n]/g, ' '));
}

async function readQueue() {
  try {
    const stored = JSON.parse(await AsyncStorage.getItem(SYNC_QUEUE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
}

async function writeQueue(queue) {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function getSyncConfiguration() {
  const [serverUrl, pairingToken] = await Promise.all([
    getSecret(SERVER_URL_KEY),
    getSecret(PAIRING_TOKEN_KEY),
  ]);
  return {
    serverUrl: serverUrl || DEFAULT_SYNC_SERVER_URL,
    pairingToken: pairingToken || '',
    configured: Boolean(serverUrl && pairingToken),
  };
}

export async function saveSyncConfiguration(serverUrl, pairingToken) {
  const validServerUrl = normalizeServerUrl(serverUrl);
  const validToken = normalizePairingToken(pairingToken);
  await Promise.all([
    setSecret(SERVER_URL_KEY, validServerUrl),
    setSecret(PAIRING_TOKEN_KEY, validToken),
  ]);
  return { serverUrl: validServerUrl, pairingToken: validToken, configured: true };
}

async function fetchWithTimeout(url, options, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function testSyncConnection(configuration) {
  const config = configuration || await getSyncConfiguration();
  if (!config.configured) throw new Error('Configure o servidor e o código de pareamento.');

  let response;
  try {
    response = await fetchWithTimeout(`${config.serverUrl}/api/v1/health`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${config.pairingToken}` },
    });
  } catch (error) {
    throw new Error('Servidor indisponível. Confirme se o notebook e o Tailscale estão ligados.');
  }

  if (response.status === 401) throw new Error('Código de pareamento inválido.');
  if (!response.ok) throw new Error('O servidor respondeu com erro.');
  return response.json();
}

export async function enqueuePdfForSync(sourceUri, metadata) {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return false;

  const documentId = `${metadata.type === 'recursos' ? 'recursos' : 'chamado'}-${metadata.id}`;
  await FileSystem.makeDirectoryAsync(SYNC_DIRECTORY, { intermediates: true });
  const destinationUri = `${SYNC_DIRECTORY}${documentId}.pdf`;
  const existingFile = await FileSystem.getInfoAsync(destinationUri);
  if (existingFile.exists) await FileSystem.deleteAsync(destinationUri, { idempotent: true });
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });

  const queue = await readQueue();
  const queueItem = {
    id: documentId,
    fileUri: destinationUri,
    fileName: `${metadata.type === 'recursos' ? 'Recursos' : 'Chamado'}-${String(metadata.id).slice(-8)}.pdf`,
    unit: metadata.unit || 'Sem unidade',
    client: metadata.client || 'Não informado',
    technician: metadata.technician || 'Não informado',
    createdAt: metadata.createdAt || new Date().toISOString(),
    type: metadata.type === 'recursos' ? 'recursos' : 'chamado',
    attempts: 0,
    lastError: '',
  };

  await writeQueue([queueItem, ...queue.filter(item => item.id !== documentId)]);
  return true;
}

export async function getSyncState() {
  const [configuration, queue, lastSync] = await Promise.all([
    getSyncConfiguration(),
    readQueue(),
    AsyncStorage.getItem(LAST_SYNC_KEY),
  ]);
  return { configuration, queue, lastSync: lastSync || '' };
}

export async function syncPendingPdfs() {
  if (Platform.OS === 'web') {
    return { sent: 0, failed: 0, pending: 0, unavailable: true };
  }

  const configuration = await getSyncConfiguration();
  let queue = await readQueue();
  if (!configuration.configured) {
    return { sent: 0, failed: 0, pending: queue.length, notConfigured: true };
  }
  if (queue.length === 0) {
    await testSyncConnection(configuration);
    return { sent: 0, failed: 0, pending: 0 };
  }

  await testSyncConnection(configuration);
  let sent = 0;
  let failed = 0;

  for (const item of [...queue]) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(item.fileUri);
      if (!fileInfo.exists) throw new Error('O PDF não está mais armazenado no dispositivo.');

      const response = await FileSystem.uploadAsync(
        `${configuration.serverUrl}/api/v1/pdfs`,
        item.fileUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            Authorization: `Bearer ${configuration.pairingToken}`,
            'Content-Type': 'application/pdf',
            'X-ABC-Document-Id': item.id,
            'X-ABC-File-Name': encodeHeader(item.fileName),
            'X-ABC-Unit': encodeHeader(item.unit),
            'X-ABC-Client': encodeHeader(item.client),
            'X-ABC-Technician': encodeHeader(item.technician),
            'X-ABC-Created-At': encodeHeader(item.createdAt),
            'X-ABC-Document-Type': item.type,
          },
        }
      );

      if (response.status === 401) throw new Error('Código de pareamento inválido.');
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Servidor recusou o PDF (${response.status}).`);
      }

      await FileSystem.deleteAsync(item.fileUri, { idempotent: true });
      queue = queue.filter(queueItem => queueItem.id !== item.id);
      await writeQueue(queue);
      sent += 1;
    } catch (error) {
      failed += 1;
      queue = queue.map(queueItem => queueItem.id === item.id
        ? { ...queueItem, attempts: (queueItem.attempts || 0) + 1, lastError: error.message }
        : queueItem);
      await writeQueue(queue);
    }
  }

  const completedAt = new Date().toISOString();
  if (sent > 0) await AsyncStorage.setItem(LAST_SYNC_KEY, completedAt);
  return { sent, failed, pending: queue.length, completedAt: sent > 0 ? completedAt : '' };
}
