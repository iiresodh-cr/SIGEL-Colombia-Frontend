import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export interface ArchivoJEP {
  name: string;
  url: string;
  fullPath: string;
}

export const storageService = {
  // Sube un archivo a una carpeta específica de la víctima
  uploadFile: async (victimaId: string, file: File, folder: 'poderes' | 'documentos' | 'autos'): Promise<string> => {
    // Crea una ruta segura limpiando el nombre del archivo
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fileRef = ref(storage, `victimas/${victimaId}/${folder}/${Date.now()}_${safeName}`);
    
    await uploadBytes(fileRef, file);
    return await getDownloadURL(fileRef);
  },

  // Obtiene la lista de archivos de una carpeta
  getFiles: async (victimaId: string, folder: 'poderes' | 'documentos' | 'autos'): Promise<ArchivoJEP[]> => {
    const folderRef = ref(storage, `victimas/${victimaId}/${folder}`);
    try {
      const result = await listAll(folderRef);
      const files = await Promise.all(result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return { name: itemRef.name, url, fullPath: itemRef.fullPath };
      }));
      return files;
    } catch (error) {
      console.error("Error al obtener archivos, puede que la carpeta esté vacía:", error);
      return [];
    }
  },

  // Elimina un archivo
  deleteFile: async (fullPath: string): Promise<void> => {
    const fileRef = ref(storage, fullPath);
    await deleteObject(fileRef);
  }
};