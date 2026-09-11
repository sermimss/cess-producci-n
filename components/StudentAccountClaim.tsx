import React, { useState } from 'react';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Props {
  userEmail: string | null | undefined;
  onClaimSuccess: (matricula: string) => void;
}

export const StudentAccountClaim: React.FC<Props> = ({ userEmail, onClaimSuccess }) => {
  const [matricula, setMatricula] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) return setError('Error: No se encontró tu correo electrónico.');
    if (!matricula.trim()) return setError('Ingresa una matrícula válida.');

    setLoading(true);
    setError('');

    try {
      const studentRef = doc(db, 'students', matricula.trim());
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        setError('No se encontró ninguna matrícula con ese número. Verifica e intenta de nuevo.');
        setLoading(false);
        return;
      }

      const data = studentSnap.data();

      // Check if already claimed
      if (data.email && data.email.trim() !== '') {
        if (data.email.toLowerCase() === userEmail.toLowerCase()) {
           onClaimSuccess(matricula);
           return;
        } else {
           setError('Esta matrícula ya se encuentra asociada a otro correo electrónico.');
           setLoading(false);
           return;
        }
      }

      // Valid for claim, update
      await updateDoc(studentRef, {
        email: userEmail,
        username: userEmail.split('@')[0],
      });

      onClaimSuccess(matricula);
    } catch (err: any) {
      console.error(err);
      setError('Hubo un error al verificar la matrícula. Verifica que sea correcta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center max-w-lg mx-auto mt-10">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Enlaza tu Matrícula</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
        Bienvenido <span className="font-bold text-indigo-600 dark:text-indigo-400">{userEmail}</span>.<br/><br/>
        Para acceder al portal de alumnos y verificar tus pagos y calificaciones debes enlazar tu matrícula institucional a tu cuenta recién creada.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleClaim} className="space-y-6 text-left">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tu Matrícula
          </label>
          <input
            type="text"
            required
            placeholder="Ej. ACTX960305..."
            value={matricula}
            onChange={(e) => setMatricula(e.target.value)}
            className="block w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-lg p-3 text-center tracking-widest font-mono uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? 'Verificando...' : 'Reclamar y Acceder'}
        </button>
      </form>
    </div>
  );
};
