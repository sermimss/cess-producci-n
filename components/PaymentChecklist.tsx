
import React from 'react';
import { Student, Payment } from '../types';
import { STUDY_PLAN_CONFIG, generatePaymentSchedule, calculatePaymentPlanStatus } from '../utils/paymentPlans';

interface PaymentChecklistProps {
  student: Student;
  payments: Payment[];
  onSendReminder?: (student: Student, item: { label: string, dueDate: Date, amount: number }) => void;
}

const formatShortDate = (date: Date): string => {
    const currentYear = new Date().getFullYear();
    const dateYear = date.getFullYear();

    const day = date.getDate();
    // 'es-MX' da 'abr.', lo capitalizamos y limpiamos.
    let month = new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date);
    month = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');

    if (dateYear !== currentYear) {
        const year = date.getFullYear().toString().slice(-2);
        return `${day} ${month} '${year}`;
    } else {
        return `${day} ${month}`;
    }
};

const ChecklistItem: React.FC<{ 
    label: string; 
    checked: boolean; 
    dueDate?: string; 
    isOverdue?: boolean; 
    isReEnrollment?: boolean;
    showReminder?: boolean;
    onRemind?: () => void;
}> = ({ label, checked, dueDate, isOverdue, isReEnrollment, showReminder, onRemind }) => {
    
    const reEnrollmentClasses = isReEnrollment
        ? "border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 font-semibold"
        // Si no es reinscripción pero está pagado, aplica un estilo sutil
        : checked 
            ? "border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40"
            : "border border-gray-200 dark:border-gray-700";

    return (
        <div className={`flex items-center justify-between w-full p-2 rounded-md transition-all ${reEnrollmentClasses}`}>
            <div className="flex items-center space-x-2 min-w-0">
                <input 
                    type="checkbox" 
                    checked={checked} 
                    readOnly
                    disabled
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 disabled:opacity-100"
                />
                <span className={`text-sm truncate ${checked ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`} title={label}>{label}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                {dueDate && <span className={`text-xs font-mono ${isOverdue && !checked ? 'text-red-500 dark:text-red-400 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>{dueDate}</span>}
                {showReminder && (
                    <button 
                        onClick={onRemind} 
                        title="Enviar recordatorio por WhatsApp" 
                        className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

const PaymentChecklist: React.FC<PaymentChecklistProps> = ({ student, payments, onSendReminder }) => {
  const { studyPlan, courseStartDate } = student;
  const paymentPlanStatus = calculatePaymentPlanStatus(student, payments);
  const config = STUDY_PLAN_CONFIG[studyPlan];

  if (!paymentPlanStatus || !config) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center text-gray-500">
            Este plan de estudios no tiene un checklist de pagos configurado.
        </div>
    );
  }

  if (!courseStartDate) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center text-gray-500">
            Por favor, establece una fecha de inicio de curso para ver el checklist de pagos.
        </div>
    );
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedule = generatePaymentSchedule(courseStartDate, studyPlan, student.hasScholarship);

  const enrollmentDueDateObj = new Date(courseStartDate);
  enrollmentDueDateObj.setMinutes(enrollmentDueDateObj.getMinutes() + enrollmentDueDateObj.getTimezoneOffset());
  const isEnrollmentOverdue = !paymentPlanStatus.enrollment && enrollmentDueDateObj < today;
  const isEnrollmentNearDue = !paymentPlanStatus.enrollment && (enrollmentDueDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24) <= 5;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold">Checklist de Pagos del Plan</h3>
      </div>
      <div className="p-4 sm:p-6 space-y-6">
        <div>
            <h4 className="font-semibold text-md mb-2">Inscripción</h4>
            <div className="max-w-xs">
                <ChecklistItem 
                    label="Inscripción"
                    checked={paymentPlanStatus.enrollment}
                    dueDate={formatShortDate(enrollmentDueDateObj)}
                    isOverdue={isEnrollmentOverdue}
                    showReminder={!paymentPlanStatus.enrollment && (isEnrollmentOverdue || isEnrollmentNearDue) && !!onSendReminder}
                    onRemind={() => onSendReminder && onSendReminder(student, { label: "Inscripción", dueDate: enrollmentDueDateObj, amount: config.prices.enrollment })}
                />
            </div>
        </div>
        
        {schedule.length > 0 && (
            <div>
                <h4 className="font-semibold text-md mb-2 flex justify-between items-center">
                    <span>{config.feeType === 'Mensualidad' ? 'Cuotas y Reinscripciones' : 'Cuotas y Reinscripciones'}</span>
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        Pagado: {paymentPlanStatus.schedule.filter(Boolean).length} de {schedule.length}
                    </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {schedule.map((item, index) => {
                        const isOverdue = item.dueDate < today && !paymentPlanStatus.schedule[index];
                        const isNearDue = !paymentPlanStatus.schedule[index] && (item.dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24) <= 5;
                        return (
                            <ChecklistItem 
                                key={index}
                                label={item.label}
                                checked={paymentPlanStatus.schedule[index]}
                                dueDate={formatShortDate(item.dueDate)}
                                isOverdue={isOverdue}
                                isReEnrollment={item.isReEnrollment}
                                showReminder={!paymentPlanStatus.schedule[index] && (isOverdue || isNearDue) && !!onSendReminder}
                                onRemind={() => onSendReminder && onSendReminder(student, { label: item.label, dueDate: item.dueDate, amount: item.cost })}
                            />
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default PaymentChecklist;