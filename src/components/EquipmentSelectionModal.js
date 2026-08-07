import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function EquipmentSelectionModal({ visible, categories, selectedItems, onToggle, onClose }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const filteredCategories = useMemo(() => Object.entries(categories)
    .map(([category, items]) => [category, items.filter(item => item.toLocaleLowerCase().includes(normalizedQuery))])
    .filter(([, items]) => items.length > 0), [categories, normalizedQuery]);

  const closeModal = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={closeModal}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={closeModal} style={styles.headerButton}><Ionicons name="arrow-back" size={24} color="#0078D4" /></TouchableOpacity>
          <Text style={styles.title}>Equipamentos</Text>
          <TouchableOpacity onPress={closeModal} style={styles.headerButton}><Ionicons name="checkmark" size={24} color="#107C10" /></TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#605E5C" />
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Buscar equipamento..." placeholderTextColor="#8A8886" />
          {query !== '' && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color="#8A8886" /></TouchableOpacity>}
        </View>
        <Text style={styles.counter}>{selectedItems.length} selecionado(s)</Text>
        <ScrollView contentContainerStyle={styles.list}>
          {filteredCategories.map(([category, items]) => (
            <View key={category} style={styles.category}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {items.map(item => {
                const selected = selectedItems.includes(item);
                return (
                  <TouchableOpacity key={item} onPress={() => onToggle(item)} style={[styles.option, selected && styles.optionSelected]}>
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F2F1' },
  header: { flexDirection: 'row', padding: 20, backgroundColor: '#FFFFFF', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EDEBE9' },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 16, fontFamily: 'Poppins_600SemiBold', color: '#201F1E' },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, paddingHorizontal: 13, height: 48, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D1D1D1' },
  searchInput: { flex: 1, marginLeft: 9, color: '#201F1E', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  counter: { color: '#005A9E', fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginHorizontal: 20, marginBottom: 8 },
  list: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  category: { backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#EDEBE9' },
  categoryTitle: { backgroundColor: '#F5FAFE', paddingHorizontal: 14, paddingVertical: 10, color: '#005A9E', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  option: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#F3F2F1' },
  optionSelected: { backgroundColor: '#EDF8F0' },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderColor: '#8A8886', borderRadius: 5, marginRight: 11, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#107C10', borderColor: '#107C10' },
  optionText: { flex: 1, color: '#323130', fontFamily: 'Poppins_400Regular', fontSize: 13 },
  optionTextSelected: { color: '#107C10', fontFamily: 'Poppins_600SemiBold' },
});
