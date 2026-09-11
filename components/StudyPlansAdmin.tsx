import React, { useState, useMemo } from 'react';
import { StudyPlan, StudyPlanSubject } from '../types';
import { useModal } from './ModalProvider';
import { useFirestoreData } from '../hooks/useFirestoreData';

const StudyPlansAdmin: React.FC = () => {
  const { showAlert, showConfirm } = useModal();
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan>(StudyPlan.GeneralNursing);
  const { data: studyPlanSubjects, addItem: addSubject, updateItem: updateSubject, deleteItem: deleteSubject } = useFirestoreData<StudyPlanSubject>('studyPlanSubjects', true);

  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [newSubjectTerm, setNewSubjectTerm] = useState<number>(1);
  const [editingSubject, setEditingSubject] = useState<StudyPlanSubject | null>(null);

  const isQuarterly = selectedPlan === StudyPlan.LevelingDegree || selectedPlan === StudyPlan.GeneralNursing;
  const termName = isQuarterly ? 'Cuatrimestre' : 'Semestre';

  const subjectsForPlan = useMemo(() => {
    return studyPlanSubjects.filter(s => s.studyPlan === selectedPlan).sort((a, b) => Number(a.term) - Number(b.term));
  }, [studyPlanSubjects, selectedPlan]);

  const terms = Array.from(new Set(subjectsForPlan.map(s => s.term))).sort((a, b) => Number(a) - Number(b));

  const handleAddOrUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      await showAlert('El nombre de la materia es requerido.', 'Error');
      return;
    }

    if (editingSubject) {
      await updateSubject({
        ...editingSubject,
        name: newSubjectName,
        description: newSubjectDescription,
        term: newSubjectTerm,
      });
      setEditingSubject(null);
    } else {
      await addSubject({
        studyPlan: selectedPlan,
        name: newSubjectName,
        description: newSubjectDescription,
        term: newSubjectTerm,
      });
    }

    setNewSubjectName('');
    setNewSubjectDescription('');
    setNewSubjectTerm(1);
    setIsAddingSubject(false);
  };

  const handleEdit = (subject: StudyPlanSubject) => {
    setEditingSubject(subject);
    setNewSubjectName(subject.name);
    setNewSubjectDescription(subject.description);
    setNewSubjectTerm(subject.term);
    setIsAddingSubject(true);
  };

  const handleDelete = async (id: string) => {
    if (await showConfirm('¿Estás seguro de que deseas eliminar esta materia del plan de estudios?')) {
      await deleteSubject(id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Gestión de Planes de Estudio</h2>
        <button
          onClick={handlePrint}
          className="mt-4 sm:mt-0 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Imprimir Plan Completo
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar Plan de Estudio</label>
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value as StudyPlan)}
          className="block w-full max-w-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
        >
          {Object.values(StudyPlan).map(plan => (
            <option key={plan} value={plan}>{plan}</option>
          ))}
        </select>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Este programa está organizado en <strong>{isQuarterly ? 'Cuatrimestres' : 'Semestres'}</strong>.
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => {
            setEditingSubject(null);
            setNewSubjectName('');
            setNewSubjectDescription('');
            setNewSubjectTerm(1);
            setIsAddingSubject(!isAddingSubject);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
        >
          {isAddingSubject ? 'Cancelar' : 'Añadir Materia al Plan'}
        </button>
      </div>

      {isAddingSubject && (
        <form onSubmit={handleAddOrUpdateSubject} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-8 space-y-4 border border-gray-200 dark:border-gray-600">
          <h3 className="font-medium text-lg text-gray-900 dark:text-gray-100">{editingSubject ? 'Editar Materia' : 'Nueva Materia'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la Materia</label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{termName}</label>
              <input
                type="number"
                min="1"
                max="12"
                value={newSubjectTerm}
                onChange={(e) => setNewSubjectTerm(parseInt(e.target.value))}
                className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Breve Descripción</label>
              <textarea
                value={newSubjectDescription}
                onChange={(e) => setNewSubjectDescription(e.target.value)}
                rows={3}
                className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {editingSubject ? 'Actualizar Materia' : 'Guardar Materia'}
          </button>
        </form>
      )}

      {subjectsForPlan.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">No hay materias registradas para este plan de estudios. Haz clic en "Añadir Materia" para comenzar.</p>
      ) : (
        <div className="space-y-8 print:space-y-4">
          {terms.map(term => {
            const termSubjects = subjectsForPlan.filter(s => s.term === term);
            return (
              <div key={term} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{termName} {term}</h3>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {termSubjects.map(subject => (
                    <li key={subject.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                            {subject.name}
                            {subject.description && (
                              <button 
                                onClick={() => showAlert(subject.description, `Descripción: ${subject.name}`)}
                                className="ml-2 text-indigo-500 hover:text-indigo-700 p-1 print:hidden"
                                title="Ver descripción"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              </button>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 print:block hidden">{subject.description}</p>
                        </div>
                        <div className="mt-2 sm:mt-0 flex space-x-3 print:hidden">
                          <button
                            onClick={() => handleEdit(subject)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(subject.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudyPlansAdmin;
