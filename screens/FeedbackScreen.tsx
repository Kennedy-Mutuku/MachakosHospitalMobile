import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function FeedbackScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://themusyawahotel.netlify.app/' }}
        style={styles.webview}
        startInLoadingState
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
