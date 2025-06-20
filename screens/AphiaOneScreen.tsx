import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function AphiaOneScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: 'https://aphiaone.machakos.go.ke/' }} 
        style={styles.webview}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
