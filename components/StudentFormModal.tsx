
import React, { useState, useEffect } from 'react';
import { Student, StudentStatus, StudyPlan, ScannedDocument, StudentSchedule } from '../types';
import { useModal } from './ModalProvider';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Omit<Student, 'id' | 'paymentPlanStatus'>) => void;
  student: Student | null;
}

const StudentFormModal: React.FC<StudentFormModalProps> = ({ isOpen, onClose, onSave, student }) => {
  const { showAlert } = useModal();
  const [nombre, setNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [colonia, setColonia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [schedule, setSchedule] = useState<StudentSchedule>(StudentSchedule.MWF_9_12);
  const [status, setStatus] = useState<StudentStatus>(StudentStatus.Active);
  const [curp, setCurp] = useState('');
  const [studyPlan, setStudyPlan] = useState<StudyPlan>(StudyPlan.GeneralNursing);
  const [hasScholarship, setHasScholarship] = useState(false);
  const [subjectsCleared, setSubjectsCleared] = useState(false);
  const [enrollmentDate, setEnrollmentDate] = useState('');
  const [courseStartDate, setCourseStartDate] = useState('');
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [newDocName, setNewDocName] = useState('');
  const [newDocPath, setNewDocPath] = useState('');


  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (student) {
      setNombre(student.nombre);
      setApellidoPaterno(student.apellidoPaterno);
      setApellidoMaterno(student.apellidoMaterno);
      setFechaNacimiento(student.fechaNacimiento);
      setCalle(student.calle || '');
      setNumero(student.numero || '');
      setColonia(student.colonia || '');
      setTelefono(student.telefono || '');
      setSchedule(student.schedule || StudentSchedule.MWF_9_12);
      setStatus(student.status);
      setCurp(student.curp || '');
      setStudyPlan(student.studyPlan || StudyPlan.GeneralNursing);
      setHasScholarship(student.hasScholarship || false);
      setSubjectsCleared(student.subjectsCleared || false);
      setEnrollmentDate(student.enrollmentDate || today);
      setCourseStartDate(student.courseStartDate || today);
      setScannedDocuments(student.scannedDocuments || []);
    } else {
      setNombre('');
      setApellidoPaterno('');
      setApellidoMaterno('');
      setFechaNacimiento('');
      setCalle('');
      setNumero('');
      setColonia('');
      setTelefono('');
      setSchedule(StudentSchedule.MWF_9_12);
      setStatus(StudentStatus.Active);
      setCurp('');
      setStudyPlan(StudyPlan.GeneralNursing);
      setHasScholarship(false);
      setSubjectsCleared(false);
      setEnrollmentDate(today);
      setCourseStartDate(today);
      setScannedDocuments([]);
      setNewDocName('');
      setNewDocPath('');
    }
  }, [student, isOpen]);

  const addDocumentReference = () => {
    if (!newDocName.trim() || !newDocPath.trim()) return;
    setScannedDocuments(prev => [...prev, { name: newDocName.trim(), path: newDocPath.trim() }]);
    setNewDocName('');
    setNewDocPath('');
  };

  const removeDocument = (index: number) => {
    setScannedDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const validateCurp = (curp: string): { isValid: boolean; message: string } => {
    const curpUpper = curp.trim().toUpperCase();
    
    // 1. Validar formato básico (Regex oficial)
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$/;
    if (!curpRegex.test(curpUpper)) {
      return { isValid: false, message: 'El formato de la CURP es incorrecto.' };
    }

    // 2. Validar dígito verificador (Algoritmo oficial de RENAPO)
    const dictionary = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = curpUpper.charAt(i);
      const val = dictionary.indexOf(char);
      sum += val * (18 - i);
    }
    
    const factor = 10 - (sum % 10);
    const checkDigit = factor === 10 ? 0 : factor;
    const lastDigit = parseInt(curpUpper.charAt(17));

    if (checkDigit !== lastDigit) {
      return { isValid: false, message: 'La CURP no es válida (error en dígito verificador).' };
    }

    return { isValid: true, message: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellidoPaterno.trim() || !apellidoMaterno.trim()) {
      await showAlert('Por favor, introduce el nombre completo del alumno.', 'Campos requeridos');
      return;
    }
    
    const curpValidation = validateCurp(curp);
    if (!curpValidation.isValid) {
      await showAlert(curpValidation.message + '\n\nPor favor, verifica que la CURP sea correcta según tu documento oficial.', 'CURP Inválida');
      return;
    }

    const toProperCase = (str: string) => {
      return str.toLowerCase().replace(/(?:^|[\s-])\S/g, match => match.toUpperCase());
    };

    const formattedNombre = toProperCase(nombre.trim());
    const formattedApellidoPaterno = toProperCase(apellidoPaterno.trim());
    const formattedApellidoMaterno = toProperCase(apellidoMaterno.trim());

    const finalHasScholarship = (studyPlan === StudyPlan.GeneralNursing || studyPlan === StudyPlan.LevelingDegree) ? hasScholarship : false;
    onSave({
      nombre: formattedNombre,
      apellidoPaterno: formattedApellidoPaterno,
      apellidoMaterno: formattedApellidoMaterno,
      fechaNacimiento, calle, numero, colonia, telefono, status, curp: curp.toUpperCase(), studyPlan, schedule, enrollmentDate, courseStartDate, scannedDocuments, hasScholarship: finalHasScholarship, subjectsCleared
    });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{student ? 'Editar Alumno' : 'Añadir Nuevo Alumno'}</h2>
          <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto pr-2">
            <div className="space-y-4">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre(s)</label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Ej. Juan"
                />
              </div>
               <div>
                <label htmlFor="apellidoPaterno" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido Paterno</label>
                <input
                  type="text"
                  id="apellidoPaterno"
                  value={apellidoPaterno}
                  onChange={(e) => setApellidoPaterno(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Ej. Pérez"
                />
              </div>
               <div>
                <label htmlFor="apellidoMaterno" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Apellido Materno</label>
                <input
                  type="text"
                  id="apellidoMaterno"
                  value={apellidoMaterno}
                  onChange={(e) => setApellidoMaterno(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Ej. García"
                />
              </div>
              <div>
                <label htmlFor="fechaNacimiento" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Nacimiento</label>
                <input
                  type="date"
                  id="fechaNacimiento"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                />
              </div>
              <div>
                <label htmlFor="calle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Calle</label>
                <input
                  type="text"
                  id="calle"
                  value={calle}
                  onChange={(e) => setCalle(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  placeholder="Ej. Av. Siempre Viva"
                />
              </div>
              <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                <input
                  type="text"
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  placeholder="Ej. 123"
                />
              </div>
               <div>
                <label htmlFor="colonia" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Colonia</label>
                <input
                  type="text"
                  id="colonia"
                  value={colonia}
                  onChange={(e) => setColonia(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  placeholder="Ej. Springfield"
                />
              </div>
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número Celular</label>
                <input
                  type="tel"
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Ej. 55 1234 5678"
                />
              </div>
              <div>
                <label htmlFor="curp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">CURP</label>
                <input
                  type="text"
                  id="curp"
                  value={curp}
                  onChange={(e) => setCurp(e.target.value.toUpperCase())}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  placeholder="Clave Única de Registro de Población"
                  maxLength={18}
                  minLength={18}
                />
              </div>
              <div>
                <label htmlFor="enrollmentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Inscripción</label>
                <input
                  type="date"
                  id="enrollmentDate"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                />
              </div>
              <div>
                <label htmlFor="courseStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Inicio de Curso</label>
                <input
                  type="date"
                  id="courseStartDate"
                  value={courseStartDate}
                  onChange={(e) => setCourseStartDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                />
              </div>
              <div>
                <label htmlFor="studyPlan" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Plan de Estudios</label>
                <select
                  id="studyPlan"
                  value={studyPlan}
                  onChange={(e) => setStudyPlan(e.target.value as StudyPlan)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                >
                  {Object.values(StudyPlan).map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>

              {(studyPlan === StudyPlan.GeneralNursing || studyPlan === StudyPlan.LevelingDegree) && (
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="hasScholarship"
                    checked={hasScholarship}
                    onChange={(e) => setHasScholarship(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasScholarship" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                    ¿Tiene beca?
                  </label>
                </div>
              )}

              <div>
                <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Horario</label>
                <select
                  id="schedule"
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
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                >
                  {Object.values(StudentStatus).map(stat => (
                    <option key={stat} value={stat}>{stat}</option>
                  ))}
                </select>
              </div>

               <div className="flex items-center space-x-2 mt-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <input
                  type="checkbox"
                  id="subjectsCleared"
                  checked={subjectsCleared}
                  onChange={(e) => setSubjectsCleared(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="subjectsCleared" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Todas sus materias liberadas (Aprobadas)
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expediente Físico (Referencia)</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  La aplicación no almacena los documentos. Anota solo dónde se resguarda cada uno
                  (ej. "Archivero A, carpeta 12" o una ruta de red/unidad compartida).
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Nombre del documento (ej. Acta de nacimiento)"
                    className="flex-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                  <input
                    type="text"
                    value={newDocPath}
                    onChange={(e) => setNewDocPath(e.target.value)}
                    placeholder="Ruta o ubicación (ej. Archivero A / Carpeta 12)"
                    className="flex-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                  <button
                    type="button"
                    onClick={addDocumentReference}
                    disabled={!newDocName.trim() || !newDocPath.trim()}
                    className="bg-white dark:bg-gray-700 py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>

                {scannedDocuments.length > 0 && (
                  <div className="mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase">Referencias registradas</h4>
                      <ul className="space-y-2 mt-2">
                        {scannedDocuments.map((doc, index) => (
                          <li key={index} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md border border-gray-200 dark:border-gray-600">
                            <span className="truncate max-w-[260px]" title={`${doc.name} — ${doc.path}`}>
                                📄 <span className="font-medium">{doc.name}</span>
                                <span className="text-gray-500 dark:text-gray-400"> — {doc.path}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="text-red-500 hover:text-red-700 font-medium text-xs shrink-0 ml-2"
                            >
                              Quitar
                            </button>
                          </li>
                        ))}
                      </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-500 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {student ? 'Guardar Cambios' : 'Añadir Alumno'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentFormModal;