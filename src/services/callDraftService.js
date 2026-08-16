import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const DRAFT_KEY_PREFIX = '@abc_call_draft_';
const PHOTO_ROOT = `${FileSystem.documentDirectory || ''}abc_call_photos/`;

const getDraftKey = cpf => `${DRAFT_KEY_PREFIX}${String(cpf || '').trim()}`;

export const createCallDraftId = () =>
  `rascunho-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export async function loadCallDraft(cpf) {
  if (!cpf) return null;
  const savedDraft = await AsyncStorage.getItem(getDraftKey(cpf));
  if (!savedDraft) return null;

  try {
    const parsedDraft = JSON.parse(savedDraft);
    return parsedDraft && typeof parsedDraft === 'object' ? parsedDraft : null;
  } catch (error) {
    await AsyncStorage.removeItem(getDraftKey(cpf));
    return null;
  }
}

export async function saveCallDraft(cpf, draft) {
  if (!cpf || !draft) return;
  await AsyncStorage.setItem(getDraftKey(cpf), JSON.stringify({
    ...draft,
    savedAt: new Date().toISOString(),
  }));
}

export async function clearCallDraft(cpf) {
  if (!cpf) return;
  await AsyncStorage.removeItem(getDraftKey(cpf));
}

export function hasMeaningfulCallDraft(draft) {
  if (!draft) return false;
  return Boolean(
    draft.unit ||
    draft.respName ||
    draft.serviceOrderNumber ||
    draft.responsibleCompany ||
    draft.otherRequesterName ||
    draft.techSignature ||
    draft.respSignature ||
    draft.selectedRequesters?.length ||
    draft.selectedSectors?.length ||
    draft.servicesList?.length ||
    draft.usedMaterialsList?.length ||
    draft.selectedEquipment?.length ||
    draft.photos?.length ||
    Object.values(draft.equipmentChecks || {}).some(item => item?.status || item?.observation)
  );
}

export async function persistCallPhoto(sourceUri, draftId) {
  if (!sourceUri || Platform.OS === 'web' || !FileSystem.documentDirectory) return sourceUri;
  if (sourceUri.startsWith(PHOTO_ROOT)) return sourceUri;

  const safeDraftId = String(draftId || createCallDraftId()).replace(/[^a-zA-Z0-9_-]/g, '');
  const directory = `${PHOTO_ROOT}${safeDraftId}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const sourceWithoutQuery = sourceUri.split('?')[0];
  const detectedExtension = sourceWithoutQuery.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  const extension = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(detectedExtension)
    ? detectedExtension
    : 'jpg';
  const destinationUri = `${directory}foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}
