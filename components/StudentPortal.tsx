
import React, { useMemo, useState } from 'react';
import { Student, Payment, Grade, Group, SubjectAssignment, PaymentStatus, StudyPlan } from '../types';
import { STUDY_PLAN_CONFIG, generatePaymentSchedule, calculatePaymentPlanStatus } from '../utils/paymentPlans';
import { useModal } from './ModalProvider';

interface StudentPortalProps {
  student: Student;
  payments: Payment[];
  grades: Grade[];
  groups: Group[];
  subjectAssignments: SubjectAssignment[];
}

const StudentPortal: React.FC<StudentPortalProps> = ({ student, payments, grades, groups, subjectAssignments }) => {
  const { showAlert } = useModal();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // 1. Información Financiera
  const financialInfo = useMemo(() => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const paidPayments = studentPayments
      .filter(p => p.status === PaymentStatus.Paid)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const lastPayment = paidPayments.length > 0 ? paidPayments[0] : null;

    // Calcular adeudo
    // El adeudo se basa en el plan de pagos y lo que no se ha pagado hasta la fecha actual
    const schedule = generatePaymentSchedule(student.courseStartDate, student.studyPlan, student.hasScholarship);
    const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
    const paymentPlanStatus = calculatePaymentPlanStatus(student, payments);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalDebt = 0;
    let nextPaymentDate: string | null = null;

    // Inscripción
    if (!paymentPlanStatus.enrollment) {
      totalDebt += planConfig.prices.enrollment;
      if (student.enrollmentDate && (!nextPaymentDate || new Date(student.enrollmentDate) < new Date(nextPaymentDate))) {
          nextPaymentDate = student.enrollmentDate;
      }
    }

    // Mensualidades/Semanales vencidas
    paymentPlanStatus.schedule.forEach((isPaid, index) => {
      if (!isPaid) {
        const item = schedule[index];
        const dueDate = new Date(item.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        let isLate = false;
        let lateFee = 0;
        
        if (planConfig.feeType === 'Semanalidad') {
          if (today > dueDate) {
            isLate = true;
            lateFee = 50;
          }
        } else if (planConfig.feeType === 'Mensualidad') {
          const targetMonth = dueDate.getMonth();
          const targetYear = dueDate.getFullYear();
          const deadline = new Date(targetYear, targetMonth, 5);
          deadline.setHours(0, 0, 0, 0);
          
          if (today > deadline) {
            isLate = true;
            lateFee = 200;
          }
        }

        let lostScholarshipAmount = 0;
        if (isLate && student.hasScholarship) {
          if (student.studyPlan === StudyPlan.LevelingDegree) {
            lostScholarshipAmount = 300;
          } else if (student.studyPlan === StudyPlan.GeneralNursing) {
            lostScholarshipAmount = 400;
          }
        }

        if (dueDate <= today) {
          totalDebt += item.cost + lateFee + lostScholarshipAmount;
        }

        if (!nextPaymentDate || dueDate < new Date(nextPaymentDate)) {
          nextPaymentDate = item.dueDate.toISOString();
        }
      }
    });

    return {
      totalDebt,
      nextPaymentDate,
      lastPayment
    };
  }, [student, payments]);

  // 2. Información Académica
  const academicInfo = useMemo(() => {
    const studentGroups = groups.filter(g => g.studentIds?.includes(student.id));
    const studentGrades = grades.filter(g => g.studentId === student.id);
    
    return {
      groups: studentGroups,
      grades: studentGrades
    };
  }, [student, grades, groups]);

  const studentSchedule = useMemo(() => {
    const groupIds = academicInfo.groups.map(g => g.id);
    return subjectAssignments
      .filter(sa => groupIds.includes(sa.groupId))
      .sort((a, b) => {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        if (a.classDay !== b.classDay) return days.indexOf(a.classDay) - days.indexOf(b.classDay);
        return a.startTime.localeCompare(b.startTime);
      });
  }, [subjectAssignments, academicInfo.groups]);

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

  const handlePayDebt = async () => {
    if (financialInfo.totalDebt <= 0) return;
    setIsProcessingPayment(true);
    try {
      const response = await fetch('/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Pago de Adeudo - ${student.nombre} ${student.apellidoPaterno}`,
          quantity: 1,
          price: financialInfo.totalDebt,
          studentId: student.id
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar el pago');
      }

      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error: any) {
      console.error(error);
      showAlert(error.message, 'Error al conectar con Mercado Pago');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border-l-4 border-indigo-500">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Portal del Alumno</h2>
        <p className="text-gray-600 dark:text-gray-400">Bienvenido, {student.nombre} {student.apellidoPaterno}. Aquí puedes consultar tu estado financiero y académico.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sección Financiera */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Información Financiera
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monto de Adeudo Actual</p>
                  <p className={`text-2xl font-bold ${financialInfo.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {financialInfo.totalDebt.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </p>
                </div>
                {financialInfo.totalDebt > 0 && (
                  <button
                    onClick={handlePayDebt}
                    disabled={isProcessingPayment}
                    className="bg-[#009ee3] hover:bg-[#008bca] text-white font-semibold py-2 px-4 rounded shadow transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"/>
                      </svg>
                    )}
                    {isProcessingPayment ? 'Procesando...' : 'Pagar Adeudo'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Próxima Fecha de Pago</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {financialInfo.nextPaymentDate ? new Date(financialInfo.nextPaymentDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin pagos pendientes'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Último Pago Realizado</p>
              {financialInfo.lastPayment ? (
                <div>
                  <p className="text-xl font-semibold text-indigo-600">
                    {financialInfo.lastPayment.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {financialInfo.lastPayment.description} - {new Date(financialInfo.lastPayment.date).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 italic">No se han registrado pagos aún</p>
              )}
            </div>
          </div>
        </div>

        {/* Sección Académica */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Información Académica
          </h3>

          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Plan de Estudios / Grado</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{student.studyPlan}</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <h4 className="font-medium">Calificaciones por Materia</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Calificación</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {academicInfo.grades.length > 0 ? (
                      academicInfo.grades.map(grade => (
                        <tr key={grade.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{grade.subject}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${grade.grade >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {grade.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-gray-500">{new Date(grade.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500 italic">No hay calificaciones registradas aún</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                <h4 className="font-medium">Horario de Clases</h4>
                <button 
                  onClick={handleDownloadSchedule}
                  title="Descargar el horario de clases en formato PDF"
                  disabled={studentSchedule.length === 0}
                  className="text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 py-1 px-3 rounded transition-colors disabled:opacity-50"
                >
                  Descargar Horario
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
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 italic">No hay materias asignadas a tu grupo aún</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <h4 className="font-medium">Mis Grupos</h4>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {academicInfo.groups.length > 0 ? (
                  academicInfo.groups.map(group => (
                    <li key={group.id} className="p-4">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{group.name}</p>
                      <p className="text-xs text-gray-500">Día: {group.classDay} | Horario: {group.scheduleStart} - {group.scheduleEnd}</p>
                      <p className="text-xs text-gray-500">Salón: {group.classroom}</p>
                    </li>
                  ))
                ) : (
                  <li className="p-4 text-center text-sm text-gray-500 italic">No estás asignado a ningún grupo aún</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
