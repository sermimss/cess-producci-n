import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

export const createSecondaryUser = async (email: string, password: string) => {
  // Check if secondary app already exists to avoid duplicate initialization
  const apps = getApps();
  let secondaryApp;
  
  const secondaryAppName = 'SecondaryAppForUserCreation';
  
  if (apps.some(app => app.name === secondaryAppName)) {
    secondaryApp = getApp(secondaryAppName);
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }

  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    // Sign out the secondary app immediately so it doesn't interfere
    await secondaryAuth.signOut();
    return userCredential.user;
  } catch (error) {
    console.error("Error creating secondary user:", error);
    throw error;
  }
};
