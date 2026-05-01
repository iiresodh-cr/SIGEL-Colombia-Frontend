import { collection, query, getDocs, doc, updateDoc, setDoc, getCountFromServer, where } from "firebase/firestore";
import { db } from "../config/firebase";

export const adminService = {
  async getGlobalStats() {
    const expedientesCol = collection(db, "expedientes");
    
    const qCaso01 = query(expedientesCol, where("macrocaso", "==", "Caso 01"));
    const snapshot01 = await getCountFromServer(qCaso01);

    const qCaso10 = query(expedientesCol, where("macrocaso", "==", "Caso 10"));
    const snapshot10 = await getCountFromServer(qCaso10);

    return {
      totalExpedientes: snapshot01.data().count + snapshot10.data().count,
      totalCaso01: snapshot01.data().count,
      totalCaso10: snapshot10.data().count
    };
  },

  async invitarUsuario(email: string, role: string) {
    const userRef = doc(db, "users", email.toLowerCase());
    return await setDoc(userRef, {
      email: email.toLowerCase(),
      role: role,
      fechaAutorizacion: new Date().toISOString()
    });
  },

  async updateUserRole(email: string, newRole: string) {
    const userRef = doc(db, "users", email.toLowerCase());
    return await updateDoc(userRef, { role: newRole });
  },

  async getAllUsers() {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
  }
};