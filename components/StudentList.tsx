import React, { useState, useEffect, useMemo } from 'react';
import { Student, StudentStatus, StudentStatusFilter } from '../types';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { SearchIcon } from './icons/SearchIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import StudentReportCardModal from './StudentReportCardModal';
import { getStudentPeriod } from '../utils/studentPeriods';

interface StudentListProps {
  students: Student[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  onAddStudent: () => void;
  currentFilter: StudentStatusFilter;
  onFilterChange: (filter: StudentStatusFilter) => void;
  onAssignMissingMatriculas?: () => void;
}

const ITEMS_PER_PAGE = 15;

const StudentList: React.FC<StudentListProps> = ({ students, selectedStudentId, onSelectStudent, onAddStudent, currentFilter, onFilterChange, onAssignMissingMatriculas }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [printingStudent, setPrintingStudent] = useState<Student | null>(null);
  
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    
    const term = searchTerm.toLowerCase().trim();
    return students.filter(student => {
      const fullName = `${student.nombre} ${student.apellidoPaterno} ${student.apellidoMaterno}`.toLowerCase();
      return fullName.includes(term);
    });
  }, [students, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStudents]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const filterOptions: { label: string; value: StudentStatusFilter }[] = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Activos', value: StudentStatus.Active },
    { label: 'Bajas', value: StudentStatus.Baja },
    { label: 'Graduados', value: StudentStatus.Graduated },
  ];

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Agrupar graduados por plan de estudio y generación
  const graduatedGroups = useMemo(() => {
    if (currentFilter !== StudentStatus.Graduated) return null;
    const groups: Record<string, Student[]> = {};
    filteredStudents.forEach(student => {
      const key = `${student.studyPlan} - Generación: ${student.courseStartDate}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(student);
    });
    return groups;
  }, [filteredStudents, currentFilter]);


  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-full flex flex-col print:h-auto print:shadow-none print:overflow-visible">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Alumnos</h2>
            <button
                onClick={onAddStudent}
                title="Añadir nuevo alumno"
                className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <UserPlusIcon className="w-5 h-5" />
            </button>
            {onAssignMissingMatriculas && (
              <button
                onClick={onAssignMissingMatriculas}
                title="Regenerar todas las matrículas en orden"
                className="inline-flex ml-2 items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            )}
        </div>

        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
          />
        </div>

        <div className="mt-4 flex items-center border border-gray-200 dark:border-gray-600 rounded-lg p-1 w-full sm:w-auto bg-gray-50 dark:bg-gray-700/50">
            {filterOptions.map(({ label, value }) => (
                <button
                    key={value}
                    onClick={() => onFilterChange(value)}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                        currentFilter === value
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
      </div>
      <div className="overflow-y-auto print:overflow-visible print:block flex-grow">
        {filteredStudents.length === 0 ? (
          <div className="text-center p-8 text-gray-500 h-full flex flex-col justify-center">
            <p>No hay alumnos que coincidan con el filtro.</p>
            <p className="text-sm">Intenta seleccionar otro filtro o cambiar la búsqueda.</p>
          </div>
        ) : graduatedGroups ? (
          <div className="p-4 space-y-6">
            {Object.entries(graduatedGroups as Record<string, Student[]>).map(([groupKey, studentsInGroup]) => (
              <div key={groupKey} className="bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">{groupKey}</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">{(studentsInGroup as Student[]).length} graduados</p>
                </div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(studentsInGroup as Student[]).map(student => (
                    <li key={student.id} className="hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                      <div
                        onClick={() => onSelectStudent(student.id)}
                        className={`w-full text-left p-3 cursor-pointer flex justify-between items-center ${selectedStudentId === student.id ? 'bg-indigo-100/50 dark:bg-indigo-900/40' : ''}`}
                      >
                        <div>
                          <p className={`font-medium text-sm ${selectedStudentId === student.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>
                            {`${student.apellidoPaterno} ${student.apellidoMaterno}, ${student.nombre}`}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex text-[10px] leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2">Graduado</span>
                            {student.matricula && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Mat. {student.matricula}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintingStudent(student);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Imprimir Boleta"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul>
            {paginatedStudents.map(student => (
              <li key={student.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div
                  onClick={() => onSelectStudent(student.id)}
                  className={`w-full text-left p-4 cursor-pointer transition-colors duration-150 ${
                    selectedStudentId === student.id 
                    ? 'bg-indigo-50 dark:bg-indigo-900/50' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-grow">
                      <p className={`font-medium ${selectedStudentId === student.id ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>{`${student.apellidoPaterno} ${student.apellidoMaterno}, ${student.nombre}`}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className={`px-2 inline-flex text-[10px] leading-4 font-semibold rounded-full ${
                            student.status === StudentStatus.Active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : student.status === StudentStatus.Baja
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                        }`}>
                            {student.status}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{student.studyPlan}</span>
                        {student.matricula && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono"> | Mat. {student.matricula}</span>
                        )}
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium ml-1">#{getStudentPeriod(student.courseStartDate, student.studyPlan)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintingStudent(student);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Imprimir Boleta"
                    >
                      <PrinterIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {printingStudent && (
        <StudentReportCardModal
          student={printingStudent}
          onClose={() => setPrintingStudent(null)}
        />
      )}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm">
            <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                Anterior
            </button>
            <span className="text-gray-700 dark:text-gray-300">
                Página {currentPage} de {totalPages}
            </span>
            <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                Siguiente
            </button>
        </div>
      )}
    </div>
  );
};

export default StudentList;
