import React from 'react';
import { Teacher } from '../types';
import { useModal } from './ModalProvider';

interface TeacherListProps {
  teachers: Teacher[];
  onAddTeacher: () => void;
  onDeleteTeacher: (id: string) => void;
  onAssignCredentials: (teacher: Teacher) => void;
  onAssignSubjects: (teacher: Teacher) => void;
  onSimulateLogin?: (teacher: Teacher) => void;
}

const TeacherList: React.FC<TeacherListProps> = ({ teachers, onAddTeacher, onDeleteTeacher, onAssignCredentials, onAssignSubjects, onSimulateLogin }) => {
  const { showConfirm } = useModal();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Directorio de Docentes</h3>
        <button
          onClick={onAddTeacher}
          title="Registrar un nuevo docente"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Registrar Docente
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-white dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email (Usuario)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {teachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{teacher.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">{teacher.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  {onSimulateLogin && (
                    <button
                      onClick={() => onSimulateLogin(teacher)}
                      title="Ver portal como este docente (Solo Admin)"
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Ver Portal
                    </button>
                  )}
                  <button
                    onClick={() => onAssignSubjects(teacher)}
                    title="Asignar materias a este docente"
                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                  >
                    Cargar Materias
                  </button>
                  <button
                    onClick={() => onAssignCredentials(teacher)}
                    title="Configurar credenciales de acceso para el portal"
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Asignar Credenciales
                  </button>
                  <button
                    onClick={async () => {
                      if (await showConfirm('¿Estás seguro de eliminar a este docente? Sus materias y calificaciones se mantendrán, pero no podrá iniciar sesión.')) {
                        onDeleteTeacher(teacher.id);
                      }
                    }}
                    title="Eliminar registro de docente"
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                  No hay docentes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeacherList;
