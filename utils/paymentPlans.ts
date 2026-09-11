
import { StudyPlan, PaymentPlanStatus, Student, Payment, PaymentStatus, PaymentCategory, StudentStatus } from '../types';

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

// Recalcula el checklist de pagos y el estatus (Activo/Baja/Graduado) de un alumno a
// partir de su historial de pagos. Es la MISMA lógica usada tanto en el cliente
// (App.tsx, cuando Dirección captura/edita/borra un pago) como en el servidor
// (server.ts, cuando se acredita un pago verificado de Mercado Pago), para evitar que
// ambos lados calculen el estado financiero de forma distinta.
export const computeRecalculatedStudentState = (
  student: Student,
  currentPayments: Payment[]
): { paymentPlanStatus: PaymentPlanStatus; status: StudentStatus } | null => {
  if (!student.courseStartDate) return null;

  const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
  if (!planConfig) return null;

  // Sumar todos los pagos que afectan al plan (Inscripción, Mensualidad, Reinscripción, Saldo a favor)
  const relevantPayments = currentPayments.filter(p =>
    p.studentId === student.id &&
    p.status === PaymentStatus.Paid &&
    [PaymentCategory.Enrollment, PaymentCategory.MonthlyFee, PaymentCategory.WeeklyFee, PaymentCategory.ReEnrollment, PaymentCategory.Balance].includes(p.category)
  );

  let totalPaid = relevantPayments.reduce((sum, p) => sum + p.amount, 0);
  const newStatus: PaymentPlanStatus = {
    enrollment: false,
    schedule: []
  };

  // 1. Aplicar a Inscripción
  if (totalPaid >= planConfig.prices.enrollment) {
    newStatus.enrollment = true;
    totalPaid -= planConfig.prices.enrollment;
  }

  // 2. Aplicar a Mensualidades/Semanas y Reinscripciones
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

  let newStudentStatus = student.status;

  // Verificar si cumple con los requisitos de Graduación:
  const allSchedulePaid = newStatus.schedule.length > 0 && newStatus.schedule.every(s => s === true);
  const titlePaid = currentPayments.some(p => p.studentId === student.id && p.category === PaymentCategory.TitleAndGraduation && p.status === PaymentStatus.Paid);
  const subjectsCleared = student.subjectsCleared === true;

  if (newStatus.enrollment && allSchedulePaid && titlePaid && subjectsCleared) {
    // Only auto-graduate, don't auto-active if they were manually set to Baja
    if (newStudentStatus !== StudentStatus.Baja) {
      newStudentStatus = StudentStatus.Graduated;
    }
  } else if (newStudentStatus === StudentStatus.Graduated) {
    // Si deja de cumplir los requisitos (ej. se borró un pago error)
    newStudentStatus = StudentStatus.Active;
  }

  // Verificar Baja Automatica por falta de pago (Solo si esta Activo)
  if (newStudentStatus === StudentStatus.Active) {
    const studentPayments = currentPayments.filter(p => p.studentId === student.id && p.status === PaymentStatus.Paid);
    if (studentPayments.length > 0) {
      const lastPaymentDate = new Date(Math.max(...studentPayments.map(p => new Date(p.date).getTime())));
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastPaymentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 120 && (!newStatus.enrollment || !allSchedulePaid)) {
        newStudentStatus = StudentStatus.Baja;
      }
    } else {
      const enrollment = new Date(student.enrollmentDate || student.courseStartDate || new Date().toISOString());
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - enrollment.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 120) {
        newStudentStatus = StudentStatus.Baja;
      }
    }
  }

  return { paymentPlanStatus: newStatus, status: newStudentStatus };
};

// Calcula el adeudo total vigente de un alumno a partir de su plan de pagos y su
// historial real de pagos, y la fecha del próximo concepto pendiente. Es la MISMA
// lógica que usaba StudentPortal.tsx para mostrar "lo que debes" y para armar el cobro
// de Mercado Pago; ahora también la usa el servidor (server.ts) para validar, antes de
// generar una preferencia de cobro, que el monto que pide el cliente coincide con la
// deuda real — el cliente ya no es la única fuente de verdad de cuánto se le debe
// cobrar a un alumno.
export const computeStudentFinancialInfo = (student: Student, payments: Payment[]): { totalDebt: number; nextPaymentDate: string | null } => {
  const schedule = generatePaymentSchedule(student.courseStartDate, student.studyPlan, student.hasScholarship);
  const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
  if (!planConfig) return { totalDebt: 0, nextPaymentDate: null };

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
    if (isPaid) return;
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
  });

  return { totalDebt, nextPaymentDate };
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
    // Periodo de gracia para mensualidades:
    // Si el día de vencimiento es <= 5, el límite es el día 5 del mes de corte.
    // Si el curso inició después del día 5, el periodo de gracia es dueDate + 5 días.
    const dueDay = nextPayment.dueDate.getDate();
    let deadline: Date;
    if (dueDay <= 5) {
      deadline = new Date(nextPayment.dueDate.getFullYear(), nextPayment.dueDate.getMonth(), 5, 23, 59, 59);
    } else {
      deadline = new Date(nextPayment.dueDate);
      deadline.setDate(deadline.getDate() + 5);
      deadline.setHours(23, 59, 59);
    }
    
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

  // Parse YYYY-MM-DD de forma local para evitar desfase de zona horaria UTC
  const parts = (courseStartDate || '').split('-');
  const startYear = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10) - 1; // 0-based
  const startDay = parseInt(parts[2], 10);

  if (isNaN(startYear) || isNaN(startMonth) || isNaN(startDay)) {
    return new Date();
  }

  const baseDate = new Date(startYear, startMonth, startDay);
  const dueDate = new Date(baseDate);

  switch (itemType) {
    case 'enrollment':
      return dueDate;
    
    case 'fee':
      if (config.feeType === 'Mensualidad') {
        const targetMonth = startMonth + index;
        const targetYear = startYear + Math.floor(targetMonth / 12);
        const normalizedMonth = ((targetMonth % 12) + 12) % 12;

        // Prevenir desbordamiento de fin de mes (ej. 31 de enero a febrero no debe saltar a marzo)
        const daysInTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
        const clampedDay = Math.min(startDay, daysInTargetMonth);

        return new Date(targetYear, normalizedMonth, clampedDay);
      } else { // Semanalidad
        dueDate.setDate(dueDate.getDate() + (index * 7));
        return dueDate;
      }

    default:
      return dueDate;
  }
};