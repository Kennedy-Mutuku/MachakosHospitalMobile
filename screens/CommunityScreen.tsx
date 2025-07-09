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
  ImageBackground,
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
  where,
} from 'firebase/firestore';

export default function CommunityScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isUserSet, setIsUserSet] = useState(false);
  const [post, setPost] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatPartner, setChatPartner] = useState(null);

  // Generate consistent chat ID for any two users (sorted phones)
  const getChatId = (phone1, phone2) => [phone1, phone2].sort().join('_');

  // Load user info and presence on mount
  useEffect(() => {
    (async () => {
      try {
        const savedName = await AsyncStorage.getItem('userName');
        const savedPhone = await AsyncStorage.getItem('userPhone');
        if (savedName && savedPhone) {
          setName(savedName);
          setPhone(savedPhone);
          setIsUserSet(true);
          await setDoc(doc(db, 'presence', savedPhone), {
            name: savedName,
            phone: savedPhone,
            lastActive: serverTimestamp(),
          });
        }
      } catch (e) {
        console.error('Error loading user:', e);
      }
    })();
  }, []);

  // Join the chat by saving user info and presence
  const handleJoin = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Please enter both name and phone number.');
      return;
    }
    try {
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('userPhone', phone);
      setIsUserSet(true);
      await setDoc(doc(db, 'presence', phone), {
        name,
        phone,
        lastActive: serverTimestamp(),
      });
    } catch (e) {
      console.error('Error joining:', e);
    }
  };

  // Handle selecting a user to chat with
  const handleSelectChatPartner = (partner) => {
    setChatPartner(partner);
    setLoading(true);
    setPosts([]);
  };

  // Listen for messages in the current private chat
  useEffect(() => {
    if (!chatPartner) {
      setPosts([]);
      setLoading(false);
      return;
    }
    const chatId = getChatId(phone, chatPartner.phone);
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedPosts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(loadedPosts);
        setLoading(false);

        // Mark delivered messages as read if I'm the receiver
        loadedPosts.forEach(async (msg) => {
          if (msg.senderPhone !== phone && msg.status === 'delivered') {
            try {
              await setDoc(
                doc(db, 'messages', msg.id),
                { status: 'read' },
                { merge: true }
              );
            } catch (e) {
              console.error('Error updating read status:', e);
            }
          }
        });
      },
      (e) => console.error('Messages snapshot error:', e)
    );

    return unsubscribe;
  }, [chatPartner, phone]);

  // Listen to presence, update online users and update message status from sent to delivered
  useEffect(() => {
    const unsubPresence = onSnapshot(
      collection(db, 'presence'),
      async (snapshot) => {
        const online = snapshot.docs.map((doc) => doc.data());
        setOnlineUsers(online);

        if (chatPartner && online.some((u) => u.phone === chatPartner.phone)) {
          // Chat partner is online, update sent messages to delivered
          try {
            const chatId = getChatId(phone, chatPartner.phone);
            const messagesRef = collection(db, 'messages');
            const messagesSnapshot = await getDocs(
              query(messagesRef, where('chatId', '==', chatId))
            );

            const updates = [];

            messagesSnapshot.docs.forEach((docSnap) => {
              const msg = docSnap.data();
              if (msg.senderPhone === phone && msg.status === 'sent') {
                updates.push(
                  setDoc(
                    doc(db, 'messages', docSnap.id),
                    { status: 'delivered' },
                    { merge: true }
                  )
                );
              }
            });

            await Promise.all(updates);
          } catch (e) {
            console.error('Error updating delivered status:', e);
          }
        }
      },
      (e) => console.error('Presence snapshot error:', e)
    );
    return unsubPresence;
  }, [phone, chatPartner]);

  // Send a new message in the current chat
  const handlePost = async () => {
    if (!post.trim()) return;
    if (!chatPartner) {
      Alert.alert('Select a user to chat with first!');
      return;
    }
    try {
      const chatId = getChatId(phone, chatPartner.phone);
      await addDoc(collection(db, 'messages'), {
        content: post,
        senderName: name,
        senderPhone: phone,
        chatId,
        timestamp: serverTimestamp(),
        status: 'sent',
      });
      setPost('');
    } catch (e) {
      console.error('Post error:', e);
    }
  };

  // Clear all messages in current chat
  const handleClearChat = () => {
    if (!chatPartner) {
      Alert.alert('Select a chat first to clear messages.');
      return;
    }
    Alert.alert('Delete All Messages?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete All',
        style: 'destructive',
        onPress: async () => {
          try {
            const chatId = getChatId(phone, chatPartner.phone);
            const messagesRef = collection(db, 'messages');
            const snapshot = await getDocs(
              query(messagesRef, where('chatId', '==', chatId))
            );
            await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
            setPosts([]);
          } catch (e) {
            console.error('Delete error:', e);
          }
        },
      },
    ]);
  };

  // Tick icons for message status
  const Tick = ({ color }) => (
    <Text style={{ color, fontWeight: 'bold', marginLeft: 4, fontSize: 16 }}>✓</Text>
  );
  const DoubleTick = ({ color }) => (
    <Text style={{ color, fontWeight: 'bold', marginLeft: 4, fontSize: 16 }}>✓✓</Text>
  );

  // Render each message bubble
  const renderItem = ({ item }) => {
    const isMine = item.senderPhone === phone;

    // Format timestamp from Firestore timestamp to HH:mm
    const time = item.timestamp?.toDate
      ? item.timestamp.toDate()
      : item.timestamp
      ? new Date(item.timestamp)
      : null;

    const formattedTime = time
      ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    let tickElement = null;
    if (isMine) {
      if (item.status === 'sent') tickElement = <Tick color="gray" />;
      else if (item.status === 'delivered') tickElement = <DoubleTick color="gray" />;
      else if (item.status === 'read') tickElement = <DoubleTick color="#007aff" />;
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isMine ? styles.myMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.senderName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myMessage : styles.otherMessage,
            { flexDirection: 'row', alignItems: 'center' },
          ]}
        >
          <Text style={styles.messageText}>{item.content}</Text>
          {tickElement}
        </View>
        <Text style={styles.timestamp}>{formattedTime}</Text>
      </View>
    );
  };

  return isUserSet ? (
    <View style={styles.container}>
      {/* Chat UI */}
      {chatPartner ? (
        <View style={styles.chatContainer}>
          <Text style={styles.chatHeader}>{chatPartner.name}</Text>
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            inverted
            style={styles.messagesList}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              value={post}
              onChangeText={setPost}
            />
            <Pressable style={styles.button} onPress={handlePost}>
              <Text style={styles.buttonText}>Send</Text>
            </Pressable>
            <Pressable style={styles.clearButton} onPress={handleClearChat}>
              <Text style={styles.clearButtonText}>Clear Chat</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={onlineUsers}
          keyExtractor={(item) => item.phone}
          renderItem={({ item }) => (
            <Pressable onPress={() => handleSelectChatPartner(item)}>
              <View style={styles.userRow}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userPhone}>({item.phone})</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  ) : (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={{ uri: 'https://example.com/your-background-image.jpg' }}
        style={styles.background}
      >
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Your Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Pressable style={styles.button} onPress={handleJoin}>
          <Text style={styles.buttonText}>Join</Text>
        </Pressable>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  input: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 16,
    paddingLeft: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userPhone: {
    fontSize: 16,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  chatHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  messagesList: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#e5e5e5',
  },
  myMessage: {
    backgroundColor: '#007aff',
    alignSelf: 'flex-end',
    color: '#fff',
  },
  otherMessage: {
    backgroundColor: '#f1f1f1',
    alignSelf: 'flex-start',
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  messageInput: {
    flex: 1,
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingLeft: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 16,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: 'red',
    fontSize: 14,
  },
});
