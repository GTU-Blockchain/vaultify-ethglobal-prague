import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import Person from '../components/Person';
import { Colors } from '../constants/Colors';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];


// Sample data for demonstration
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>      <ScrollView style={styles.scrollView}>
        {people.map((person) => (
          <Person
            key={person.id}
            name={person.name}
            onPress={() => router.push(`/chat/${person.id}?name=${person.name}`)}
          />
        ))}
      </ScrollView>
     
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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