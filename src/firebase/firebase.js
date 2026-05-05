import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGVneWsvoL0SSDA-Aafo0MPmlRgsQHzxQ",
  authDomain: "lbc-territory-tracker.firebaseapp.com",
  projectId: "lbc-territory-tracker",
  storageBucket: "lbc-territory-tracker.firebasestorage.app",
  messagingSenderId: "273564541903",
  appId: "1:273564541903:web:3d5f1b613f4f79acc1a8ba",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
