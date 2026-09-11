import React, { useMemo } from 'react';
import { Group, SubjectAssignment } from '../types';
import { X } from 'lucide-react';

interface GroupScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  subjectAssignments: SubjectAssignment[];
}

const GroupScheduleModal: React.FC<GroupScheduleModalProps> = ({ isOpen, onClose, group, subjectAssignments }) => {
  const groupSchedule = useMemo(() => {
    if (!group) return [];
    return subjectAssignments
      .filter(sa => sa.groupId === group.id)
      .sort((a, b) => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        if (a.classDay !== b.classDay) return days.indexOf(a.classDay) - days.indexOf(b.classDay);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [subjectAssignments, group]);

  const handleDownloadSchedule = () => {
    if (groupSchedule.length === 0 || !group) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Día,Materia,Horario,Docente\n";
    
    groupSchedule.forEach(sa => {
      csvContent += `${sa.classDay},${sa.subjectName},${sa.startTime} - ${sa.endTime},${sa.teacherName}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Horario_Grupo_${group.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Horario de Clases: {group.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Salón: {group.classroom}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-end mb-4">
            <button 
              onClick={handleDownloadSchedule}
              disabled={groupSchedule.length === 0}
              className="text-sm bg-indigo-600 text-white hover:bg-indigo-700 py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              Descargar CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {groupSchedule.length > 0 ? (
                  groupSchedule.map(sa => (
                    <tr key={sa.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{sa.classDay}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sa.startTime} - {sa.endTime}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{sa.subjectName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sa.teacherName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 italic">No hay materias asignadas a este grupo aún</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupScheduleModal;
