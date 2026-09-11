import React, { useState, useMemo } from 'react';
import { Group, Student, SubjectAssignment, Grade, ClassDay, Teacher, Payment } from '../types';
import { useFirestoreData } from '../hooks/useFirestoreData';
import { useModal } from './ModalProvider';
import { getNextPendingPaymentInfo } from '../utils/paymentPlans';

interface TeacherPortalProps {
  userId: string;
  groups: Group[];
  students: Student[];
  teacher: Teacher;
  payments: Payment[];
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ userId, groups, students, teacher, payments }) => {
  const { showConfirm } = useModal();
  const selectedTeacher = teacher.name;
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<'materias' | 'calificaciones' | 'alumnos'>('materias');

  // Subject Assignment state
  const { data: subjectAssignments } = useFirestoreData<SubjectAssignment>('subjectAssignments', true, 'teacherName', teacher.name);

  // Grade state
  const { data: grades, addItem: addGradeToDb, deleteItem: deleteGradeFromDb } = useFirestoreData<Grade>('grades', true, 'teacherName', teacher.name);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeValue, setGradeValue] = useState<number | ''>('');
  const [extraordinaryGrade, setExtraordinaryGrade] = useState<number | ''>('');

  const teacherGroups = useMemo(() => {
    if (!selectedTeacher) return [];
    return groups.filter(g => g.teachers?.includes(selectedTeacher));
  }, [groups, selectedTeacher]);

  const getGroupTerm = (group: Group) => {
    if (!group.generation) return 1;
    const startDate = new Date(group.generation);
    const currentDate = new Date();
    
    const isQuarterly = group.studyPlan === 'Licenciatura por Nivelación' || group.studyPlan === 'Enfermería General';
    const monthsPerTerm = isQuarterly ? 4 : 6;
    
    const monthsPassed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
    return Math.max(1, Math.floor(monthsPassed / monthsPerTerm) + 1);
  };

  const groupsByTerm = useMemo(() => {
    const grouped = teacherGroups.reduce((acc, group) => {
      const term = getGroupTerm(group);
      if (!acc[term]) acc[term] = [];
      acc[term].push(group);
      return acc;
    }, {} as Record<number, Group[]>);
    return grouped;
  }, [teacherGroups]);

  const groupTerms = Object.keys(groupsByTerm).map(Number).sort((a, b) => a - b);

  const groupStudents = useMemo(() => {
    if (!selectedGroup) return [];
    return students.filter(s => selectedGroup.studentIds?.includes(s.id));
  }, [students, selectedGroup]);

  const groupSubjects = useMemo(() => {
    if (!selectedGroup) return [];
    return subjectAssignments.filter(s => s.groupId === selectedGroup.id && s.teacherName === selectedTeacher).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subjectAssignments, selectedGroup, selectedTeacher]);

  const subjectsByTerm = useMemo(() => {
    const grouped = groupSubjects.reduce((acc, subject) => {
      const term = subject.term || 0;
      if (!acc[term]) acc[term] = [];
      acc[term].push(subject);
      return acc;
    }, {} as Record<number, typeof groupSubjects>);
    return grouped;
  }, [groupSubjects]);

  const terms = Object.keys(subjectsByTerm).map(Number).sort((a, b) => a - b);

  const groupGrades = useMemo(() => {
    if (!selectedGroup) return [];
    return grades.filter(g => g.groupId === selectedGroup.id && g.teacherName === selectedTeacher);
  }, [grades, selectedGroup, selectedTeacher]);

  const isSubjectUnlocked = (subjectName: string) => {
    const subject = groupSubjects.find(s => s.subjectName === subjectName);
    if (!selectedGroup || !selectedGroup.generation || !subject || !subject.term) return true;
    
    const startDate = new Date(selectedGroup.generation);
    const currentDate = new Date();
    
    const isQuarterly = selectedGroup.studyPlan === 'Licenciatura por Nivelación' || selectedGroup.studyPlan === 'Enfermería General';
    const monthsPerTerm = isQuarterly ? 4 : 6;
    
    const requiredMonthsPassed = (subject.term - 1) * monthsPerTerm;
    
    const monthsPassed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + (currentDate.getMonth() - startDate.getMonth());
    
    return monthsPassed >= requiredMonthsPassed;
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedTeacher || !selectedStudentId || !gradeSubject.trim() || gradeValue === '') return;

    if (!isSubjectUnlocked(gradeSubject)) {
      alert('Esta materia aún no está habilitada para calificar según la fecha de inicio del curso.');
      return;
    }

    const targetStudent = groupStudents.find(s => s.id === selectedStudentId);

    const gradeData: any = {
      userId,
      studentId: selectedStudentId,
      studentEmail: targetStudent?.email || '',
      groupId: selectedGroup.id,
      subject: gradeSubject,
      grade: Number(gradeValue),
      teacherName: selectedTeacher,
      teacherEmail: teacher.email || '',
      createdAt: new Date().toISOString(),
    };

    if (extraordinaryGrade !== '') {
      gradeData.extraordinaryGrade = Number(extraordinaryGrade);
    }

    addGradeToDb(gradeData);

    setSelectedStudentId('');
    setGradeSubject('');
    setGradeValue('');
    setExtraordinaryGrade('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bienvenido, {selectedTeacher}</h2>
          <p className="text-gray-600 dark:text-gray-400">Selecciona un grupo para gestionar materias y calificaciones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Mis Grupos</h3>
          <div className="space-y-4">
            {groupTerms.map(term => (
              <details key={term} className="group" open>
                <summary className="cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-900 dark:hover:text-gray-200 transition-colors list-none flex items-center justify-between">
                  <span>{term}º {teacherGroups.some(g => getGroupTerm(g) === term && (g.studyPlan.includes('Licenciatura') || g.studyPlan.includes('Enfermería General'))) ? 'Cuatrimestre' : 'Semestre'}</span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </span>
                </summary>
                <ul className="space-y-2 mt-2">
                  {groupsByTerm[term].map(group => (
                    <li key={group.id}>
                      <button
                        onClick={() => setSelectedGroup(group)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedGroup?.id === group.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/50 border-l-4 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="font-medium">{group.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{group.classDay} {group.scheduleStart}-{group.scheduleEnd}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {teacherGroups.length === 0 && (
              <div className="text-sm text-gray-500 dark:text-gray-400">No tienes grupos asignados.</div>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          {selectedGroup ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setActiveTab('materias')}
                    className={`${
                      activeTab === 'materias'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                  >
                    Materias
                  </button>
                  <button
                    onClick={() => setActiveTab('calificaciones')}
                    className={`${
                      activeTab === 'calificaciones'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                  >
                    Calificaciones
                  </button>
                  <button
                    onClick={() => setActiveTab('alumnos')}
                    className={`${
                      activeTab === 'alumnos'
                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                  >
                    Alumnos
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'materias' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Materias Asignadas</h4>
                      {groupSubjects.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No hay materias asignadas a este grupo.</p>
                      ) : (
                        <div className="space-y-6">
                          {terms.map(term => (
                            <div key={term}>
                              <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                                {term === 0 ? 'Sin Asignar' : `${term}º ${selectedGroup?.studyPlan.includes('Licenciatura') || selectedGroup?.studyPlan.includes('Enfermería General') ? 'Cuatrimestre' : 'Semestre'}`}
                              </h5>
                              <ul className="space-y-3">
                                {subjectsByTerm[term].map(subject => (
                                  <li key={subject.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h5 className="font-bold text-gray-900 dark:text-gray-100">{subject.subjectName}</h5>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                          {subject.classDay} de {subject.startTime} a {subject.endTime}
                                        </p>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'calificaciones' && (
                  <div className="space-y-6">
                    <form onSubmit={handleAddGrade} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Cargar Calificación</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                            required
                          >
                            <option value="">-- Seleccionar Alumno --</option>
                            {groupStudents.map(s => (
                              <option key={s.id} value={s.id}>{s.apellidoPaterno} {s.apellidoMaterno} {s.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <select
                            value={gradeSubject}
                            onChange={(e) => setGradeSubject(e.target.value)}
                            className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                            required
                          >
                            <option value="">-- Seleccionar Materia --</option>
                            {terms.map(term => (
                              <optgroup key={term} label={term === 0 ? 'Sin Asignar' : `${term}º ${selectedGroup?.studyPlan.includes('Licenciatura') || selectedGroup?.studyPlan.includes('Enfermería General') ? 'Cuatrimestre' : 'Semestre'}`}>
                                {subjectsByTerm[term].map(subject => (
                                  <option key={subject.id} value={subject.subjectName}>{subject.subjectName}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Calificación Ordinaria (0-100)"
                            value={gradeValue}
                            onChange={(e) => setGradeValue(e.target.value === '' ? '' : Number(e.target.value))}
                            className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Extraordinario (Opcional)"
                            value={extraordinaryGrade}
                            onChange={(e) => setExtraordinaryGrade(e.target.value === '' ? '' : Number(e.target.value))}
                            className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Guardar Calificación
                      </button>
                    </form>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Calificaciones del Grupo</h4>
                      {groupStudents.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No hay alumnos en este grupo.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alumno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Materia</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Calificación</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extraordinario</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                              {groupGrades.map(grade => {
                                const student = students.find(s => s.id === grade.studentId);
                                return (
                                  <tr key={grade.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                      {student ? `${student.apellidoPaterno} ${student.apellidoMaterno} ${student.nombre}` : 'Desconocido'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                      {grade.subject}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <span className={`px-2 py-1 rounded-full ${grade.grade >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                        {grade.grade}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      {grade.extraordinaryGrade !== undefined ? (
                                        <span className={`px-2 py-1 rounded-full ${grade.extraordinaryGrade >= 70 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                          {grade.extraordinaryGrade}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                      <button
                                        onClick={async () => {
                                          if(await showConfirm('¿Eliminar esta calificación?')) deleteGradeFromDb(grade.id);
                                        }}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                      >
                                        Eliminar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {groupGrades.length === 0 && (
                                <tr>
                                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No hay calificaciones registradas.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'alumnos' && (
                  <div className="space-y-6">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Alumnos del Grupo</h4>
                    {groupStudents.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No hay alumnos en este grupo.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alumno</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado de Pago</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {groupStudents.map(student => {
                              const nextPayment = getNextPendingPaymentInfo(student, payments);
                              const isLate = nextPayment?.isLate;
                              const statusText = nextPayment ? (isLate ? 'Pendiente / Atrasado' : 'Al día') : 'Al día';
                              const statusClass = nextPayment ? (isLate ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200') : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';

                              return (
                                <tr key={student.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                    {student.apellidoPaterno} {student.apellidoMaterno} {student.nombre}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <span className={`px-2 py-1 rounded-full ${statusClass}`}>
                                      {statusText}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-full flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
              <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Selecciona un Grupo</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
                Elige uno de tus grupos asignados en el panel izquierdo para gestionar sus materiales y calificaciones.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherPortal;
