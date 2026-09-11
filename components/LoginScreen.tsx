import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useAuth } from '../AuthProvider';

interface LoginScreenProps {
  onAdminTeacherMode: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAdminTeacherMode }) => {
  const { signInWithEmail, registerWithEmail } = useAuth();
  const [matricula, setMatricula] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula.trim()) return setError('Ingresa tu matrícula');
    
    setLoading(true);
    setError('');
    
    const parsedMatricula = matricula.trim().toLowerCase();
    const email = `${parsedMatricula}@cessdigital.local`;
    const password = `Cess2026!${parsedMatricula}`;

    try {
      // Intentar iniciar sesión
      await signInWithEmail(email, password);
    } catch (err: any) {
      // Si el usuario no existe, lo creamos e iniciamos sesión
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await registerWithEmail(email, password);
        } catch (registerErr: any) {
          setError('No se pudo verificar la matrícula. Revisa que sea correcta.');
        }
      } else {
        setError('Ocurrió un error al intentar acceder. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col relative transition-colors duration-300">
      {/* Header */}
      <div className="w-full flex justify-between items-center p-6 absolute top-0 left-0 right-0">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Cess Digital</h1>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <MoreVertical className="w-6 h-6" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowMenu(false); onAdminTeacherMode(); }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Iniciar como Administrador
              </button>
              <button
                onClick={() => { setShowMenu(false); onAdminTeacherMode(); }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Iniciar como Docente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl w-full max-w-sm text-center border-t-4 border-indigo-600">
          
          {/* Logo Placeholder */}
          <div className="mx-auto w-32 h-32 mb-6 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
             {/* Asumimos que el usuario subirá logo.jpg a la carpeta public/ */}
             <img src="/logo.jpg" alt="Logo CESS" className="w-full h-full object-cover" onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-gray-400 font-bold text-xl">CESS</span>';
             }} />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Portal de Alumnos</h2>
          
          <form onSubmit={handleStudentLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div>
              <input
                type="text"
                required
                placeholder="Matrícula de Acceso"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="block w-full border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg p-3 uppercase tracking-widest font-mono"
              />
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
            >
              {loading ? 'Accediendo...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider text-sm">Misión</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Formar profesionales con excelencia académica y sentido humano, capaces de transformar su entorno con liderazgo y valores.</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider text-sm">Visión</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Ser una institución educativa referente por su innovación, calidad educativa y el impacto positivo de sus egresados en la sociedad.</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider text-sm">Valores</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Integridad, Respeto, Responsabilidad, Excelencia y Compromiso Social.</p>
        </div>
      </div>
    </div>
  );
};
