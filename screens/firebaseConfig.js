import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA9vurX5fs0QEYyfVu_Q0py-bWgMeQ03UE",
  authDomain: "machakos-community-chat.firebaseapp.com",
  projectId: "machakos-community-chat",
  storageBucket: "machakos-community-chat.appspot.com",
  messagingSenderId: "720809427543",
  appId: "1:720809427543:web:90d2e40c2376c762db5912"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
