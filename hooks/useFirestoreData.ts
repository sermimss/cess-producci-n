import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, where, WhereFilterOp, documentId } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../AuthProvider';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirestoreData<T extends { id: string }>(
  collectionName: string, 
  shouldFetch: boolean = true,
  filterField?: string,
  filterValue?: string | string[],
  filterOperator: WhereFilterOp = "=="
) {
  const [data, setData] = useState<T[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !shouldFetch) {
      setData([]);
      return;
    }

    let q = query(collection(db, collectionName));
    if (filterField && filterValue !== undefined) {
      const field = filterField === '__name__' ? documentId() : filterField;
      q = query(collection(db, collectionName), where(field, filterOperator, filterValue));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
    });

    return unsubscribe;
  }, [collectionName, user, shouldFetch, filterField, filterValue, filterOperator]);

  const addItem = async (item: Omit<T, 'id'>, customId?: string): Promise<string | undefined> => {
    if (!user) return;
    const docRef = customId ? doc(db, collectionName, customId) : doc(collection(db, collectionName));
    const newId = docRef.id;
    try {
      await setDoc(docRef, { ...item, userId: user.uid });
      return newId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${collectionName}/${newId}`);
    }
  };

  const updateItem = async (item: T) => {
    if (!user) return;
    const docRef = doc(db, collectionName, item.id);
    const { id, ...dataToUpdate } = item;
    try {
      await setDoc(docRef, { ...dataToUpdate, userId: user.uid }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${item.id}`);
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return;
    const docRef = doc(db, collectionName, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  return { data, addItem, updateItem, deleteItem };
}
