import React, { useState, useMemo } from 'react';
import { Student, StudentStatus, Group, SubjectAssignment, StudyPlan } from '../types';
import { EditIcon } from './icons/EditIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import StudentReportCardModal from './StudentReportCardModal';
import { getStudentPeriod } from '../utils/studentPeriods';

interface StudentDetailsProps {

  student: Student;
  groups: Group[];
  subjectAssignments: SubjectAssignment[];
  onEdit: (student: Student) => void;
  onDelete: (studentId: string) => void;
}

const DetailItem: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 dark:text-white font-semibold">{value}</dd>
    </div>
);

const StudentDetails: React.FC<StudentDetailsProps> = ({ student, groups, subjectAssignments, onEdit, onDelete }) => {
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const { nombre, apellidoPaterno, apellidoMaterno, status, curp, studyPlan, enrollmentDate, courseStartDate, fechaNacimiento, calle, numero, colonia, telefono } = student;
  
  const studentGroups = useMemo(() => {
    return groups.filter(g => g.studentIds?.includes(student.id));
  }, [groups, student.id]);

  const studentSchedule = useMemo(() => {
    const groupIds = studentGroups.map(g => g.id);
    return subjectAssignments
      .filter(sa => groupIds.includes(sa.groupId))
      .sort((a, b) => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        if (a.classDay !== b.classDay) return days.indexOf(a.classDay) - days.indexOf(b.classDay);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [subjectAssignments, studentGroups]);

  const handleDownloadSchedule = () => {
    if (studentSchedule.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Día,Materia,Horario,Docente\n";
    
    studentSchedule.forEach(sa => {
      csvContent += `${sa.classDay},${sa.subjectName},${sa.startTime} - ${sa.endTime},${sa.teacherName}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Horario_${student.nombre}_${student.apellidoPaterno}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const statusBadge = (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        status === StudentStatus.Active 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
    }`}>
      {status}
    </span>
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No especificada';
    // Agregamos un día para corregir el desfase de zona horaria en la visualización
    const dateObj = new Date(dateString);
    dateObj.setDate(dateObj.getDate() + 1);
    return dateObj.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const fullAddress = calle && numero && colonia ? `${calle} ${numero}, ${colonia}` : 'No especificada';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detalles del Alumno
            </h2>
            <div className="flex space-x-2">
              <button
                  onClick={() => setIsReportCardOpen(true)}
                  title="Ver e imprimir boleta de calificaciones"
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                  <PrinterIcon className="w-4 h-4 mr-2" />
                  Boleta
              </button>
              <button
                  onClick={() => onEdit(student)}
                  title="Editar información del alumno"
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900"
                  aria-label="Editar alumno"
              >
                  <EditIcon className="w-5 h-5" />
              </button>
              <button
                  onClick={() => onDelete(student.id)}
                  title="Eliminar este alumno"
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900"
                  aria-label="Eliminar alumno"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
              </button>
            </div>
        </div>
        <div className="p-4 sm:p-6">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nombre Completo</dt>
                    <dd className="mt-1 text-lg text-gray-900 dark:text-white font-bold">{`${nombre} ${apellidoPaterno} ${apellidoMaterno}`}</dd>
                </div>
                <DetailItem label="Matrícula" value={student.matricula || 'No asignada'} />
                <DetailItem label="CURP" value={curp} />
                <DetailItem label="Estado" value={statusBadge} />
                <DetailItem label="Fecha de Nacimiento" value={formatDate(fechaNacimiento)} />
                <DetailItem label="Número Celular" value={telefono || 'No especificado'} />
                <div className="sm:col-span-2">
                    <DetailItem label="Dirección" value={fullAddress} />
                </div>
                <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan de Estudios</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white flex items-center">
                      {studyPlan || 'No especificado'}
                      {student.hasScholarship && (studyPlan === StudyPlan.GeneralNursing || studyPlan === StudyPlan.LevelingDegree) && (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Con Beca
                        </span>
                      )}
                    </dd>
                </div>
                <DetailItem label="Fecha de Inscripción" value={formatDate(enrollmentDate)} />
                <DetailItem label="Inicio de Curso" value={formatDate(courseStartDate)} />
                <DetailItem 
                  label={studyPlan === StudyPlan.NursingAssistant ? "Semestre Actual" : "Periodo Actual"} 
                  value={
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                      {getStudentPeriod(courseStartDate, studyPlan)}
                    </span>
                  }
                />
                
                {student.scannedDocuments && student.scannedDocuments.length > 0 && (
                  <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Expediente Físico (Referencias)</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {student.scannedDocuments.map((doc, index) => (
                          <li key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                            <span className="font-medium truncate" title={doc.name}>📄 {doc.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={doc.path}>{doc.path}</span>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
            </dl>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Horario de Clases</h3>
            <button 
              onClick={handleDownloadSchedule}
              disabled={studentSchedule.length === 0}
              className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 py-1 px-3 rounded transition-colors disabled:opacity-50"
            >
              Descargar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {studentSchedule.length > 0 ? (
                  studentSchedule.map(sa => (
                    <tr key={sa.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{sa.classDay}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sa.startTime} - {sa.endTime}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{sa.subjectName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sa.teacherName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 italic">No hay materias asignadas a este alumno aún</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {isReportCardOpen && (
          <StudentReportCardModal
            isOpen={isReportCardOpen}
            onClose={() => setIsReportCardOpen(false)}
            student={student}
          />
        )}
    </div>
  );
};

export default StudentDetails;