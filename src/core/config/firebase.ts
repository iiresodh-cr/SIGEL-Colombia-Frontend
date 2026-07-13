import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

// 1. Capturamos el dominio actual en el que está el navegador
const currentHost = window.location.hostname;

// 2. Creamos una función para decidir qué authDomain usar
const resolveAuthDomain = () => {
  // Si estamos en desarrollo local, usamos el de por defecto de Firebase
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  }
  // Para producción o vistas previas (*.web.app), usamos el dominio en el que estamos navegando
  return currentHost;
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(), // 3. Ejecutamos la función aquí
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 
export const googleProvider = new GoogleAuthProvider();

// Forzar que el selector de cuentas de Google aparezca siempre
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: 'iiresodh.org' 
});