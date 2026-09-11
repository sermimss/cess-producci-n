import React, { useRef } from 'react';
import { Group, Student } from '../types';
import { Edit2, Trash2, Users, Calendar, Printer, X } from 'lucide-react';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  students: Student[];
  onEdit: (group: Group) => void;
  onDelete: (id: string) => void;
  onManageStudents: (group: Group) => void;
  onViewSchedule: (group: Group) => void;
}

const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  isOpen, onClose, group, students, onEdit, onDelete, onManageStudents, onViewSchedule
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !group) return null;

  const groupStudents = students.filter(s => group.studentIds?.includes(s.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 print:p-0 print:bg-white print:inset-auto print:relative print:block">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {group.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {group.studyPlan} | {group.classDay} de {group.scheduleStart} a {group.scheduleEnd} | Salón: {group.classroom}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-4 flex flex-wrap gap-2 justify-center border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 print:hidden">
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Lista
          </button>
          <button onClick={() => { onClose(); onViewSchedule(group); }} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Calendar className="w-4 h-4 mr-2" /> Ver Horario
          </button>
          <button onClick={() => { onClose(); onManageStudents(group); }} className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Users className="w-4 h-4 mr-2" /> Gestionar Alumnos
          </button>
          <button onClick={() => { onClose(); onEdit(group); }} className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Edit2 className="w-4 h-4 mr-2" /> Editar Grupo
          </button>
          <button onClick={() => { onClose(); onDelete(group.id); }} className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4 mr-2" /> Eliminar Grupo
          </button>
        </div>

        <div className="flex-1 overflow-y-auto print:overflow-visible print:block p-6" ref={printRef}>
          <div className="print-only mb-4 hidden">
            <h2 className="text-2xl font-bold text-center mb-2">{group.name}</h2>
            <p className="text-center text-gray-600 mb-4">{group.studyPlan} - {group.classDay} de {group.scheduleStart} a {group.scheduleEnd}</p>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Lista de Alumnos ({groupStudents.length})</h3>
          {groupStudents.length > 0 ? (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12 text-center">No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre Completo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden print:table-cell">Firma</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {groupStudents.sort((a,b) => (a.apellidoPaterno + ' ' + a.apellidoMaterno + ' ' + a.nombre).localeCompare(b.apellidoPaterno + ' ' + b.apellidoMaterno + ' ' + b.nombre)).map((student, index) => (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {student.apellidoPaterno} {student.apellidoMaterno} {student.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm border-b border-gray-300 hidden print:table-cell w-48"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No hay alumnos inscritos en este grupo.</p>
          )}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { margin: 1.5cm; }
              .print-only { display: block !important; }
              body * { visibility: hidden; }
              .fixed { position: absolute; }
              .fixed * { visibility: visible; }
              .fixed { left: 0; top: 0; width: 100%; height: auto !important; min-height: 100%; background: white !important; overflow: visible !important; }
              .max-h-\\[90vh\\] { max-height: none !important; }
              button, .bg-gray-100 { display: none !important; }
            }
          `}} />
        </div>
      </div>
    </div>
  );
};

export default GroupDetailModal;
