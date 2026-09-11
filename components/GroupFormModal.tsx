import React, { useState, useEffect } from 'react';
import { Group, StudyPlan, ClassDay, StudentSchedule, Teacher } from '../types';
import { useModal } from './ModalProvider';

export interface GroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: Omit<Group, 'id' | 'userId' | 'name' | 'studentIds'>) => void;
  group: Group | null;
  existingGroups: Group[];
  teachers: Teacher[];
}

const GroupFormModal: React.FC<GroupFormModalProps> = ({ isOpen, onClose, onSave, group, existingGroups, teachers }) => {
  const { showAlert } = useModal();
  const [studyPlan, setStudyPlan] = useState<StudyPlan>(StudyPlan.GeneralNursing);
  const [schedule, setSchedule] = useState<StudentSchedule>(StudentSchedule.MWF_9_12);
  const [generation, setGeneration] = useState('');
  const [classDay, setClassDay] = useState<ClassDay>(ClassDay.Monday);
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [classroom, setClassroom] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  useEffect(() => {
    if (group) {
      setStudyPlan(group.studyPlan);
      setSchedule(group.schedule || StudentSchedule.MWF_9_12);
      setGeneration(group.generation);
      setClassDay(group.classDay);
      setScheduleStart(group.scheduleStart);
      setScheduleEnd(group.scheduleEnd);
      setClassroom(group.classroom);
      setSelectedTeachers(group.teachers || []);
    } else {
      setStudyPlan(StudyPlan.GeneralNursing);
      setSchedule(StudentSchedule.MWF_9_12);
      setGeneration('');
      setClassDay(ClassDay.Monday);
      setScheduleStart('');
      setScheduleEnd('');
      setClassroom('');
      setSelectedTeachers([]);
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generation.trim() || !scheduleStart || !scheduleEnd || !classroom.trim()) {
      await showAlert('Por favor, completa todos los campos requeridos.', 'Error');
      return;
    }

    if (scheduleStart >= scheduleEnd) {
      await showAlert('La hora de inicio debe ser menor a la hora de fin.', 'Error');
      return;
    }

    // Check for duplicate name
    const generatedName = `${studyPlan} - ${generation}`;
    const isDuplicate = existingGroups.some(g => g.name === generatedName && g.id !== group?.id);
    if (isDuplicate) {
      await showAlert(`Ya existe un grupo con el nombre: ${generatedName}`, 'Error');
      return;
    }

    onSave({
      studyPlan,
      schedule,
      generation,
      classDay,
      scheduleStart,
      scheduleEnd,
      classroom,
      teachers: selectedTeachers,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{group ? 'Editar Grupo' : 'Añadir Nuevo Grupo'}</h2>
          <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto pr-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan de Estudio</label>
                <select
                  value={studyPlan}
                  onChange={(e) => setStudyPlan(e.target.value as StudyPlan)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  disabled={!!group} // Cannot change study plan after creation to avoid name conflicts
                >
                  {Object.values(StudyPlan).map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Horario</label>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as StudentSchedule)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                >
                  {Object.values(StudentSchedule).map(sched => (
                    <option key={sched} value={sched}>{sched}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Generación</label>
                <input
                  type="text"
                  value={generation}
                  onChange={(e) => setGeneration(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Ej. 2024-2028"
                  disabled={!!group} // Cannot change generation after creation to avoid name conflicts
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Día de Clases</label>
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
                    value={scheduleStart}
                    onChange={(e) => setScheduleStart(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora Fin</label>
                  <input
                    type="time"
                    value={scheduleEnd}
                    onChange={(e) => setScheduleEnd(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Salón</label>
                <input
                  type="text"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Ej. Aula 101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Docentes Asignados</label>
                {!group ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Disponible después de crear el grupo.
                  </p>
                ) : teachers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No hay docentes registrados en el sistema.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-800/50">
                    {teachers.map(teacher => (
                      <label key={teacher.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeachers([...selectedTeachers, teacher.name]);
                            } else {
                              setSelectedTeachers(selectedTeachers.filter(t => t !== teacher.name));
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{teacher.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GroupFormModal;
