import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CommunityScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Community Space Coming Soon 🚧</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
});
