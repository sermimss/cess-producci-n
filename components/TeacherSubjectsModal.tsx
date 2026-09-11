import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, Group, SubjectAssignment, ClassDay, StudyPlanSubject } from '../types';
import { X } from 'lucide-react';
import { useModal } from './ModalProvider';
import { useFirestoreData } from '../hooks/useFirestoreData';

interface TeacherSubjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  groups: Group[];
  subjectAssignments: SubjectAssignment[];
  onAddSubject: (assignment: Omit<SubjectAssignment, 'id' | 'createdAt'>) => void;
  onDeleteSubject: (id: string) => void;
}

const TeacherSubjectsModal: React.FC<TeacherSubjectsModalProps> = ({
  isOpen,
  onClose,
  teacher,
  groups,
  subjectAssignments,
  onAddSubject,
  onDeleteSubject,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [classDay, setClassDay] = useState<ClassDay>(ClassDay.Monday);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const { data: studyPlanSubjects } = useFirestoreData<StudyPlanSubject>('studyPlanSubjects', true);

  const teacherSubjects = useMemo(() => {
    if (!teacher) return [];
    return subjectAssignments
      .filter(sa => sa.teacherName === teacher.name)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subjectAssignments, teacher]);

  const teacherGroups = useMemo(() => {
    if (!teacher) return [];
    return groups.filter(g => g.teachers?.includes(teacher.name));
  }, [groups, teacher]);

  const selectedGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId);
  }, [groups, selectedGroupId]);

  const availableSubjects = useMemo(() => {
    if (!selectedGroup) return [];
    return studyPlanSubjects.filter(s => s.studyPlan === selectedGroup.studyPlan).sort((a, b) => a.term - b.term);
  }, [studyPlanSubjects, selectedGroup]);

  // Reset selected subject when group changes
  useEffect(() => {
    setSelectedSubjectId('');
  }, [selectedGroupId]);

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher || !selectedGroupId || !selectedSubjectId || !startTime || !endTime) {
      showAlert('Por favor, completa todos los campos.', 'Error');
      return;
    }

    const selectedSubject = availableSubjects.find(s => s.id === selectedSubjectId);
    if (!selectedSubject) return;

    onAddSubject({
      userId: teacher.userId,
      groupId: selectedGroupId,
      teacherName: teacher.name,
      subjectName: selectedSubject.name,
      classDay: classDay,
      startTime: startTime,
      endTime: endTime,
      term: selectedSubject.term,
    });

    setSelectedSubjectId('');
    setStartTime('');
    setEndTime('');
  };

  if (!isOpen || !teacher) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Cargar Materias: {teacher.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Asigna materias a este docente en los grupos donde está registrado.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Formulario para agregar materia */}
          <div className="w-full md:w-1/3">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Nueva Materia</h3>
            
            {teacherGroups.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg text-sm">
                Este docente no está asignado a ningún grupo. Primero debes asignarlo a un grupo desde la sección de Grupos.
              </div>
            ) : (
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grupo</label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                    required
                  >
                    <option value="" disabled>Selecciona un grupo</option>
                    {teacherGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Materia</label>
                  {selectedGroup ? (
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                      required
                    >
                      <option value="" disabled>Selecciona una materia</option>
                      {availableSubjects.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.term}º {selectedGroup.studyPlan.includes('Licenciatura') || selectedGroup.studyPlan.includes('Enfermería General') ? 'Cuatrimestre' : 'Semestre'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-1 text-sm text-gray-500 italic">Selecciona un grupo primero</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Día de Clase</label>
                  <select
                    value={classDay}
                    onChange={(e) => setClassDay(e.target.value as ClassDay)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  >
                    {Object.values(ClassDay).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora Inicio</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora Fin</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Asignar Materia
                </button>
              </form>
            )}
          </div>

          {/* Lista de materias asignadas */}
          <div className="w-full md:w-2/3">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Materias Asignadas</h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grupo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teacherSubjects.length > 0 ? (
                      teacherSubjects.map(subject => {
                        const group = groups.find(g => g.id === subject.groupId);
                        return (
                          <tr key={subject.id}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {group ? group.name : 'Grupo Desconocido'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {subject.subjectName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {subject.classDay} {subject.startTime}-{subject.endTime}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <button
                                onClick={async () => {
                                  if(await showConfirm('¿Eliminar esta materia?')) onDeleteSubject(subject.id);
                                }}
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 italic">
                          No hay materias asignadas a este docente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSubjectsModal;
