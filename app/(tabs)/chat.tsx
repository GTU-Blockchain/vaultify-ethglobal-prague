import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Person from '../components/Person';
import { useTheme } from '../context/ThemeContext';

export default function ChatScreen() {
  const { colors } = useTheme();

  const people = [
    { id: '1', name: 'Sophia' },
    { id: '2', name: 'Ethan' },
    { id: '3', name: 'Olivia' },
    { id: '4', name: 'Noah' },
    { id: '5', name: 'Ava' },
    { id: '6', name: 'Lucas' },
    { id: '7', name: 'Isabella' },
    { id: '8', name: 'Jackson' },
    { id: '9', name: 'Mia' },
  ];

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
    >
      {people.map((person) => (
        <Person
          key={person.id}
          name={person.name}
          onPress={() => router.push(`/chat/${person.id}?name=${person.name}`)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});