import React, { useMemo } from 'react';
import { Student, Grade } from '../types';
import { useFirestoreData } from '../hooks/useFirestoreData';

interface StudentReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

const StudentReportCardModal: React.FC<StudentReportCardModalProps> = ({ isOpen, onClose, student }) => {
  const { data: grades } = useFirestoreData<Grade>('grades', isOpen, 'studentId', student.id);

  const studentGrades = useMemo(() => {
    return grades.filter(g => g.studentId === student.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [grades, student.id]);

  const averageGrade = useMemo(() => {
    if (studentGrades.length === 0) return 0;
    const sum = studentGrades.reduce((acc, curr) => acc + curr.grade, 0);
    return (sum / studentGrades.length).toFixed(2);
  }, [studentGrades]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 print:p-0 print:bg-white print:static print:inset-auto" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl transform transition-all flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Boleta de Calificaciones
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible" id="printable-report-card">
          <div className="flex justify-between items-start mb-8">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 print:text-black">CESS PLANTEL CHIHUAHUA</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 print:text-black">Centro de Estudios Superiores de Salud</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 print:text-black">Chihuahua, Chih. México</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 print:text-black">BOLETA DE CALIFICACIONES</h2>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 print:text-black">Ciclo Escolar {new Date().getFullYear()}</p>
            </div>
          </div>

          <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 print:bg-white print:border-black print:rounded-none grid grid-cols-2 gap-4 text-sm text-gray-800 dark:text-gray-200 print:text-black">
            <div>
              <p className="mb-1"><span className="font-bold uppercase text-xs text-gray-500 dark:text-gray-400 print:text-black">Alumno:</span></p>
              <p className="text-base font-bold">{student.apellidoPaterno} {student.apellidoMaterno} {student.nombre}</p>
              <p className="mt-2"><span className="font-bold uppercase text-xs text-gray-500 dark:text-gray-400 print:text-black">CURP:</span> {student.curp}</p>
            </div>
            <div className="text-right">
              <p className="mb-1"><span className="font-bold uppercase text-xs text-gray-500 dark:text-gray-400 print:text-black">Plan de Estudios:</span></p>
              <p className="text-base font-bold">{student.studyPlan}</p>
              <p className="mt-2"><span className="font-bold uppercase text-xs text-gray-500 dark:text-gray-400 print:text-black">Estatus:</span> {student.status}</p>
            </div>
          </div>

          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:divide-black border border-gray-200 dark:border-gray-700 print:border-black">
            <thead className="bg-gray-100 dark:bg-gray-800 print:bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 print:text-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 print:border-black">Materia / Asignatura</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 print:text-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 print:border-black">Docente</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 dark:text-gray-300 print:text-black uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 print:border-black">Calificación</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 print:bg-white divide-y divide-gray-200 dark:divide-gray-800 print:divide-black">
              {studentGrades.map(grade => (
                <tr key={grade.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 print:text-black">
                    {grade.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 print:text-black">
                    {grade.teacherName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-gray-100 print:text-black">
                    {grade.grade.toFixed(1)}
                  </td>
                </tr>
              ))}
              {studentGrades.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400 print:text-black italic">
                    No se han registrado calificaciones para el periodo actual.
                  </td>
                </tr>
              )}
            </tbody>
            {studentGrades.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-800 print:bg-gray-100">
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 print:border-black">
                  <td colSpan={2} className="px-6 py-4 text-right text-sm font-black text-gray-900 dark:text-gray-100 print:text-black uppercase">
                    Promedio General:
                  </td>
                  <td className="px-6 py-4 text-center text-lg font-black text-indigo-600 dark:text-indigo-400 print:text-black">
                    {averageGrade}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className="mt-24 grid grid-cols-2 gap-16 print:mt-32">
            <div className="text-center">
              <div className="border-t border-black mx-auto w-48 mb-2"></div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 print:text-black uppercase">Firma del Alumno</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black mx-auto w-48 mb-2"></div>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 print:text-black uppercase">Sello y Firma de Dirección</p>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 print:border-black text-center text-[10px] text-gray-400 dark:text-gray-500 print:text-black uppercase tracking-widest">
            <p>Este documento es para fines informativos y no sustituye al certificado oficial.</p>
            <p className="mt-1">Generado el {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReportCardModal;
