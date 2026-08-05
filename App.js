import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  Alert, Image, Modal, StatusBar, Keyboard, LogBox, Platform, KeyboardAvoidingView, Switch, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import SignatureScreen from 'react-native-signature-canvas';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';

const EMPRESA_NOME = "CONTROLE DE CHAMADOS ABC";
const LOGO_SOURCE = require('./assets/logo.png');

LogBox.ignoreAllLogs();

export default function App() {
  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [screen, setScreen] = useState('loading');
  const [loginName, setLoginName] = useState('');
  const [loginCpf, setLoginCpf] = useState('');
  const [rememberName, setRememberName] = useState(true);
  const [registerName, setRegisterName] = useState('');
  const [registerCpf, setRegisterCpf] = useState('');
  const [user, setUser] = useState({ name: '', cpf: '' });
  const [deviceId, setDeviceId] = useState('');

  const [client, setClient] = useState('');
  const [unit, setUnit] = useState('');
  const [respName, setRespName] = useState('');
  const [tempService, setTempService] = useState('');
  const [servicesList, setServicesList] = useState([]);
  const [tempUsedMaterial, setTempUsedMaterial] = useState('');
  const [usedMaterialsList, setUsedMaterialsList] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [checklist, setChecklist] = useState({
    registro: false,
    local: false,
    evidencias: false
  });

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [tempObservation, setTempObservation] = useState('');
  const [techSignature, setTechSignature] = useState(null);
  const [respSignature, setRespSignature] = useState(null);
  const [isSigning, setIsSigning] = useState(null);
  const [signerId, setSignerId] = useState('');
  const [showSignInput, setShowSignInput] = useState(false);
  const refSignature = useRef();

  const [osHistory, setOsHistory] = useState([]);
  const [osTrash, setOsTrash] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [reopenModalVisible, setReopenModalVisible] = useState(false);
  const [osToReopen, setOsToReopen] = useState(null);
  const [reopenCpf, setReopenCpf] = useState('');

  const [clientsDb, setClientsDb] = useState([]);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientUnit, setNewClientUnit] = useState('');
  const [editingClientId, setEditingClientId] = useState(null);
  const [selectClientModal, setSelectClientModal] = useState(false);

  const [budgetClient, setBudgetClient] = useState('');
  const [budgetUnit, setBudgetUnit] = useState('');
  const [budgetRespName, setBudgetRespName] = useState('');
  const [budgetNeed, setBudgetNeed] = useState('');
  const [budgetTempMaterial, setBudgetTempMaterial] = useState('');
  const [budgetMaterials, setBudgetMaterials] = useState([]);
  const [budgetPhotos, setBudgetPhotos] = useState([]);
  const [budgetPhotoModalVisible, setBudgetPhotoModalVisible] = useState(false);
  const [selectedBudgetPhotoIndex, setSelectedBudgetPhotoIndex] = useState(null);
  const [tempBudgetObservation, setTempBudgetObservation] = useState('');

  const [trialDaysLeft, setTrialDaysLeft] = useState(-1);
  const [unlockCode, setUnlockCode] = useState('');
  const [activationModalVisible, setActivationModalVisible] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      let currentDeviceId = 'WEB_DEVICE';
      if (Platform.OS === 'android') {
        currentDeviceId = Application.androidId;
      } else if (Platform.OS === 'ios') {
        currentDeviceId = await Application.getIosIdForVendorAsync();
      }
      setDeviceId(currentDeviceId);

      const isUnlocked = await SecureStore.getItemAsync('abc_app_unlocked');

      if (isUnlocked !== 'true') {
        let installDate = await SecureStore.getItemAsync('abc_install_date');

        if (!installDate) {
          installDate = Date.now().toString();
          await SecureStore.setItemAsync('abc_install_date', installDate);
        }

        const daysUsed = (Date.now() - parseInt(installDate)) / (24 * 60 * 60 * 1000);
        const daysLeft = Math.ceil(31 - daysUsed);

        if (daysUsed > 31) {
          setScreen('expired');
          return;
        } else {
          setTrialDaysLeft(daysLeft);
        }
      } else {
        setTrialDaysLeft(-1);
      }

      const savedLoginName = await AsyncStorage.getItem('@abc_saved_name');
      if (savedLoginName) {
        setLoginName(savedLoginName);
        setRememberName(true);
      }

      if (Platform.OS !== 'web') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
    } catch (e) { }
    setScreen('login');
  };

  const handleUnlock = async () => {
    if (unlockCode === '159753ABC') {
      await SecureStore.setItemAsync('abc_app_unlocked', 'true');
      setTrialDaysLeft(-1);
      setActivationModalVisible(false);
      Alert.alert("Sucesso", "Licença ativada permanentemente!");
      if (screen === 'expired') {
        initializeApp();
      }
    } else {
      Alert.alert("Acesso Negado", "Chave de ativação inválida.");
    }
  };

  const loadLocalData = async (cpf) => {
    try {
      const historyStr = await AsyncStorage.getItem(`@abc_calls_history_${cpf}`);
      const trashStr = await AsyncStorage.getItem(`@abc_calls_trash_${cpf}`);
      const clientsStr = await AsyncStorage.getItem('@abc_requesters_db');

      if (historyStr) setOsHistory(JSON.parse(historyStr));
      else setOsHistory([]);

      if (trashStr) setOsTrash(JSON.parse(trashStr));
      else setOsTrash([]);

      if (clientsStr) setClientsDb(JSON.parse(clientsStr));
      else setClientsDb([]);
    } catch (e) { }
  };

  const getUsers = async () => {
    try {
      const usersJson = await AsyncStorage.getItem('@abc_users_db');
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (e) { return []; }
  };

  const handleRegister = async () => {
    if (!registerName.trim() || registerCpf.length < 4) {
      Alert.alert("Erro", "Preencha Nome e os 4 dígitos do CPF.");
      return;
    }
    const users = await getUsers();
    const exists = users.find(u => u.cpf === registerCpf);
    if (exists) {
      Alert.alert("Erro", "Este CPF já está cadastrado.");
      return;
    }
    const newUser = { name: registerName.trim(), cpf: registerCpf };
    users.push(newUser);
    await AsyncStorage.setItem('@abc_users_db', JSON.stringify(users));
    Alert.alert("Sucesso", "Cadastro realizado com sucesso!");
    setLoginName(newUser.name);
    setRegisterName('');
    setRegisterCpf('');
    setScreen('login');
  };

  const handleLogin = async () => {
    if (!loginName.trim() || loginCpf.length < 4) {
      Alert.alert("Atenção", "Preencha Nome e CPF corretamente.");
      return;
    }
    const users = await getUsers();
    const foundUser = users.find(u => u.cpf === loginCpf);
    if (!foundUser) {
      Alert.alert("Acesso Negado", "CPF não encontrado ou incorreto.");
      return;
    }
    if (foundUser.name.toLowerCase() !== loginName.trim().toLowerCase()) {
      Alert.alert("Acesso Negado", "O Nome digitado não confere com este CPF.");
      return;
    }
    setUser(foundUser);
    if (rememberName) {
      await AsyncStorage.setItem('@abc_saved_name', foundUser.name);
    } else {
      await AsyncStorage.removeItem('@abc_saved_name');
    }
    await loadLocalData(foundUser.cpf);
    setScreen('home');
  };

  const handleLogout = () => {
    setLoginCpf('');
    setUser({ name: '', cpf: '' });
    setScreen('login');
  };

  const exportBackup = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const backupData = {};
      items.forEach(([key, value]) => {
        backupData[key] = value;
      });
      const jsonString = JSON.stringify(backupData);
      const fileUri = FileSystem.documentDirectory + 'abc_controle_chamados_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Salvar Backup' });
    } catch (e) {
      Alert.alert("Erro", "Falha ao gerar o arquivo de backup.");
    }
  };

  const importBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      const jsonString = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const backupData = JSON.parse(jsonString);
      const kvPairs = Object.entries(backupData);
      await AsyncStorage.multiSet(kvPairs);
      Alert.alert("Sucesso", "Backup restaurado! O aplicativo será desconectado para carregar os novos dados.");
      handleLogout();
    } catch (e) {
      Alert.alert("Erro", "Arquivo de backup inválido ou corrompido.");
    }
  };

  const addService = () => {
    if (tempService.trim() === '') return;
    setServicesList([...servicesList, tempService]);
    setTempService('');
  };

  const removeService = (index) => {
    const newList = [...servicesList];
    newList.splice(index, 1);
    setServicesList(newList);
  };

  const addUsedMaterial = () => {
    if (tempUsedMaterial.trim() === '') return;
    setUsedMaterialsList([...usedMaterialsList, tempUsedMaterial.trim()]);
    setTempUsedMaterial('');
  };

  const removeUsedMaterial = (index) => {
    const newList = [...usedMaterialsList];
    newList.splice(index, 1);
    setUsedMaterialsList(newList);
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permissão Negada", "Você precisa permitir o uso da câmera.");
        return;
      }
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotos(currentPhotos => [...currentPhotos, { uri: result.assets[0].uri, observation: '' }]);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível tirar a foto.");
    }
  };

  const openPhotoEdit = (index) => {
    setSelectedPhotoIndex(index);
    setTempObservation(photos[index].observation || '');
    setPhotoModalVisible(true);
  };

  const savePhotoObservation = () => {
    const updatedPhotos = [...photos];
    updatedPhotos[selectedPhotoIndex].observation = tempObservation;
    setPhotos(updatedPhotos);
    setPhotoModalVisible(false);
    setSelectedPhotoIndex(null);
  };

  const deletePhoto = () => {
    const updatedPhotos = photos.filter((_, i) => i !== selectedPhotoIndex);
    setPhotos(updatedPhotos);
    setPhotoModalVisible(false);
    setSelectedPhotoIndex(null);
  };

  const initiateSignature = (type) => {
    if (type === 'resp' && !respName) {
      Alert.alert("Erro", "Preencha o nome do Responsável primeiro.");
      return;
    }
    setIsSigning(type);
    setSignerId('');
    setShowSignInput(true);
  };

  const validateSignerId = async () => {
    const len = signerId.length;
    if (len >= 4) {
      setShowSignInput(false);
      if (Platform.OS !== 'web') {
        try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE); } catch (e) { }
      }
    } else {
      Alert.alert("Inválido", "Informe uma senha válida.");
    }
  };

  const handleSignatureOK = async (signature) => {
    if (isSigning === 'tech') setTechSignature(signature);
    if (isSigning === 'resp') setRespSignature(signature);
    setIsSigning(null);
    setSignerId('');
    if (Platform.OS !== 'web') {
      try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); } catch (e) { }
    }
  };

  const openEditClient = (clientObj) => {
    setEditingClientId(clientObj.id);
    setNewClientName(clientObj.name);
    setNewClientUnit(clientObj.unit);
    setClientModalVisible(true);
  };

  const handleSaveClient = async () => {
    if (!newClientName || !newClientUnit) {
      Alert.alert("Erro", "Preencha Nome e Local.");
      return;
    }
    let updatedClients;
    if (editingClientId) {
      updatedClients = clientsDb.map(c =>
        c.id === editingClientId
          ? { ...c, name: newClientName, unit: newClientUnit }
          : c
      );
    } else {
      const newClient = {
        id: Date.now().toString(),
        name: newClientName,
        unit: newClientUnit
      };
      updatedClients = [newClient, ...clientsDb];
    }
    setClientsDb(updatedClients);
    await AsyncStorage.setItem('@abc_requesters_db', JSON.stringify(updatedClients));
    setClientModalVisible(false);
    setNewClientName('');
    setNewClientUnit('');
    setEditingClientId(null);
  };

  const handleDeleteClient = async (id) => {
    const updated = clientsDb.filter(c => c.id !== id);
    setClientsDb(updated);
    await AsyncStorage.setItem('@abc_requesters_db', JSON.stringify(updated));
  };

  const selectClientForOs = (c) => {
    if (screen === 'budget') {
      setBudgetClient(c.name);
      setBudgetUnit(c.unit);
    } else {
      setClient(c.name);
      setUnit(c.unit);
    }
    setSelectClientModal(false);
  };

  const addBudgetMaterial = () => {
    if (budgetTempMaterial.trim() === '') return;
    setBudgetMaterials([...budgetMaterials, budgetTempMaterial.trim()]);
    setBudgetTempMaterial('');
  };

  const removeBudgetMaterial = (index) => {
    const updated = [...budgetMaterials];
    updated.splice(index, 1);
    setBudgetMaterials(updated);
  };

  const pickBudgetImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permissão Negada", "Você precisa permitir o uso da câmera.");
        return;
      }
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setBudgetPhotos(currentPhotos => [...currentPhotos, { uri: result.assets[0].uri, observation: '' }]);
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível tirar a foto.");
    }
  };

  const openBudgetPhotoEdit = (index) => {
    setSelectedBudgetPhotoIndex(index);
    setTempBudgetObservation(budgetPhotos[index].observation || '');
    setBudgetPhotoModalVisible(true);
  };

  const saveBudgetPhotoObservation = () => {
    const updatedPhotos = [...budgetPhotos];
    updatedPhotos[selectedBudgetPhotoIndex].observation = tempBudgetObservation;
    setBudgetPhotos(updatedPhotos);
    setBudgetPhotoModalVisible(false);
    setSelectedBudgetPhotoIndex(null);
  };

  const deleteBudgetPhoto = () => {
    const updatedPhotos = budgetPhotos.filter((_, i) => i !== selectedBudgetPhotoIndex);
    setBudgetPhotos(updatedPhotos);
    setBudgetPhotoModalVisible(false);
    setSelectedBudgetPhotoIndex(null);
  };

  const clearBudgetForm = () => {
    setBudgetClient('');
    setBudgetUnit('');
    setBudgetRespName('');
    setBudgetNeed('');
    setBudgetTempMaterial('');
    setBudgetMaterials([]);
    setBudgetPhotos([]);
  };

  const getLogoBase64 = async () => {
    try {
      const asset = Asset.fromModule(LOGO_SOURCE);
      await asset.downloadAsync();
      const tempPath = FileSystem.cacheDirectory + 'logo_temporaria_pdf.png';
      await FileSystem.downloadAsync(asset.uri, tempPath);
      const base64 = await FileSystem.readAsStringAsync(tempPath, { encoding: 'base64' });
      return `data:image/png;base64,${base64}`;
    } catch (e) {
      return '';
    }
  };

  const finishOS = async () => {
    if (!client || !unit || !respSignature || !techSignature || servicesList.length === 0) {
      Alert.alert("Pendência", "Preencha todos os campos e colete as assinaturas.");
      return;
    }

    try {
      const osData = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        client, unit, respName,
        techName: user.name,
        techCpf: user.cpf,
        services: servicesList,
        materialsUsed: usedMaterialsList,
        photos: photos,
        checklist,
        techSign: techSignature,
        respSign: respSignature
      };

      const newHistory = [osData, ...osHistory];
      setOsHistory(newHistory);

      await AsyncStorage.setItem(`@abc_calls_history_${user.cpf}`, JSON.stringify(newHistory));

      Alert.alert("Sucesso", "Chamado salvo no dispositivo!");
      await generatePDF(osData);
      clearForm();
      setScreen('home');

    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o documento.");
    }
  };

  const clearForm = () => {
    setClient(''); setUnit(''); setRespName('');
    setServicesList([]); setTempService('');
    setUsedMaterialsList([]); setTempUsedMaterial('');
    setPhotos([]);
    setTechSignature(null); setRespSignature(null);
    setChecklist({ registro: false, local: false, evidencias: false });
  };

  const generatePDF = async (data) => {
    try {
      const logoBase64 = await getLogoBase64();
      const logoImg = logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : ``;
      const safeText = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br />');

      const photosHtmlArray = await Promise.all(data.photos.map(async (p) => {
        try {
          const b64 = await FileSystem.readAsStringAsync(p.uri, { encoding: 'base64' });
          return `<div class="photo-container"><img src="data:image/jpeg;base64,${b64}" class="photo" /><div class="photo-obs">${safeText(p.observation || 'Sem observação')}</div></div>`;
        } catch (e) {
          return '';
        }
      }));
      const photosHtml = photosHtmlArray.join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: white; color: #201F1E; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0078D4; padding-bottom: 15px; }
              .logo-container { width: 100%; display: flex; justify-content: center; margin-bottom: 10px; }
              .logo-img { max-width: 100px; height: auto; object-fit: contain; }
              .title { font-size: 20px; font-weight: 600; color: #0078D4; text-transform: uppercase; margin-top: 5px; }
              .crea { font-size: 12px; font-weight: 600; color: #605E5C; margin-top: 2px; }
              .meta { color: #605E5C; font-size: 11px; margin-top: 4px; }
              .section { margin-top: 15px; border: 1px solid #EDEBE9; padding: 15px; border-radius: 4px; background-color: #FAFAFA; }
              .sec-title { font-size: 13px; font-weight: 600; color: #0078D4; margin-bottom: 10px; text-transform: uppercase; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: #201F1E; border-bottom: 1px solid #F3F2F1; padding-bottom: 4px; }
              .label { font-weight: 600; color: #323130; }
              .list-item { border-bottom: 1px solid #F3F2F1; padding: 6px 0; font-size: 12px; color: #201F1E; }
              .safety-tag { font-size: 10px; font-weight: bold; color: #107C10; margin-right: 10px; }
              .img-grid { display: block; text-align: center; margin-top: 10px; }
              .photo-container { display: inline-block; vertical-align: top; width: 45%; margin: 10px 2%; page-break-inside: avoid; break-inside: avoid; }
              img.photo { width: 100%; height: 180px; object-fit: contain; border: 1px solid #EDEBE9; border-radius: 4px; background-color: #fff; padding: 4px; display: block; }
              .photo-obs { font-size: 11px; color: #323130; margin-top: 8px; background-color: #F3F2F1; padding: 8px; border-radius: 4px; border-left: 4px solid #0078D4; text-align: left; }
              .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; break-inside: avoid; }
              .sign-box { width: 45%; text-align: center; }
              .sign-img { width: 100%; height: 70px; object-fit: contain; border-bottom: 1px solid #323130; margin-bottom: 5px; }
              .sign-name { font-weight: 600; font-size: 12px; color: #201F1E; }
              .sign-role { font-size: 11px; color: #605E5C; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-container">${logoImg}</div>
              <div class="title">${EMPRESA_NOME}</div>
              <div class="meta">Chamado #${data.id.slice(-6)} | Criado em: ${safeText(data.date)}</div>
            </div>
            <div class="section">
              <div class="sec-title">Checklist do Atendimento</div>
              <div style="display:flex;">
                  <span class="safety-tag">${data.checklist?.registro ? '[V] REGISTRO CONFERIDO' : ''}</span>
                  <span class="safety-tag">${data.checklist?.local ? '[V] LOCAL VALIDADO' : ''}</span>
                  <span class="safety-tag">${data.checklist?.evidencias ? '[V] EVIDÊNCIAS ANEXADAS' : ''}</span>
              </div>
            </div>
            <div class="section">
              <div class="sec-title">Dados do Chamado</div>
              <div class="row"><span class="label">Solicitante:</span> <span>${safeText(data.client)}</span></div>
              <div class="row"><span class="label">Local:</span> <span>${safeText(data.unit)}</span></div>
              <div class="row"><span class="label">Responsável no local:</span> <span>${safeText(data.respName)}</span></div>
            </div>
            <div class="section">
              <div class="sec-title">Atendimento Realizado</div>
              ${data.services.map(s => `<div class="list-item">&#8226; ${safeText(s)}</div>`).join('')}
            </div>
            <div class="section">
              <div class="sec-title">Recursos Utilizados</div>
              ${(data.materialsUsed || []).length > 0 ? (data.materialsUsed || []).map(m => `<div class="list-item">&#8226; ${safeText(m)}</div>`).join('') : '<div class="list-item">Nenhum recurso informado.</div>'}
            </div>
            <div class="section">
              <div class="sec-title">Anexos Fotográficos</div>
              <div class="img-grid">
                ${photosHtml}
              </div>
            </div>
            <div class="signatures">
              <div class="sign-box"><img src="${data.respSign}" class="sign-img" /><div class="sign-name">${safeText(data.respName)}</div><div class="sign-role">Confirmação do Solicitante</div></div>
              <div class="sign-box"><img src="${data.techSign}" class="sign-img" /><div class="sign-name">${safeText(data.techName)}</div><div class="sign-role">Responsável pelo Atendimento</div></div>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Erro no PDF", "Não foi possível gerar o arquivo PDF.");
    }
  };

  const generateBudgetPDF = async () => {
    if (!budgetClient || !budgetUnit || !budgetNeed.trim() || budgetMaterials.length === 0) {
      Alert.alert("Pendência", "Preencha solicitante, local, descrição da necessidade e ao menos um recurso.");
      return;
    }

    try {
      const budgetData = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        client: budgetClient,
        unit: budgetUnit,
        respName: budgetRespName,
        need: budgetNeed,
        materials: budgetMaterials,
        photos: budgetPhotos,
        techName: user.name,
        techCpf: user.cpf
      };

      const logoBase64 = await getLogoBase64();
      const logoImg = logoBase64 ? `<img src="${logoBase64}" class="logo-img" />` : ``;
      const safeText = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br />');

      const photosHtmlArray = await Promise.all(budgetData.photos.map(async (p) => {
        try {
          const b64 = await FileSystem.readAsStringAsync(p.uri, { encoding: 'base64' });
          return `<div class="photo-container"><img src="data:image/jpeg;base64,${b64}" class="photo" /><div class="photo-obs">${safeText(p.observation || 'Sem nota')}</div></div>`;
        } catch (e) {
          return '';
        }
      }));
      const photosHtml = photosHtmlArray.join('') || '<div class="empty">Sem anexos fotográficos.</div>';

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: white; color: #201F1E; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #107C10; padding-bottom: 15px; }
              .logo-container { width: 100%; display: flex; justify-content: center; margin-bottom: 10px; }
              .logo-img { max-width: 100px; height: auto; object-fit: contain; }
              .title { font-size: 20px; font-weight: 700; color: #107C10; text-transform: uppercase; margin-top: 5px; }
              .subtitle { font-size: 13px; font-weight: 600; color: #323130; margin-top: 5px; }
              .meta { color: #605E5C; font-size: 11px; margin-top: 4px; }
              .section { margin-top: 15px; border: 1px solid #EDEBE9; padding: 15px; border-radius: 4px; background-color: #FAFAFA; }
              .sec-title { font-size: 13px; font-weight: 700; color: #107C10; margin-bottom: 10px; text-transform: uppercase; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; border-bottom: 1px solid #F3F2F1; padding-bottom: 4px; }
              .label { font-weight: 700; color: #323130; }
              .text-box { font-size: 12px; line-height: 1.5; color: #201F1E; white-space: pre-wrap; }
              .list-item { border-bottom: 1px solid #F3F2F1; padding: 7px 0; font-size: 12px; color: #201F1E; }
              .img-grid { display: block; text-align: center; margin-top: 10px; }
              .photo-container { display: inline-block; vertical-align: top; width: 45%; margin: 10px 2%; page-break-inside: avoid; break-inside: avoid; }
              img.photo { width: 100%; height: 180px; object-fit: contain; border: 1px solid #EDEBE9; border-radius: 4px; background-color: #fff; padding: 4px; display: block; }
              .photo-obs { font-size: 11px; color: #323130; margin-top: 8px; background-color: #F3F2F1; padding: 8px; border-radius: 4px; border-left: 4px solid #107C10; text-align: left; }
              .empty { font-size: 12px; color: #605E5C; text-align: left; }
              .footer { margin-top: 30px; font-size: 11px; color: #605E5C; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo-container">${logoImg}</div>
              <div class="title">Solicitação de Recursos</div>
              <div class="subtitle">${EMPRESA_NOME}</div>
              <div class="meta">Solicitação #${budgetData.id.slice(-6)} | Criada em: ${safeText(budgetData.date)}</div>
            </div>
            <div class="section">
              <div class="sec-title">Dados da Solicitação</div>
              <div class="row"><span class="label">Solicitante:</span> <span>${safeText(budgetData.client)}</span></div>
              <div class="row"><span class="label">Local:</span> <span>${safeText(budgetData.unit)}</span></div>
              <div class="row"><span class="label">Responsável no local:</span> <span>${safeText(budgetData.respName || 'Não informado')}</span></div>
              <div class="row"><span class="label">Responsável pelo chamado:</span> <span>${safeText(budgetData.techName)}</span></div>
            </div>
            <div class="section">
              <div class="sec-title">Necessidade Identificada</div>
              <div class="text-box">${safeText(budgetData.need)}</div>
            </div>
            <div class="section">
              <div class="sec-title">Recursos Necessários</div>
              ${budgetData.materials.map(m => `<div class="list-item">&#8226; ${safeText(m)}</div>`).join('')}
            </div>
            <div class="section">
              <div class="sec-title">Anexos Fotográficos</div>
              <div class="img-grid">
                ${photosHtml}
              </div>
            </div>
            <div class="footer">Documento gerado pelo Controle de Chamados ABC.</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      Alert.alert("Sucesso", "Solicitação de recursos exportada em PDF.");
    } catch (error) {
      Alert.alert("Erro no PDF", "Não foi possível gerar a solicitação de recursos.");
    }
  };

  const moveToTrash = async (id) => {
    const item = osHistory.find(i => i.id === id);
    const newHistory = osHistory.filter(i => i.id !== id);
    const newTrash = [item, ...osTrash];
    setOsHistory(newHistory);
    setOsTrash(newTrash);
    await AsyncStorage.setItem(`@abc_calls_history_${user.cpf}`, JSON.stringify(newHistory));
    await AsyncStorage.setItem(`@abc_calls_trash_${user.cpf}`, JSON.stringify(newTrash));
  };

  const deletePermanently = async (id) => {
    const newTrash = osTrash.filter(i => i.id !== id);
    setOsTrash(newTrash);
    await AsyncStorage.setItem(`@abc_calls_trash_${user.cpf}`, JSON.stringify(newTrash));
  };

  const restoreFromTrash = async (id) => {
    const item = osTrash.find(i => i.id === id);
    const newTrash = osTrash.filter(i => i.id !== id);
    const newHistory = [item, ...osHistory];
    setOsTrash(newTrash);
    setOsHistory(newHistory);
    await AsyncStorage.setItem(`@abc_calls_trash_${user.cpf}`, JSON.stringify(newTrash));
    await AsyncStorage.setItem(`@abc_calls_history_${user.cpf}`, JSON.stringify(newHistory));
  };

  const initiateReopen = (item) => {
    setOsToReopen(item);
    setReopenCpf('');
    setReopenModalVisible(true);
  };

  const confirmReopen = () => {
    if (reopenCpf !== user.cpf) {
      Alert.alert("Acesso Negado", "Senha (CPF) incorreta.");
      return;
    }
    if (!osToReopen) return;
    setClient(osToReopen.client);
    setUnit(osToReopen.unit);
    setRespName(osToReopen.respName);
    setServicesList(osToReopen.services);
    setUsedMaterialsList(osToReopen.materialsUsed || []);
    setPhotos(osToReopen.photos || []);
    setChecklist(osToReopen.checklist || { registro: false, local: false, evidencias: false });
    setTechSignature(null);
    setRespSignature(null);
    setReopenModalVisible(false);
    setOsToReopen(null);
    setScreen('form');
  };

  if (!fontsLoaded || screen === 'loading') {
    return <View style={styles.centerLoad}><Text style={{ color: '#0078D4', fontFamily: 'Poppins_600SemiBold' }}>Carregando sistema...</Text></View>;
  }

  if (screen === 'expired') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F2F1" />
        <SafeAreaView style={styles.loginSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginKeyboard}>
            <View style={styles.loginHeader}>
              <Ionicons name="lock-closed" size={60} color="#D13438" />
              <Text style={[styles.loginTitle, { color: '#D13438', marginTop: 15 }]}>Licença Expirada</Text>
              <Text style={[styles.loginSubtitle, { textAlign: 'center' }]}>O período de avaliação chegou ao fim. Por favor, insira a chave de ativação para continuar.</Text>
              <Text style={{ fontSize: 10, color: '#A19F9D', marginTop: 10 }}>ID do Aparelho: {deviceId}</Text>
            </View>
            <View style={styles.loginForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chave de Ativação</Text>
                <TextInput style={styles.loginInput} value={unlockCode} onChangeText={setUnlockCode} placeholder="Insira o código" placeholderTextColor="#A19F9D" autoCapitalize="characters" />
              </View>
              <TouchableOpacity style={styles.btnLogin} onPress={handleUnlock}>
                <Text style={styles.btnLoginText}>VALIDAR LICENÇA</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  if (screen === 'register') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F2F1" />
        <SafeAreaView style={styles.loginSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginKeyboard}>
            <View style={styles.loginHeader}>
              <Image source={LOGO_SOURCE} style={styles.loginLogo} resizeMode="contain" />
              <Text style={styles.loginTitle}>Novo Cadastro</Text>
              <Text style={styles.loginSubtitle}>Crie suas credenciais de acesso</Text>
            </View>
            <View style={styles.loginForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <TextInput style={styles.loginInput} value={registerName} onChangeText={setRegisterName} placeholder="Insira seu nome" placeholderTextColor="#A19F9D" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Senha de Acesso (CPF 4 dígitos)</Text>
                <TextInput style={styles.loginInput} keyboardType="numeric" maxLength={4} value={registerCpf} onChangeText={t => { setRegisterCpf(t); if (t.length === 4) Keyboard.dismiss(); }} placeholder="0000" placeholderTextColor="#A19F9D" />
              </View>
              <TouchableOpacity style={styles.btnLogin} onPress={handleRegister}>
                <Text style={styles.btnLoginText}>Salvar Cadastro</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setScreen('login')} style={styles.cleanLogoutBtn}>
              <Text style={styles.cleanLogoutText}>Voltar para entrada</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  if (screen === 'login') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F2F1" />
        <SafeAreaView style={styles.loginSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.loginKeyboard}>
            <View style={styles.loginHeader}>
              <Image source={LOGO_SOURCE} style={styles.loginLogo} resizeMode="contain" />
              <Text style={styles.loginTitle}>Bem-Vindo</Text>
              <Text style={styles.loginSubtitle}>Controle de Chamados de Informática</Text>
            </View>
            <View style={styles.loginForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Usuário</Text>
                <TextInput style={styles.loginInput} value={loginName} onChangeText={setLoginName} placeholder="Nome registrado" placeholderTextColor="#A19F9D" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Senha</Text>
                <TextInput style={styles.loginInput} keyboardType="numeric" maxLength={4} value={loginCpf} onChangeText={t => { setLoginCpf(t); if (t.length === 4) Keyboard.dismiss(); }} placeholder="****" placeholderTextColor="#A19F9D" secureTextEntry />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Manter conectado</Text>
                <Switch value={rememberName} onValueChange={setRememberName} trackColor={{ false: "#EDEBE9", true: "#8BD6FF" }} thumbColor={rememberName ? "#0078D4" : "#FFFFFF"} />
              </View>
              <TouchableOpacity style={styles.btnLogin} onPress={handleLogin}>
                <Text style={styles.btnLoginText}>Avançar</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.loginFooter}>
              <TouchableOpacity onPress={() => setScreen('register')} style={{ padding: 10 }}>
                <Text style={{ color: '#0078D4', fontFamily: 'Poppins_600SemiBold' }}>Não possui conta? Criar uma!</Text>
              </TouchableOpacity>
              <Text style={styles.copyrightText}>Controle de Chamados TI {'™'}</Text>
              <Text style={styles.copyrightText}>{'©'} BzYuriDev - 2026</Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  if (screen === 'home') {
    const totalOS = osHistory.length;
    const todayStr = new Date().toLocaleDateString();
    const osToday = osHistory.filter(o => o.date.includes(todayStr.split(' ')[0])).length;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
        <StatusBar barStyle="dark-content" />

        {trialDaysLeft >= 0 && (
          <View style={{ backgroundColor: '#FFF4CE', padding: 10, alignItems: 'center', borderBottomWidth: 1, borderColor: '#FDE7E9' }}>
            <Text style={{ color: '#9F6000', fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>
              Versão de Avaliação: Restam {trialDaysLeft} dias
            </Text>
          </View>
        )}

        <View style={styles.homeHeader}>
          <View style={styles.headerUserRow}>
            <View>
              <Text style={styles.headerWelcome}>Olá,</Text>
              <Text style={styles.headerUser}>{user.name}</Text>
            </View>
            <Image source={LOGO_SOURCE} style={styles.logoSmall} resizeMode="contain" />
          </View>
        </View>

        <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuContainer}>
          <View style={styles.dashboardCard}>
            <View style={styles.dashHeaderRow}>
              <Ionicons name="analytics" size={18} color="#0078D4" />
              <Text style={styles.dashTitle}>Visão Geral</Text>
            </View>
            <View style={styles.dashRow}>
              <View style={styles.dashItem}>
                <Text style={styles.dashNumber}>{osToday}</Text>
                <Text style={styles.dashLabel}>Hoje</Text>
              </View>
              <View style={styles.dashDivider} />
              <View style={styles.dashItem}>
                <Text style={styles.dashNumber}>{totalOS}</Text>
                <Text style={styles.dashLabel}>Total</Text>
              </View>
              <View style={styles.dashDivider} />
              <View style={styles.dashItem}>
                <Text style={[styles.dashNumber, { color: '#D13438' }]}>{osTrash.length}</Text>
                <Text style={styles.dashLabel}>Lixeira</Text>
              </View>
            </View>
          </View>

          <Text style={styles.menuSectionTitle}>Ações Principais</Text>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setScreen('form')}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1DFDD' }]}>
              <Ionicons name="add" size={24} color="#201F1E" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Novo Chamado</Text>
              <Text style={styles.menuDesc}>Registrar um novo atendimento</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setScreen('budget')}>
            <View style={[styles.iconContainer, { backgroundColor: '#E7F6E7' }]}>
              <Ionicons name="calculator-outline" size={22} color="#107C10" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Solicitação de Recursos</Text>
              <Text style={styles.menuDesc}>Fotos e recursos necessários</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setScreen('clients')}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1DFDD' }]}>
              <Ionicons name="people-outline" size={22} color="#201F1E" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Solicitantes</Text>
              <Text style={styles.menuDesc}>Gerenciar pessoas e locais</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setScreen('history')}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1DFDD' }]}>
              <Ionicons name="folder-outline" size={22} color="#201F1E" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Chamados Salvos</Text>
              <Text style={styles.menuDesc}>Consultar atendimentos registrados</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setScreen('trash')}>
            <View style={[styles.iconContainer, { backgroundColor: '#FDE7E9' }]}>
              <Ionicons name="trash-outline" size={22} color="#D13438" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Itens Excluídos</Text>
              <Text style={styles.menuDesc}>Gerenciar lixeira</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>

          <Text style={[styles.menuSectionTitle, { marginTop: 15 }]}>Sistema</Text>
          {trialDaysLeft >= 0 && (
            <TouchableOpacity style={styles.menuBtn} onPress={() => setActivationModalVisible(true)}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFF4CE' }]}>
                <Ionicons name="key-outline" size={22} color="#9F6000" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Ativar Licença</Text>
                <Text style={styles.menuDesc}>Remover limite de tempo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.menuBtn} onPress={exportBackup}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1DFDD' }]}>
              <Ionicons name="cloud-upload-outline" size={22} color="#0078D4" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Fazer Backup</Text>
              <Text style={styles.menuDesc}>Salvar dados no dispositivo/nuvem</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={importBackup}>
            <View style={[styles.iconContainer, { backgroundColor: '#E1DFDD' }]}>
              <Ionicons name="cloud-download-outline" size={22} color="#0078D4" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>Restaurar Backup</Text>
              <Text style={styles.menuDesc}>Puxar dados arquivados</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A19F9D" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={styles.btnLogout}>
            <Text style={styles.btnLogoutText}>Sair do Sistema</Text>
          </TouchableOpacity>
          <Text style={styles.copyrightText}>Controle de Chamados TI {'™'}</Text>
              <Text style={styles.copyrightText}>{'©'} BzYuriDev - 2026</Text>
          <View style={{ height: 40 }} />
        </ScrollView>

        <Modal visible={activationModalVisible} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ativar Sistema</Text>
                <Text style={styles.modalDesc}>Insira a chave de ativação</Text>
                <TextInput style={styles.modalInput} value={unlockCode} onChangeText={setUnlockCode} placeholder="Chave de Ativação" autoCapitalize="characters" />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setActivationModalVisible(false)} style={styles.modalCancel}><Text style={{ fontFamily: 'Poppins_400Regular' }}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleUnlock} style={styles.modalConfirm}><Text style={{ color: 'white', fontFamily: 'Poppins_600SemiBold' }}>Ativar</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'budget') {
    return (
      <SafeAreaView style={styles.formSafe}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={24} color="#0078D4" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Solicitação de Recursos</Text>
          <TouchableOpacity onPress={clearBudgetForm} style={styles.navBtn}>
            <Ionicons name="refresh-outline" size={22} color="#605E5C" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.formScroll}>
          <View style={styles.formSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Informações Gerais</Text>
              <TouchableOpacity onPress={() => setSelectClientModal(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="search" size={16} color="#0078D4" />
                <Text style={{ color: '#0078D4', fontSize: 12, fontFamily: 'Poppins_600SemiBold', marginLeft: 4 }}>Buscar solicitante</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={styles.formInput} value={budgetClient} onChangeText={setBudgetClient} placeholder="Solicitante" placeholderTextColor="#A19F9D" />
            <TextInput style={styles.formInput} value={budgetUnit} onChangeText={setBudgetUnit} placeholder="Local" placeholderTextColor="#A19F9D" />
            <TextInput style={styles.formInput} value={budgetRespName} onChangeText={setBudgetRespName} placeholder="Responsável no local" placeholderTextColor="#A19F9D" />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Necessidade identificada</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={budgetNeed}
              onChangeText={setBudgetNeed}
              placeholder="Descreva o chamado, o problema identificado e os recursos necessários..."
              placeholderTextColor="#A19F9D"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Recursos necessários</Text>
            <View style={styles.rowInput}>
              <TextInput
                style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                value={budgetTempMaterial}
                onChangeText={setBudgetTempMaterial}
                placeholder="Ex: equipamento, acesso, material..."
                placeholderTextColor="#A19F9D"
                onSubmitEditing={addBudgetMaterial}
              />
              <TouchableOpacity onPress={addBudgetMaterial} style={styles.btnAdd}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 15 }}>
              {budgetMaterials.map((m, i) => (
                <View key={i} style={styles.serviceItem}>
                  <Text style={styles.serviceText}>{m}</Text>
                  <TouchableOpacity onPress={() => removeBudgetMaterial(i)}>
                    <Ionicons name="close" size={20} color="#D13438" />
                  </TouchableOpacity>
                </View>
              ))}
              {budgetMaterials.length === 0 && (
                <Text style={styles.emptyHint}>Nenhum material adicionado.</Text>
              )}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Evidências do chamado</Text>
            <ScrollView horizontal style={styles.photoList}>
              <TouchableOpacity onPress={pickBudgetImage} style={styles.photoAddBtn}>
                <Ionicons name="camera-outline" size={28} color="#0078D4" />
              </TouchableOpacity>
              {budgetPhotos.map((p, i) => (
                <TouchableOpacity key={i} onPress={() => openBudgetPhotoEdit(i)}>
                  <Image source={{ uri: p.uri }} style={styles.thumbPhoto} />
                  {p.observation ? <View style={styles.obsBadge}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={[styles.btnFinalize, { backgroundColor: '#107C10' }]} onPress={generateBudgetPDF}>
            <Text style={styles.btnFinalizeText}>Exportar solicitação em PDF</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={selectClientModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Selecionar solicitante</Text>
              <FlatList
                data={clientsDb}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.osCard} onPress={() => selectClientForOs(item)}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#201F1E', fontSize: 14 }}>{item.name}</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', color: '#605E5C', fontSize: 12 }}>Local: {item.unit}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyHint}>Nenhum solicitante cadastrado.</Text>}
              />
              <TouchableOpacity onPress={() => setSelectClientModal(false)} style={[styles.modalCancel, { marginTop: 15 }]}>
                <Text style={{ color: '#201F1E', fontFamily: 'Poppins_400Regular' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={budgetPhotoModalVisible} transparent animationType="slide" supportedOrientations={['portrait', 'landscape']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
                <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                  <TouchableOpacity onPress={Keyboard.dismiss} style={{ alignSelf: 'flex-end', padding: 5 }}>
                    <Ionicons name="chevron-down" size={24} color="#605E5C" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Evidência do chamado</Text>
                  {selectedBudgetPhotoIndex !== null && budgetPhotos[selectedBudgetPhotoIndex] && (
                    <Image source={{ uri: budgetPhotos[selectedBudgetPhotoIndex].uri }} style={{ width: '100%', height: 200, borderRadius: 4, marginBottom: 15, borderWidth: 1, borderColor: '#EDEBE9' }} resizeMode="cover" />
                  )}
                  <Text style={[styles.inputLabel, { alignSelf: 'flex-start', color: '#605E5C' }]}>Observação da foto</Text>
                  <View style={styles.commentBoxUI}>
                    <TextInput style={styles.modalInputBox} placeholder="Ex: ponto danificado, local de instalação, medida..." placeholderTextColor="#A19F9D" multiline value={tempBudgetObservation} onChangeText={setTempBudgetObservation} />
                  </View>
                  <View style={[styles.modalActions, { width: '100%' }]}>
                    <TouchableOpacity onPress={deleteBudgetPhoto} style={styles.modalCancel}>
                      <Text style={{ color: '#D13438', fontFamily: 'Poppins_400Regular' }}>Excluir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={saveBudgetPhotoObservation} style={styles.modalConfirm}>
                      <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setBudgetPhotoModalVisible(false)} style={{ marginTop: 20 }}>
                    <Text style={{ color: '#605E5C', fontFamily: 'Poppins_400Regular' }}>Voltar</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'clients') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.navBtn}><Ionicons name="arrow-back" size={24} color="#0078D4" /></TouchableOpacity>
          <Text style={styles.navTitle}>Solicitantes</Text>
          <TouchableOpacity onPress={() => {
            setEditingClientId(null);
            setNewClientName('');
            setNewClientUnit('');
            setClientModalVisible(true);
          }} style={styles.navBtn}><Ionicons name="add" size={24} color="#0078D4" /></TouchableOpacity>
        </View>
        <FlatList
          data={clientsDb}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#A19F9D', marginTop: 20, fontFamily: 'Poppins_400Regular' }}>Nenhum solicitante cadastrado.</Text>}
          renderItem={({ item }) => (
            <View style={styles.osCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#201F1E', fontSize: 14 }}>{item.name}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => openEditClient(item)} style={{ marginRight: 15 }}><Ionicons name="pencil" size={18} color="#0078D4" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteClient(item.id)}><Ionicons name="trash" size={18} color="#D13438" /></TouchableOpacity>
                </View>
              </View>
              <Text style={{ fontFamily: 'Poppins_400Regular', color: '#605E5C', fontSize: 12, marginTop: 4 }}>Local: {item.unit}</Text>
            </View>
          )}
        />
        <Modal visible={clientModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingClientId ? 'Editar solicitante' : 'Novo solicitante'}</Text>
                <TextInput style={styles.formInput} value={newClientName} onChangeText={setNewClientName} placeholder="Nome do solicitante" placeholderTextColor="#A19F9D" />
                <TextInput style={styles.formInput} value={newClientUnit} onChangeText={setNewClientUnit} placeholder="Local ou setor" placeholderTextColor="#A19F9D" />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => {
                    setClientModalVisible(false);
                    setEditingClientId(null);
                  }} style={styles.modalCancel}><Text style={{ color: '#201F1E', fontFamily: 'Poppins_400Regular' }}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={handleSaveClient} style={styles.modalConfirm}><Text style={{ color: 'white', fontFamily: 'Poppins_600SemiBold' }}>Salvar</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'form') {
    return (
      <SafeAreaView style={styles.formSafe}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => setScreen('home')} style={styles.navBtn}>
            <Ionicons name="arrow-back" size={24} color="#0078D4" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Novo Chamado</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.formScroll}>
          <View style={styles.formSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Informações Gerais</Text>
              <TouchableOpacity onPress={() => setSelectClientModal(true)} style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name="search" size={16} color="#0078D4" /><Text style={{ color: '#0078D4', fontSize: 12, fontFamily: 'Poppins_600SemiBold', marginLeft: 4 }}>Buscar solicitante</Text></TouchableOpacity>
            </View>
            <TextInput style={styles.formInput} value={client} onChangeText={setClient} placeholder="Solicitante" placeholderTextColor="#A19F9D" />
            <TextInput style={styles.formInput} value={unit} onChangeText={setUnit} placeholder="Local ou setor" placeholderTextColor="#A19F9D" />
            <TextInput style={styles.formInput} value={respName} onChangeText={setRespName} placeholder="Responsável no local" placeholderTextColor="#A19F9D" />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Checklist do Atendimento</Text>
            <TouchableOpacity onPress={() => setChecklist({ ...checklist, registro: !checklist.registro })} style={styles.checkItem}>
              <Ionicons name={checklist.registro ? "checkbox" : "square-outline"} size={22} color={checklist.registro ? "#107C10" : "#A19F9D"} />
              <Text style={styles.checkText}>Dados do chamado conferidos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChecklist({ ...checklist, local: !checklist.local })} style={styles.checkItem}>
              <Ionicons name={checklist.local ? "checkbox" : "square-outline"} size={22} color={checklist.local ? "#107C10" : "#A19F9D"} />
              <Text style={styles.checkText}>Local ou setor validado</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChecklist({ ...checklist, evidencias: !checklist.evidencias })} style={styles.checkItem}>
              <Ionicons name={checklist.evidencias ? "checkbox" : "square-outline"} size={22} color={checklist.evidencias ? "#107C10" : "#A19F9D"} />
              <Text style={styles.checkText}>Evidências registradas</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Atendimento realizado</Text>
            <View style={styles.rowInput}>
              <TextInput style={[styles.formInput, { flex: 1, marginBottom: 0 }]} value={tempService} onChangeText={setTempService} placeholder="Adicionar registro do atendimento..." placeholderTextColor="#A19F9D" />
              <TouchableOpacity onPress={addService} style={styles.btnAdd}><Ionicons name="add" size={24} color="#FFFFFF" /></TouchableOpacity>
            </View>
            <View style={{ marginTop: 15 }}>
              {servicesList.map((s, i) => (
                <View key={i} style={styles.serviceItem}>
                  <Text style={styles.serviceText}>{s}</Text>
                  <TouchableOpacity onPress={() => removeService(i)}><Ionicons name="close" size={20} color="#D13438" /></TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Recursos utilizados</Text>
            <View style={styles.rowInput}>
              <TextInput
                style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                value={tempUsedMaterial}
                onChangeText={setTempUsedMaterial}
                placeholder="Ex: equipamento, acesso, material..."
                placeholderTextColor="#A19F9D"
                onSubmitEditing={addUsedMaterial}
              />
              <TouchableOpacity onPress={addUsedMaterial} style={styles.btnAdd}><Ionicons name="add" size={24} color="#FFFFFF" /></TouchableOpacity>
            </View>
            <View style={{ marginTop: 15 }}>
              {usedMaterialsList.map((m, i) => (
                <View key={i} style={styles.serviceItem}>
                  <Text style={styles.serviceText}>{m}</Text>
                  <TouchableOpacity onPress={() => removeUsedMaterial(i)}><Ionicons name="close" size={20} color="#D13438" /></TouchableOpacity>
                </View>
              ))}
              {usedMaterialsList.length === 0 && (
                <Text style={styles.emptyHint}>Nenhum recurso utilizado informado.</Text>
              )}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Anexos</Text>
            <ScrollView horizontal style={styles.photoList}>
              <TouchableOpacity onPress={pickImage} style={styles.photoAddBtn}>
                <Ionicons name="camera-outline" size={28} color="#0078D4" />
              </TouchableOpacity>
              {photos.map((p, i) => (
                <TouchableOpacity key={i} onPress={() => openPhotoEdit(i)}>
                  <Image source={{ uri: p.uri }} style={styles.thumbPhoto} />
                  {p.observation ? <View style={styles.obsBadge}><Ionicons name="checkmark" size={12} color="#FFFFFF" /></View> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Validação</Text>
            <TouchableOpacity style={[styles.signBtn, techSignature && styles.signedBtn]} onPress={() => initiateSignature('tech')}>
              <Text style={[styles.signBtnText, techSignature && styles.signedBtnText]}>{techSignature ? 'Responsável validado' : 'Assinatura do responsável'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.signBtn, respSignature && styles.signedBtn]} onPress={() => initiateSignature('resp')}>
              <Text style={[styles.signBtnText, respSignature && styles.signedBtnText]}>{respSignature ? 'Solicitante validado' : 'Assinatura do solicitante'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.btnFinalize} onPress={finishOS}><Text style={styles.btnFinalizeText}>Concluir Chamado</Text></TouchableOpacity>
        </ScrollView>

        <Modal visible={selectClientModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Selecionar solicitante</Text>
              <FlatList
                data={clientsDb}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.osCard} onPress={() => selectClientForOs(item)}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#201F1E', fontSize: 14 }}>{item.name}</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', color: '#605E5C', fontSize: 12 }}>Local: {item.unit}</Text>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity onPress={() => setSelectClientModal(false)} style={[styles.modalCancel, { marginTop: 15 }]}><Text style={{ color: '#201F1E', fontFamily: 'Poppins_400Regular' }}>Fechar</Text></TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showSignInput} transparent animationType="fade" supportedOrientations={['portrait', 'landscape']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Segurança</Text>
                <Text style={styles.modalDesc}>Forneça sua identificação</Text>
                <TextInput style={styles.modalInput} placeholder="0000" placeholderTextColor="#A19F9D" keyboardType="numeric" value={signerId} onChangeText={setSignerId} />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => { setShowSignInput(false); setIsSigning(null) }} style={styles.modalCancel}><Text style={{ color: '#201F1E', fontFamily: 'Poppins_400Regular' }}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={validateSignerId} style={styles.modalConfirm}><Text style={{ color: 'white', fontFamily: 'Poppins_600SemiBold' }}>Validar</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={!showSignInput && isSigning !== null} transparent={false} animationType="slide" supportedOrientations={['portrait', 'landscape']}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
            <View style={styles.signHeader}>
              <Text style={styles.signTitle}>Assinatura</Text>
              <TouchableOpacity onPress={async () => {
                setIsSigning(null);
                try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); } catch (error) { }
              }}>
                <Text style={{ color: '#D13438', fontFamily: 'Poppins_600SemiBold' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#EDEBE9', margin: 15, borderRadius: 4, backgroundColor: 'white', overflow: 'hidden' }}>
              <SignatureScreen ref={refSignature} onOK={handleSignatureOK} penColor="#201F1E" webStyle={`.m-signature-pad--footer {display: none; margin: 0px;} .m-signature-pad {box-shadow: none; border: none;}`} />
            </View>
            <View style={styles.signFooter}>
              <TouchableOpacity style={styles.btnClean} onPress={() => refSignature.current.clearSignature()}><Text style={{ color: '#201F1E', fontFamily: 'Poppins_400Regular' }}>Refazer</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirmSign} onPress={() => refSignature.current.readSignature()}><Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>Aceitar</Text></TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        <Modal visible={photoModalVisible} transparent animationType="slide" supportedOrientations={['portrait', 'landscape']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
                <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                  <TouchableOpacity onPress={Keyboard.dismiss} style={{ alignSelf: 'flex-end', padding: 5 }}><Ionicons name="chevron-down" size={24} color="#605E5C" /></TouchableOpacity>
                  <Text style={styles.modalTitle}>Anexo</Text>
                  {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
                    <Image source={{ uri: photos[selectedPhotoIndex].uri }} style={{ width: '100%', height: 200, borderRadius: 4, marginBottom: 15, borderWidth: 1, borderColor: '#EDEBE9' }} resizeMode="cover" />
                  )}
                  <Text style={[styles.inputLabel, { alignSelf: 'flex-start', color: '#605E5C' }]}>Nota do anexo</Text>
                  <View style={styles.commentBoxUI}>
                    <TextInput style={styles.modalInputBox} placeholder="Adicionar texto..." placeholderTextColor="#A19F9D" multiline value={tempObservation} onChangeText={setTempObservation} />
                  </View>
                  <View style={[styles.modalActions, { width: '100%' }]}>
                    <TouchableOpacity onPress={deletePhoto} style={styles.modalCancel}><Text style={{ color: '#D13438', fontFamily: 'Poppins_400Regular' }}>Excluir</Text></TouchableOpacity>
                    <TouchableOpacity onPress={savePhotoObservation} style={styles.modalConfirm}><Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>Salvar</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setPhotoModalVisible(false)} style={{ marginTop: 20 }}><Text style={{ color: '#605E5C', fontFamily: 'Poppins_400Regular' }}>Voltar</Text></TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  const isTrash = screen === 'trash';
  const filteredHistory = osHistory.filter(item =>
    item.client.toLowerCase().includes(searchText.toLowerCase()) ||
    item.unit.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F2F1' }}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => { setScreen('home'); setSearchText(''); }} style={styles.navBtn}><Ionicons name="arrow-back" size={24} color="#0078D4" /></TouchableOpacity>
        <Text style={styles.navTitle}>{isTrash ? "Lixeira" : "Arquivos Locais"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isTrash && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#A19F9D" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por solicitante ou local..."
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText !== '' && <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={20} color="#A19F9D" /></TouchableOpacity>}
        </View>
      )}

      <FlatList
        data={isTrash ? osTrash : filteredHistory}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#A19F9D', marginTop: 20, fontFamily: 'Poppins_400Regular' }}>Nenhum registro encontrado.</Text>}
        renderItem={({ item }) => (
          <View style={styles.osCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'Poppins_600SemiBold', color: '#201F1E', fontSize: 14 }}>{item.client}</Text>
              <Text style={{ fontFamily: 'Poppins_400Regular', color: '#605E5C', fontSize: 11 }}>#{item.id?.slice(-6)}</Text>
            </View>
            <Text style={{ fontFamily: 'Poppins_400Regular', color: '#605E5C', fontSize: 12, marginTop: 4 }}>{item.date} | {item.unit}</Text>
            <View style={{ height: 1, backgroundColor: '#EDEBE9', marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              {!isTrash ? (
                <>
                  <TouchableOpacity onPress={() => initiateReopen(item)} style={styles.actionBtn}><Ionicons name="pencil" size={18} color="#605E5C" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => generatePDF(item)} style={styles.actionBtn}><Ionicons name="document-text" size={18} color="#0078D4" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => moveToTrash(item.id)} style={styles.actionBtn}><Ionicons name="trash" size={18} color="#D13438" /></TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => restoreFromTrash(item.id)} style={styles.actionBtnText}><Text style={{ color: '#107C10', fontFamily: 'Poppins_400Regular' }}>Restaurar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => deletePermanently(item.id)} style={styles.actionBtnText}><Text style={{ color: '#D13438', fontFamily: 'Poppins_400Regular' }}>Excluir</Text></TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      />
      <Modal visible={reopenModalVisible} transparent supportedOrientations={['portrait', 'landscape']}><View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Segurança</Text><Text style={styles.modalDesc}>Senha de acesso</Text><TextInput style={styles.modalInput} placeholder="0000" placeholderTextColor="#A19F9D" keyboardType="numeric" value={reopenCpf} onChangeText={setReopenCpf} secureTextEntry /><View style={styles.modalActions}><TouchableOpacity onPress={() => setReopenModalVisible(false)} style={styles.modalCancel}><Text style={{ color: '#201F1E', fontFamily: 'Poppins_400Regular' }}>Cancelar</Text></TouchableOpacity><TouchableOpacity onPress={confirmReopen} style={styles.modalConfirm}><Text style={{ color: '#FFFFFF', fontFamily: 'Poppins_600SemiBold' }}>Confirmar</Text></TouchableOpacity></View></View></View></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F2F1' },
  loginSafe: { flex: 1 },
  loginKeyboard: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  loginHeader: { alignItems: 'center', marginBottom: 30 },
  loginLogo: { width: 140, height: 100, marginBottom: 10 },
  loginTitle: { fontSize: 24, fontFamily: 'Poppins_600SemiBold', color: '#201F1E' },
  loginSubtitle: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: '#605E5C' },
  loginForm: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 25, borderWidth: 1, borderColor: '#EDEBE9' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginBottom: 5 },
  loginInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 4, padding: 12, fontFamily: 'Poppins_400Regular' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btnLogin: { backgroundColor: '#0078D4', padding: 15, borderRadius: 4, alignItems: 'center' },
  btnLoginText: { color: '#FFFFFF', fontWeight: 'bold' },
  loginFooter: { marginTop: 20, alignItems: 'center' },
  copyrightText: { marginTop: 12, color: '#8A8886', fontSize: 11, fontFamily: 'Poppins_400Regular', textAlign: 'center' },
  cleanLogoutBtn: { marginTop: 15 },
  cleanLogoutText: { color: '#0078D4' },
  homeHeader: { backgroundColor: '#FFFFFF', padding: 20, paddingTop: 50, borderBottomWidth: 1, borderColor: '#EDEBE9' },
  headerUserRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerWelcome: { color: '#605E5C', fontSize: 12, fontFamily: 'Poppins_400Regular' },
  headerUser: { color: '#201F1E', fontSize: 22, fontFamily: 'Poppins_600SemiBold', marginTop: 2 },
  logoSmall: { width: 120, height: 100 },
  menuContainer: { padding: 20 },
  dashboardCard: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#EDEBE9' },
  dashHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  dashTitle: { fontSize: 12, fontFamily: 'Poppins_600SemiBold', color: '#201F1E', marginLeft: 8 },
  dashRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  dashItem: { alignItems: 'center', flex: 1 },
  dashNumber: { fontSize: 24, fontWeight: 'bold', color: '#0078D4' },
  dashDivider: { width: 1, height: 30, backgroundColor: '#EEE' },
  menuBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, marginBottom: 10, borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  iconContainer: { width: 40, height: 40, backgroundColor: '#EEE', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 14, color: '#201F1E' },
  navBar: { flexDirection: 'row', padding: 20, paddingTop: 50, backgroundColor: '#FFF', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EEE' },
  navTitle: { fontSize: 16, fontWeight: 'bold' },
  osCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  formSafe: { flex: 1, backgroundColor: '#F3F2F1' },
  formScroll: { padding: 20 },
  formSection: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 15 },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', color: '#0078D4', marginBottom: 10 },
  formInput: { borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 4, marginBottom: 10 },
  checkItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  checkText: { marginLeft: 10 },
  btnAdd: { backgroundColor: '#0078D4', padding: 10, borderRadius: 4, marginLeft: 10 },
  rowInput: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  photoAddBtn: { width: 60, height: 60, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0078D4', justifyContent: 'center', alignItems: 'center', borderRadius: 4, marginRight: 10 },
  thumbPhoto: { width: 60, height: 60, borderRadius: 4, marginRight: 10 },
  obsBadge: { position: 'absolute', bottom: -5, right: 5, backgroundColor: '#0078D4', borderRadius: 12, padding: 2 },
  signBtn: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', marginBottom: 10, alignItems: 'center' },
  btnFinalize: { backgroundColor: '#0078D4', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnFinalizeText: { color: 'white', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', padding: 20, borderRadius: 8 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalDesc: { fontSize: 12, marginBottom: 15, textAlign: 'center', color: '#666' },
  modalInput: { borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 4, marginBottom: 10, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
  modalCancel: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 4, alignItems: 'center', minWidth: 100 },
  modalConfirm: { backgroundColor: '#0078D4', padding: 10, borderRadius: 4, alignItems: 'center', minWidth: 100 },
  signHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#EDEBE9' },
  signTitle: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#201F1E' },
  signFooter: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#FFF' },
  btnClean: { padding: 12, borderRadius: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#8A8886', minWidth: 100, alignItems: 'center' },
  btnConfirmSign: { padding: 12, borderRadius: 4, backgroundColor: '#0078D4', minWidth: 100, alignItems: 'center' },
  commentBoxUI: { width: '100%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#8A8886', borderRadius: 4, padding: 12, marginBottom: 20, minHeight: 100 },
  modalInputBox: { fontSize: 14, color: '#201F1E', textAlignVertical: 'top', fontFamily: 'Poppins_400Regular' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 20, marginBottom: 0, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: '#EDEBE9' },
  searchInput: { flex: 1, marginLeft: 10, fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#201F1E' },
  actionBtn: { backgroundColor: '#F3F2F1', padding: 8, borderRadius: 4 },
  actionBtnText: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 4, backgroundColor: '#F3F2F1' },
  menuSectionTitle: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: '#201F1E', marginBottom: 15 },
  dashLabel: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: '#605E5C', textAlign: 'center', marginTop: 2 },
  menuDesc: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: '#605E5C', marginTop: 2 },
  menuScroll: { flex: 1 },
  navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  switchLabel: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: '#605E5C' },
  btnLogout: { marginTop: 15, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: '#D13438', alignItems: 'center', backgroundColor: '#FFFFFF' },
  btnLogoutText: { color: '#D13438', fontFamily: 'Poppins_600SemiBold' },
  photoList: { marginTop: 5 },
  serviceText: { flex: 1, color: '#201F1E', fontFamily: 'Poppins_400Regular', fontSize: 13, marginRight: 10 },
  signBtnText: { color: '#201F1E', fontFamily: 'Poppins_600SemiBold' },
  signedBtn: { backgroundColor: '#E7F6E7', borderColor: '#107C10' },
  signedBtnText: { color: '#107C10' },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  emptyHint: { color: '#A19F9D', fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center', paddingVertical: 10 }
});
