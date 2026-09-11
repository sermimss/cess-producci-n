import { auth } from '../firebase';

// Adjunta el ID token de Firebase del usuario actual como header Authorization,
// para que el backend pueda verificar la sesión antes de ejecutar acciones sensibles
// (crear preferencias de pago, verificar el NIP, enviar WhatsApp, etc.).
export const withAuthHeader = async (extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
  const token = await auth.currentUser?.getIdToken();
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Crea la cuenta de Firebase Auth de un docente desde el backend (con la cuenta de
// servicio), que además le asigna el custom claim `role: teacher`. Antes esto se hacía
// desde el cliente con una app secundaria de Firebase, lo que dejaba la cuenta sin
// forma de distinguirla de cualquier otro usuario autenticado en firestore.rules.
export const createTeacherAccount = async (email: string, password: string): Promise<{ uid: string; email: string }> => {
  const res = await fetch('/api/create-teacher-account', {
    method: 'POST',
    headers: await withAuthHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data.error || 'Error al crear la cuenta del docente');
    err.code = data.code;
    throw err;
  }
  return data;
};
