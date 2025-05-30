import React from 'react';
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native';
import Person from '../components/Person';
import { Colors } from '../constants/Colors';

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const people = [
    { name: 'Sophia' },
    { name: 'Ethan' },
    { name: 'Olivia' },
    { name: 'Noah' },
    { name: 'Ava' },
    { name: 'Lucas' },
    { name: 'Isabella' },
    { name: 'Jackson' },
    { name: 'Mia' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {people.map((person, index) => (
          <Person
            key={index}
            name={person.name}
            onPress={() => console.log(`${person.name} pressed`)}
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
});