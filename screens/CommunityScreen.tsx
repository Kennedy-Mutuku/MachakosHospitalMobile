import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebaseConfig';
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  doc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

export default function CommunityScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isUserSet, setIsUserSet] = useState(false);
  const [post, setPost] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 🧠 Restore user info
  useEffect(() => {
    const loadUser = async () => {
      const savedName = await AsyncStorage.getItem('userName');
      const savedPhone = await AsyncStorage.getItem('userPhone');
      if (savedName && savedPhone) {
        setName(savedName);
        setPhone(savedPhone);
        setIsUserSet(true);
      }
    };
    loadUser();
  }, []);

  // 🔐 Save user info & register presence
  const handleJoin = async () => {
    if (!name.trim() || !phone.trim()) return;

    await AsyncStorage.setItem('userName', name);
    await AsyncStorage.setItem('userPhone', phone);
    setIsUserSet(true);

    await setDoc(doc(db, 'presence', phone), {
      name,
      phone,
      lastActive: serverTimestamp(),
    });
  };

  // 💬 Send message
  const handlePost = async () => {
    if (!post.trim()) return;
    await addDoc(collection(db, 'messages'), {
      content: post,
      senderName: name,
      senderPhone: phone,
      timestamp: serverTimestamp(),
    });
    setPost('');
  };

  // 🧹 Clear chat messages
  const handleClearChat = async () => {
    Alert.alert('Delete All Messages?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          const messagesRef = collection(db, 'messages');
          const snapshot = await getDocs(messagesRef);
          const deletions = snapshot.docs.map((doc) => deleteDoc(doc.ref));
          await Promise.all(deletions);
        },
      },
    ]);
  };

  // 🔁 Realtime messages
  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPosts(msgs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // 🟢 Realtime presence
  useEffect(() => {
    const unsubPresence = onSnapshot(collection(db, 'presence'), (snapshot) => {
      const online = snapshot.docs.map(doc => doc.data());
      setOnlineUsers(online);
    });
    return unsubPresence;
  }, []);

  // 📦 Render message
  const renderItem = ({ item }) => {
    const isMine = item.senderPhone === phone;
    return (
      <View
        style={[
          styles.messageContainer,
          isMine ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.senderName?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <Text style={styles.senderName}>
            {isMine ? 'You' : `${item.senderName} (${item.senderPhone})`}
          </Text>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timestamp}>
            {item.timestamp?.toDate
              ? item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  // 📝 Prompt for user info
  if (!isUserSet) {
    return (
      <View style={styles.namePrompt}>
        <Text style={styles.nameHeader}>📝 Enter Your Details to Join Chat</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="Your Full Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.nameInput}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Pressable style={styles.nameButton} onPress={handleJoin}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Join Chat</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.header}>💬 Community Chat</Text>

          {/* Online Users */}
          <View style={styles.onlineBar}>
            <Text style={styles.onlineHeader}>🟢 Online Users:</Text>
            <FlatList
              data={onlineUsers}
              horizontal
              keyExtractor={(item) => item.phone}
              renderItem={({ item }) => (
                <View style={styles.onlineUser}>
                  <Text>{item.name}</Text>
                </View>
              )}
            />
          </View>

          {/* Chat messages */}
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.chatList}
            ListEmptyComponent={!loading && <Text style={styles.empty}>Start the conversation 👇</Text>}
          />

          {/* Input bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message"
              value={post}
              onChangeText={setPost}
              multiline
            />
            <Pressable style={styles.sendButton} onPress={handlePost}>
              <Text style={styles.sendButtonText}>Send</Text>
            </Pressable>
            <Pressable style={styles.clearButton} onPress={handleClearChat}>
              <Text style={{ color: '#fff' }}>🧹</Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f7f7f7',
    textAlign: 'center',
  },
  namePrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  nameHeader: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  nameInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  nameButton: {
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  onlineBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  onlineHeader: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  onlineUser: {
    backgroundColor: '#e0f7e9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  chatList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    flexDirection: 'row-reverse',
  },
  otherMessageContainer: {
    flexDirection: 'row',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  myMessage: {
    backgroundColor: '#dcf8c6',
  },
  otherMessage: {
    backgroundColor: '#e5e5ea',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f0f0f0',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#25D366',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  clearButton: {
    marginLeft: 8,
    backgroundColor: '#ff5252',
    padding: 10,
    borderRadius: 20,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 40,
  },
});
