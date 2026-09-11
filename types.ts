
export enum PaymentStatus {
  Paid = 'Pagado',
  Pending = 'Pendiente',
}

export enum PaymentCategory {
  Enrollment = 'Inscripción',
  ReEnrollment = 'Reinscripción',
  MonthlyFee = 'Mensualidad',
  WeeklyFee = 'Semanalidad',
  Balance = 'Saldo a favor',
  Materials = 'Materiales',
  Exam = 'Examen',
  TitleAndGraduation = 'Título y Graduación',
  LateFee = 'Amonestación por pago tardío',
  Other = 'Otros',
}

export enum StudentStatus {
    Active = 'Activo',
    Baja = 'Baja',
    Graduated = 'Graduado',
}

export type StudentStatusFilter = StudentStatus | 'Todos';
export type StudyPlanFilter = StudyPlan | 'Todos';

export enum StudyPlan {
  LevelingDegree = 'Licenciatura por Nivelación',
  GeneralNursing = 'Enfermería General',
  Podiatry = 'Podología',
  PrehospitalCare = 'Atención Médica Prehospitalaria',
  NursingAssistant = 'Auxiliar de Enfermería',
  SurgicalNursing = 'Enfermería Quirúrgica',
  IndustrialNursing = 'Enfermería Industrial',
}

export enum ClassDay {
  Monday = 'Lunes',
  Tuesday = 'Martes',
  Wednesday = 'Miércoles',
  Thursday = 'Jueves',
  Friday = 'Viernes',
  Saturday = 'Sábado',
  Sunday = 'Domingo',
}

export interface PaymentPlanStatus {
  enrollment: boolean;
  schedule: boolean[];
}

export interface ScannedDocument {
  name: string;
  url: string; // Base64 data URL or external link
}

export enum StudentSchedule {
  MWF_9_12 = 'Lunes, Miércoles, Viernes 9AM-12PM',
  TJ_4_7 = 'Martes & Jueves 4PM-7PM',
  SAT_MAT = 'Sábado Matutino 9AM-2PM',
  SAT_VESP = 'Sábado Vespertino 2:30PM-7PM',
  SUN_MAT = 'Domingo Matutino 9AM-2PM',
}

export interface Student {
    id: string;
    matricula?: string;
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    fechaNacimiento?: string;
    calle?: string;
    numero?: string;
    colonia?: string;
    telefono: string;
    status: StudentStatus;
    curp: string;
    email?: string;
    username?: string;
    studyPlan: StudyPlan;
    schedule: StudentSchedule;
    paymentPlanStatus: PaymentPlanStatus;
    enrollmentDate?: string;
    courseStartDate?: string;
    scannedDocuments?: ScannedDocument[];
    hasScholarship?: boolean;
    subjectsCleared?: boolean; // Nuevo campo para control de materias liberadas
}

export interface Payment {
  id: string;
  studentId: string; // Enlace al alumno
  studentEmail?: string; // Para seguridad NoSQL
  description: string;
  amount: number;
  date: string; // Formato de fecha ISO
  category: PaymentCategory;
  status: PaymentStatus;
}

export interface Teacher {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Group {
  id: string;
  userId: string;
  name: string; // Generated: studyPlan + generation
  studyPlan: StudyPlan;
  schedule: StudentSchedule;
  generation: string;
  classDay: ClassDay;
  scheduleStart: string; // "HH:MM"
  scheduleEnd: string;   // "HH:MM"
  classroom: string;
  teachers: string[];
  studentIds: string[];
}

export interface SubjectAssignment {
  id: string;
  userId: string;
  groupId: string;
  teacherName: string;
  subjectName: string;
  classDay: ClassDay;
  startTime: string;
  endTime: string;
  createdAt: string;
  term?: number; // 1, 2, 3...
}

export interface Grade {
  id: string;
  userId: string;
  studentId: string;
  studentEmail?: string; // Para seguridad NoSQL
  groupId: string;
  subject: string;
  grade: number;
  extraordinaryGrade?: number; // Calificación de extraordinario
  teacherName: string;
  createdAt: string;
}

export interface StudyPlanSubject {
  id: string;
  userId?: string;
  studyPlan: StudyPlan;
  name: string;
  description: string;
  term: number; // 1 para semestre 1, etc.
}