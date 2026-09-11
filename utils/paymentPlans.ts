
import { StudyPlan, PaymentPlanStatus, Student, Payment, PaymentStatus, PaymentCategory } from '../types';

type FeeType = 'Mensualidad' | 'Semanalidad';

interface PlanConfig {
  reEnrollments: number;
  fees: number;
  feeType: FeeType;
  prices: {
    enrollment: number;
    reEnrollment: number;
    fee: number;
  };
  reEnrollmentSchedule: number[]; // Array of 0-based indices (month or week)
}

export interface PaymentScheduleItem {
  label: string;
  dueDate: Date;
  isReEnrollment: boolean; // True si es una reinscripción o un pago combinado
  cost: number;
}

export const STUDY_PLAN_CONFIG: Record<StudyPlan, PlanConfig> = {
  [StudyPlan.GeneralNursing]: { 
    reEnrollments: 8, 
    fees: 36, 
    feeType: 'Mensualidad',
    prices: { enrollment: 1900, reEnrollment: 1900, fee: 1900 },
    reEnrollmentSchedule: [4, 8, 12, 16, 20, 24, 28, 32], // Meses 5, 9, 13, 17, 21, 25, 29, 33
  },
  [StudyPlan.LevelingDegree]: { 
    reEnrollments: 2, 
    fees: 12, 
    feeType: 'Mensualidad',
    prices: { enrollment: 2200, reEnrollment: 2200, fee: 2200 },
    reEnrollmentSchedule: [4, 8], // Meses 5 y 9
  },
  [StudyPlan.Podiatry]: { 
    reEnrollments: 0, 
    fees: 27, 
    feeType: 'Semanalidad',
    prices: { enrollment: 900, reEnrollment: 0, fee: 250 },
    reEnrollmentSchedule: [],
  },
  [StudyPlan.NursingAssistant]: { 
    reEnrollments: 1, 
    fees: 54, 
    feeType: 'Semanalidad',
    prices: { enrollment: 900, reEnrollment: 900, fee: 250 },
    reEnrollmentSchedule: [27], // Semana 28
  },
  [StudyPlan.PrehospitalCare]: { 
    reEnrollments: 1, 
    fees: 54, 
    feeType: 'Semanalidad',
    prices: { enrollment: 900, reEnrollment: 900, fee: 250 },
    reEnrollmentSchedule: [27], // Semana 28
  },
  [StudyPlan.SurgicalNursing]: { 
    reEnrollments: 0, 
    fees: 27, 
    feeType: 'Semanalidad',
    prices: { enrollment: 900, reEnrollment: 0, fee: 250 },
    reEnrollmentSchedule: [],
  },
  [StudyPlan.IndustrialNursing]: { 
    reEnrollments: 0, 
    fees: 27, 
    feeType: 'Semanalidad',
    prices: { enrollment: 900, reEnrollment: 0, fee: 250 },
    reEnrollmentSchedule: [],
  },
};

export const generatePaymentSchedule = (
  courseStartDate: string,
  studyPlan: StudyPlan,
  hasScholarship: boolean = false
): PaymentScheduleItem[] => {
  if (!courseStartDate) return [];

  const config = STUDY_PLAN_CONFIG[studyPlan];
  const schedule: PaymentScheduleItem[] = [];
  const reEnrollmentScheduleSet = new Set(config.reEnrollmentSchedule);
  let reEnrollmentCounter = 0;

  let feeCost = config.prices.fee;
  if (hasScholarship) {
    if (studyPlan === StudyPlan.LevelingDegree) {
      feeCost -= 300;
    } else if (studyPlan === StudyPlan.GeneralNursing) {
      feeCost -= 400;
    }
  }

  for (let i = 0; i < config.fees; i++) {
    const dueDate = calculateDueDate(courseStartDate, studyPlan, 'fee', i);
    const isReEnrollmentDate = reEnrollmentScheduleSet.has(i);
    const labelPrefix = config.feeType === 'Semanalidad' ? 'Semana' : 'Mes';

    if (isReEnrollmentDate) {
      reEnrollmentCounter++;
      schedule.push({
        label: `${labelPrefix} ${i + 1} / Reinscripción ${reEnrollmentCounter}`,
        dueDate,
        isReEnrollment: true,
        cost: feeCost + config.prices.reEnrollment,
      });
    } else {
      schedule.push({
        label: `${labelPrefix} ${i + 1}`,
        dueDate,
        isReEnrollment: false,
        cost: feeCost,
      });
    }
  }

  return schedule;
};


export const getInitialPaymentPlanStatus = (studyPlan: StudyPlan): PaymentPlanStatus => {
  // Se necesita una fecha de inicio falsa para generar el cronograma y obtener su longitud.
  // Las fechas reales no importan aquí, solo el número de conceptos.
  const dummyStartDate = '2024-01-01'; 
  const schedule = generatePaymentSchedule(dummyStartDate, studyPlan);

  return {
    enrollment: false,
    schedule: Array(schedule.length).fill(false),
  };
};

export const calculatePaymentPlanStatus = (student: Student, payments: Payment[]): PaymentPlanStatus => {
  const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
  const defaultStatus = { enrollment: false, schedule: [] };
  
  if (!planConfig || !student.courseStartDate) return defaultStatus;

  const relevantPayments = payments.filter(p => 
    p.studentId === student.id && 
    p.status === PaymentStatus.Paid &&
    [PaymentCategory.Enrollment, PaymentCategory.MonthlyFee, PaymentCategory.WeeklyFee, PaymentCategory.ReEnrollment, PaymentCategory.Balance].includes(p.category)
  );

  let totalPaid = relevantPayments.reduce((sum, p) => sum + p.amount, 0);
  const newStatus: PaymentPlanStatus = {
    enrollment: false,
    schedule: []
  };

  if (totalPaid >= planConfig.prices.enrollment) {
    newStatus.enrollment = true;
    totalPaid -= planConfig.prices.enrollment;
  }

  const schedule = generatePaymentSchedule(student.courseStartDate, student.studyPlan, student.hasScholarship);
  newStatus.schedule = Array(schedule.length).fill(false);

  for (let i = 0; i < schedule.length; i++) {
    if (totalPaid >= schedule[i].cost) {
      newStatus.schedule[i] = true;
      totalPaid -= schedule[i].cost;
    } else {
      break;
    }
  }

  return newStatus;
};

export const getNextPendingPaymentInfo = (student: Student, payments: Payment[]) => {
  const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
  if (!planConfig || !student.courseStartDate) return null;

  const status = calculatePaymentPlanStatus(student, payments);
  const schedule = generatePaymentSchedule(student.courseStartDate, student.studyPlan, student.hasScholarship);
  
  const nextIndex = status.schedule.findIndex(isPaid => !isPaid);
  if (nextIndex === -1) return null; // All paid

  const nextPayment = schedule[nextIndex];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let lateFee = 0;
  let isLate = false;
  
  if (planConfig.feeType === 'Semanalidad') {
    if (today > nextPayment.dueDate) {
      lateFee = 50;
      isLate = true;
    }
  } else if (planConfig.feeType === 'Mensualidad') {
    const targetMonth = nextPayment.dueDate.getMonth();
    const targetYear = nextPayment.dueDate.getFullYear();
    const deadline = new Date(targetYear, targetMonth, 5);
    deadline.setHours(0, 0, 0, 0);
    
    if (today > deadline) {
      lateFee = 200;
      isLate = true;
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

  const penaltyAmount = lateFee + lostScholarshipAmount;

  const formattedDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }).format(nextPayment.dueDate);
  
  // Capitalize the first letter of the month for better presentation
  const dateParts = formattedDate.split(' ');
  if (dateParts.length >= 3) {
    dateParts[2] = dateParts[2].charAt(0).toUpperCase() + dateParts[2].slice(1);
  }
  const finalDateString = dateParts.join(' ');
  
  const description = `${nextPayment.label} - ${finalDateString}`;
  
  return {
    category: planConfig.feeType === 'Mensualidad' ? PaymentCategory.MonthlyFee : PaymentCategory.WeeklyFee,
    description: description,
    baseAmount: nextPayment.cost,
    lateFee: lateFee,
    lostScholarshipAmount: lostScholarshipAmount,
    penaltyAmount: penaltyAmount,
    totalAmount: nextPayment.cost + penaltyAmount,
    isLate: isLate,
    feeType: planConfig.feeType
  };
};

/**
 * Calcula la fecha de vencimiento para un concepto de pago específico.
 * @param courseStartDate - La fecha de inicio del curso del alumno (YYYY-MM-DD).
 * @param studyPlan - El plan de estudios del alumno.
 * @param itemType - El tipo de concepto ('enrollment', 'fee').
 * @param index - El índice del concepto (ej. para la cuota 3, el índice es 2).
 * @returns Un objeto Date con la fecha de vencimiento calculada.
 */
export const calculateDueDate = (
  courseStartDate: string,
  studyPlan: StudyPlan,
  itemType: 'enrollment' | 'fee',
  index: number = 0
): Date => {
  const config = STUDY_PLAN_CONFIG[studyPlan];

  // Corrige el desfase de zona horaria al crear la fecha desde un string YYYY-MM-DD
  const baseDate = new Date(courseStartDate);
  baseDate.setMinutes(baseDate.getMinutes() + baseDate.getTimezoneOffset());
  
  const dueDate = new Date(baseDate);

  switch (itemType) {
    case 'enrollment':
      // La fecha de vencimiento es la fecha de inicio del curso
      return dueDate;
    
    case 'fee':
      if (config.feeType === 'Mensualidad') {
        dueDate.setMonth(dueDate.getMonth() + index);
      } else { // Semanalidad
        dueDate.setDate(dueDate.getDate() + (index * 7));
      }
      return dueDate;

    default:
      return dueDate;
  }
};