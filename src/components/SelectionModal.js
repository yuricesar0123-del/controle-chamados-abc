import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SelectionModal({
  visible,
  title,
  items,
  selectedValue,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  getLabel = item => String(item),
  getKey = item => String(item),
  getIcon = () => 'list-outline',
  isSelected = (item, value) => getLabel(item) === value,
  multiple = false,
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return items;
    return items.filter(item => getLabel(item).toLocaleLowerCase().includes(normalizedQuery));
  }, [getLabel, items, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#0078D4" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          {multiple ? (
            <TouchableOpacity onPress={onClose} style={styles.headerButton} accessibilityLabel="Concluir seleção">
              <Ionicons name="checkmark" size={25} color="#107C10" />
            </TouchableOpacity>
          ) : <View style={styles.headerButton} />}
        </View>

        {searchable && (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#605E5C" />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor="#8A8886"
            />
            {query !== '' && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color="#8A8886" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {multiple && (
          <Text style={styles.counter}>
            {Array.isArray(selectedValue) ? selectedValue.length : 0} selecionado(s)
          </Text>
        )}

        <FlatList
          data={filteredItems}
          keyExtractor={getKey}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const selected = isSelected(item, selectedValue);
            return (
              <TouchableOpacity onPress={() => onSelect(item)} style={[styles.option, selected && styles.optionSelected]}>
                <Ionicons name={getIcon(item)} size={20} color={selected ? '#107C10' : '#605E5C'} />
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{getLabel(item)}</Text>
                {selected && <Ionicons name="checkmark-circle" size={21} color="#107C10" />}
              </TouchableOpacity>
            );
          }}
        />
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
  counter: { color: '#005A9E', fontFamily: 'Poppins_600SemiBold', fontSize: 12, marginHorizontal: 20, marginTop: 8 },
  list: { padding: 16, paddingBottom: 32 },
  option: { minHeight: 54, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1DFDD', borderRadius: 8, marginBottom: 9, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  optionSelected: { backgroundColor: '#EDF8F0', borderColor: '#86C98F' },
  optionText: { flex: 1, color: '#323130', fontFamily: 'Poppins_400Regular', fontSize: 13, marginHorizontal: 11 },
  optionTextSelected: { color: '#107C10', fontFamily: 'Poppins_600SemiBold' },
});
