import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Se inicializa Firestore con Caché Persistente para reducir costos de lecturas drásticamente.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

// La aplicación no usa Firebase Storage: los expedientes de alumnos no se suben como
// archivos, solo se guarda la ruta de referencia de dónde se resguardan físicamente
// (ver ScannedDocument en types.ts).
