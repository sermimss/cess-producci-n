import React, { useState, useMemo } from 'react';
import { Group, Student } from '../types';
import { useModal } from './ModalProvider';
import { Check, Plus, X } from 'lucide-react';

interface GroupStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  students: Student[];
  allGroups: Group[];
  onUpdateGroupStudents: (groupId: string, studentIds: string[]) => void;
}

const GroupStudentsModal: React.FC<GroupStudentsModalProps> = ({ isOpen, onClose, group, students, allGroups, onUpdateGroupStudents }) => {
  const { showAlert } = useModal();
  const [searchTerm, setSearchTerm] = useState('');

  const currentStudentIds = useMemo(() => new Set(group?.studentIds || []), [group]);

  const handleToggleStudent = async (studentId: string) => {
    if (!group) return;

    const newStudentIds = new Set(currentStudentIds);
    if (newStudentIds.has(studentId)) {
      newStudentIds.delete(studentId);
    } else {
      // Check for schedule conflicts
      const studentGroups = allGroups.filter(g => g.studentIds?.includes(studentId));
      
      const hasConflict = studentGroups.some(g => {
        if (g.classDay !== group.classDay) return false;
        
        // Check time overlap
        const start1 = g.scheduleStart;
        const end1 = g.scheduleEnd;
        const start2 = group.scheduleStart;
        const end2 = group.scheduleEnd;

        return (start1 < end2 && start2 < end1);
      });

      if (hasConflict) {
        await showAlert('El alumno tiene un conflicto de horario con otro grupo en el que está inscrito.', 'Conflicto de Horario');
        return;
      }

      newStudentIds.add(studentId);
    }

    onUpdateGroupStudents(group.id, Array.from(newStudentIds));
  };

  const filteredStudents = useMemo(() => {
    if (!group) return [];
    return students
      .filter(s => s.studyPlan === group.studyPlan) // Only students from the same study plan
      .filter(s => {
        const fullName = `${s.nombre} ${s.apellidoPaterno} ${s.apellidoMaterno}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
  }, [students, group, searchTerm]);

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Gestionar Alumnos: {group.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {group.classDay} de {group.scheduleStart} a {group.scheduleEnd} | Salón: {group.classroom}
          </p>
        </div>

        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="Buscar alumno por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStudents.map(student => {
              const isEnrolled = currentStudentIds.has(student.id);
              return (
                <li 
                  key={student.id} 
                  className={`py-3 px-4 flex justify-between items-center rounded-lg transition-colors mb-1 ${
                    isEnrolled 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${isEnrolled ? 'text-green-900 dark:text-green-100' : 'text-gray-900 dark:text-gray-100'}`}>
                      {student.apellidoPaterno} {student.apellidoMaterno} {student.nombre}
                    </p>
                    <p className={`text-xs ${isEnrolled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      CURP: {student.curp}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleStudent(student.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1 transition-all group ${
                      isEnrolled 
                        ? 'bg-green-100 text-green-700 hover:bg-red-100 dark:bg-green-900/50 dark:text-green-300 hover:text-red-700 dark:hover:bg-red-900/50 dark:hover:text-red-300 border border-green-200 dark:border-green-800/50 hover:border-red-200 dark:hover:border-red-800/50' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {isEnrolled ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 group-hover:hidden" />
                        <X className="w-3.5 h-3.5 mr-1 hidden group-hover:block" />
                        <span className="group-hover:hidden">Añadido</span>
                        <span className="hidden group-hover:block">Remover</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        <span>Añadir</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
            {filteredStudents.length === 0 && (
              <li className="py-4 text-center text-gray-500 dark:text-gray-400">
                No se encontraron alumnos para este plan de estudios.
              </li>
            )}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupStudentsModal;
