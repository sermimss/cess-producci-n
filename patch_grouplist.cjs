const fs = require('fs');

const code = `import React, { useState, useMemo } from 'react';
import { Group, StudyPlanFilter, Student, StudyPlan, StudentSchedule } from '../types';
import { Users, Eye, Printer, Clock, GraduationCap } from 'lucide-react';

interface GroupListProps {
  groups: Group[];
  students: Student[];
  studyPlanFilter: StudyPlanFilter;
  onViewDetails: (group: Group) => void;
  onAuditGroups?: () => void;
}

const PLAN_DURATION_MONTHS: Record<string, number> = {
  [StudyPlan.GeneralNursing]: 36, // 3 años
  [StudyPlan.LevelingDegree]: 12, // 1 año
  [StudyPlan.Podiatry]: 12,
  [StudyPlan.PrehospitalCare]: 12,
  [StudyPlan.NursingAssistant]: 12,
  [StudyPlan.SurgicalNursing]: 12,
  [StudyPlan.IndustrialNursing]: 12,
};

const GroupList: React.FC<GroupListProps> = ({ groups, students, studyPlanFilter, onViewDetails, onAuditGroups }) => {
  const [printingGroup, setPrintingGroup] = useState<Group | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePrintList = (group: Group) => {
    setPrintingGroup(group);
    setTimeout(() => {
      window.print();
      setPrintingGroup(null);
    }, 300);
  };

  const getGroupStatusInfo = (group: Group) => {
    const groupStudents = students.filter(s => group.studentIds?.includes(s.id));
    if (groupStudents.length === 0) return { active: true, endDate: null, currentTerm: null, isQuarterly: false };

    const startDates = groupStudents
      .map(s => s.courseStartDate ? new Date(s.courseStartDate) : null)
      .filter(d => d !== null && !isNaN(d.getTime())) as Date[];
    
    if (startDates.length === 0) return { active: true, endDate: null, currentTerm: null, isQuarterly: false };

    const startDate = new Date(Math.min(...startDates.map(d => d.getTime())));
    const durationMonths = PLAN_DURATION_MONTHS[group.studyPlan] || 12;
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    
    const today = new Date();
    const active = today <= endDate;

    const isQuarterly = group.studyPlan === StudyPlan.LevelingDegree || group.studyPlan === StudyPlan.GeneralNursing;
    const termMonths = isQuarterly ? 4 : 6;
    
    const monthsPassed = (today.getFullYear() - startDate.getFullYear()) * 12 + today.getMonth() - startDate.getMonth();
    const maxTerms = Math.ceil(durationMonths / termMonths);
    let currentTerm = Math.floor(monthsPassed / termMonths) + 1;
    
    if (currentTerm > maxTerms) currentTerm = maxTerms;
    if (currentTerm < 1) currentTerm = 1;

    return { active, endDate, currentTerm, isQuarterly };
  };

  const { activeGroups, inactiveGroups } = useMemo(() => {
    const filtered = groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             group.generation.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlan = studyPlanFilter === 'Todos' || group.studyPlan === studyPlanFilter;
      return matchesSearch && matchesPlan;
    });

    const withStatus = filtered.map(group => ({
      ...group,
      statusInfo: getGroupStatusInfo(group)
    }));

    const active = withStatus.filter(g => g.statusInfo.active);
    const inactive = withStatus.filter(g => !g.statusInfo.active);

    // Sort inactive groups chronologically: most recently graduated first
    inactive.sort((a, b) => {
      const dateA = a.statusInfo.endDate ? a.statusInfo.endDate.getTime() : 0;
      const dateB = b.statusInfo.endDate ? b.statusInfo.endDate.getTime() : 0;
      return dateB - dateA;
    });

    return { activeGroups: active, inactiveGroups: inactive };
  }, [groups, students, searchTerm, studyPlanFilter]);

  // Agrupar por StudentSchedule (Turno) solo activos
  const groupedBySchedule = useMemo(() => {
    const grouped = {} as Record<string, typeof activeGroups>;
    
    const orderedSchedules = [
      StudentSchedule.SAT_MAT,
      StudentSchedule.SAT_VESP,
      StudentSchedule.SUN_MAT,
      StudentSchedule.MWF_9_12,
      StudentSchedule.TJ_4_7
    ];
    
    orderedSchedules.forEach(schedule => {
      grouped[schedule] = [];
    });

    activeGroups.forEach(group => {
      const sched = group.schedule || 'Otro Turno';
      if (!grouped[sched]) grouped[sched] = [];
      grouped[sched].push(group);
    });

    // Remover turnos vacíos
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) delete grouped[key];
    });

    return grouped;
  }, [activeGroups]);

  return (
    <div className="bg-transparent print:bg-white flex flex-col space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 print:hidden border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Grupos y Salones</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organizados por turno (Horario General)</p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {onAuditGroups && (
              <button
                onClick={onAuditGroups}
                title="Revisar y reorganizar los grupos y alumnos actuales"
                className="w-full sm:w-auto flex justify-center items-center px-4 py-2 shadow-sm text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Auditar Grupos
              </button>
            )}
            <input
              type="text"
              placeholder="Buscar grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {activeGroups.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 print:hidden">
          No se encontraron grupos activos que coincidan con los filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 print:hidden">
          {Object.entries(groupedBySchedule).map(([schedule, schedGroups]) => (
            <div key={schedule} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              <div className="bg-indigo-600 dark:bg-indigo-700 px-4 py-3">
                <h3 className="text-lg font-black text-white uppercase tracking-wider text-center">{schedule}</h3>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto max-h-[800px] bg-gray-50/50 dark:bg-gray-900/20">
                {schedGroups.map(group => (
                  <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm p-4 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
                    
                    {group.statusInfo.currentTerm !== null && (
                      <div className="absolute top-0 right-0 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                        {group.statusInfo.isQuarterly ? 'Cuatri' : 'Sem'} {group.statusInfo.currentTerm}
                      </div>
                    )}
                    
                    <h4 className="text-md font-bold text-gray-900 dark:text-gray-100 pr-20">{group.name}</h4>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase mt-1">{group.studyPlan}</p>
                    
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{group.scheduleStart} - {group.scheduleEnd} | Salón: <span className="font-bold">{group.classroom || 'N/A'}</span></span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <Users className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{group.studentIds?.length || 0} Alumnos</span>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => handlePrintList(group)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-md text-xs font-bold transition-colors"
                        title="Imprimir Lista de Asistencia"
                      >
                        <Printer className="w-4 h-4 mr-1.5" />
                        Lista
                      </button>
                      <button
                        onClick={() => onViewDetails(group)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md text-xs font-bold transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Detalles
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {inactiveGroups.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 print:hidden overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg">
              <GraduationCap className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Grupos Inactivos (Graduados / Vencidos)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Ordenados cronológicamente, del más reciente al más antiguo.</p>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
            {inactiveGroups.map(group => (
              <div key={group.id} className="p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-md font-bold text-gray-900 dark:text-gray-100">{group.name}</h4>
                    <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                      Inactivo
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>{group.studyPlan}</span>
                    <span>&bull;</span>
                    <span>
                      Graduación aprox: <span className="font-medium text-gray-700 dark:text-gray-300">
                        {group.statusInfo.endDate ? group.statusInfo.endDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) : 'Desconocida'}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0 flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handlePrintList(group)}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-md text-sm font-bold transition-colors"
                  >
                    <Printer className="w-4 h-4 mr-1.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => onViewDetails(group)}
                    className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md text-sm font-bold transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {printingGroup && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8 z-50">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold uppercase">CESS PLANTEL CHIHUAHUA</h1>
            <h2 className="text-xl font-bold mt-2">Lista de Asistencia</h2>
            <p className="mt-2 text-lg font-semibold">{printingGroup.name} - {printingGroup.studyPlan}</p>
            <p className="text-md text-gray-700">{printingGroup.classDay} de {printingGroup.scheduleStart} a {printingGroup.scheduleEnd} | Salón: {printingGroup.classroom}</p>
          </div>
          <table className="w-full border-collapse border border-black text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-4 py-2 text-center w-12">No.</th>
                <th className="border border-black px-4 py-2 text-center w-32">Matrícula</th>
                <th className="border border-black px-4 py-2 text-left">Nombre Completo</th>
                <th className="border border-black px-4 py-2 text-center w-48">Firma</th>
              </tr>
            </thead>
            <tbody>
              {students
                .filter(s => printingGroup.studentIds?.includes(s.id))
                .sort((a,b) => (a.apellidoPaterno + ' ' + a.apellidoMaterno + ' ' + a.nombre).localeCompare(b.apellidoPaterno + ' ' + b.apellidoMaterno + ' ' + b.nombre))
                .map((student, idx) => (
                <tr key={student.id}>
                  <td className="border border-black px-4 py-2 text-center">{idx + 1}</td>
                  <td className="border border-black px-4 py-2 text-center font-mono">{student.matricula}</td>
                  <td className="border border-black px-4 py-2">{student.apellidoPaterno} {student.apellidoMaterno} {student.nombre}</td>
                  <td className="border border-black px-4 py-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <style dangerouslySetInnerHTML={{__html: \`
            @media print {
              @page { margin: 1cm; size: portrait; }
              body * { visibility: hidden; }
              .print\\\\:block, .print\\\\:block * { visibility: visible; }
              .print\\\\:block { position: absolute; left: 0; top: 0; width: 100%; background: white !important; min-height: 100vh; }
              .overflow-hidden { overflow: visible !important; }
            }
          \`}} />
        </div>
      )}
    </div>
  );
};

export default GroupList;
`;

fs.writeFileSync('components/GroupList.tsx', code);
