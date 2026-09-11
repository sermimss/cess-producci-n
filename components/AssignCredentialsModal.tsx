import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { createTeacherAccount } from '../utils/authUtils';

interface AssignCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  onSave: (updatedTeacher: Teacher) => void;
}

const AssignCredentialsModal: React.FC<AssignCredentialsModalProps> = ({ isOpen, onClose, teacher, onSave }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (teacher) {
      setEmail(teacher.email || '');
      setPassword('');
      setError('');
      setSuccess('');
    }
  }, [teacher, isOpen]);

  if (!isOpen || !teacher) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // 1. Create the user in Firebase Auth (con el custom claim role: teacher)
      await createTeacherAccount(email, password);

      // 2. Update the teacher document in Firestore
      onSave({
        ...teacher,
        email,
      });

      setSuccess('Credenciales asignadas exitosamente.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-exists') {
        setError('El correo electrónico ya está en uso por otra cuenta. Si el docente ya tiene cuenta, no es necesario volver a asignarla.');
      } else if (err.code === 'auth/invalid-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Error al crear la cuenta. Verifica la consola para más detalles.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Asignar Credenciales</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Asigna un usuario y contraseña para <strong>{teacher.name}</strong>. Con estas credenciales podrá ingresar al portal de docentes.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm">
              {success}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico (Usuario)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
              placeholder="docente@escuela.edu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Asignando...' : 'Asignar Credenciales'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignCredentialsModal;
