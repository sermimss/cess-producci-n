

import React, { useState, useEffect, useMemo } from 'react';
// FIX: Import PaymentCategory to use enum values instead of strings.
import { Payment, Student, StudyPlanFilter, StudentStatusFilter, PaymentCategory, Group, StudentSchedule, ClassDay, PaymentStatus, PaymentPlanStatus, StudentStatus, StudyPlan } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import PaymentList from './components/PaymentList';
import PaymentFormModal from './components/PaymentFormModal';
import StudentList from './components/StudentList';
import StudentFormModal from './components/StudentFormModal';
import StudentDetails from './components/StudentDetails';
import PaymentChecklist from './components/PaymentChecklist';
import GroupList from './components/GroupList';
import GroupFormModal from './components/GroupFormModal';
import GroupStudentsModal from './components/GroupStudentsModal';
import GroupScheduleModal from './components/GroupScheduleModal';
import GroupDetailModal from './components/GroupDetailModal';
import TeacherPortal from './components/TeacherPortal';
import TeacherList from './components/TeacherList';
import StudyPlansAdmin from './components/StudyPlansAdmin';
import TeacherFormModal from './components/TeacherFormModal';
import TeacherSubjectsModal from './components/TeacherSubjectsModal';
import AssignCredentialsModal from './components/AssignCredentialsModal';
import StudentPortal from './components/StudentPortal';
import { StudentAccountClaim } from './components/StudentAccountClaim';
import { LoginScreen } from './components/LoginScreen';
import WhatsAppConfirmationModal from './components/WhatsAppConfirmationModal';
import { generatePaymentSchedule, getInitialPaymentPlanStatus, STUDY_PLAN_CONFIG, calculatePaymentPlanStatus } from './utils/paymentPlans';
import { generateMatricula } from './utils/matriculas';
import { useFirestoreData } from './hooks/useFirestoreData';
import { useAuth } from './AuthProvider';
import { useModal } from './components/ModalProvider';
import { deleteDoc, doc, setDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Grade, SubjectAssignment, Teacher } from './types';

type Tab = 'alumnos' | 'grupos' | 'docentes' | 'planes';

const App: React.FC = () => {
  const { user, loading, signIn, signInWithEmail, registerWithEmail, logout } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isTeacherLogin, setIsTeacherLogin] = useState(true); // default to email pass
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isAdminLoginMode, setIsAdminLoginMode] = useState(false);

  const isAdminUser = user?.email === 'cessplantelchihuahua@gmail.com';

  // Estado para simular login de maestro siendo admin
  const [adminTeacherMode, setAdminTeacherMode] = useState<Teacher | null>(null);

  // DOCENTES: El Admin necesita todos. Si no es admin, solo buscamos por email para ver si es un maestro logueado.
  const teacherFilterField = isAdminUser ? undefined : 'email';
  const teacherFilterValue = isAdminUser ? undefined : user?.email;
  const { data: teachers, addItem: addTeacherToDb, updateItem: updateTeacherInDb, deleteItem: deleteTeacherFromDb } = useFirestoreData<Teacher>('teachers', !!user, teacherFilterField, teacherFilterValue);

  // Identificar si el usuario logueado es un docente
  const loggedInTeacher = useMemo(() => {
    if (adminTeacherMode) return adminTeacherMode;
    if (!user || !user.email || isAdminUser) return null;
    return teachers.find(t => t.email?.toLowerCase() === user.email?.toLowerCase());
  }, [user, teachers, isAdminUser, adminTeacherMode]);

  // ALUMNOS: Admin y Docentes necesitan todos. Alumnos solo se necesitan a sí mismos.
  const isMatriculaLogin = user?.email?.endsWith('@cessdigital.local');
  const matriculaId = isMatriculaLogin ? user.email?.split('@')[0].toUpperCase() : undefined;
  
  const studentFilterField = isAdminUser || loggedInTeacher ? undefined : (isMatriculaLogin ? '__name__' : 'email');
  const studentFilterValue = isAdminUser || loggedInTeacher ? undefined : (isMatriculaLogin ? matriculaId : user?.email);
  const { data: students, addItem: addStudentToDb, updateItem: updateStudentInDb, deleteItem: deleteStudentFromDb } = useFirestoreData<Student>('students', !!user, studentFilterField, studentFilterValue);

  // Identificar si el usuario logueado es un alumno
  const loggedInStudent = useMemo(() => {
    if (!user || !user.email || isAdminUser) return null;
    return students.find(s => 
      s.email?.toLowerCase() === user.email?.toLowerCase() || 
      user.email?.toLowerCase() === `${s.id.toLowerCase()}@cessdigital.local`
    );
  }, [user, students, isAdminUser]);

  const groupFilterField = isAdminUser || loggedInTeacher ? undefined : (loggedInStudent ? 'studentIds' : undefined);
  const groupFilterOperator: any = isAdminUser || loggedInTeacher ? '==' : (loggedInStudent ? 'array-contains' : '==');
  const groupFilterValue = isAdminUser || loggedInTeacher ? undefined : (loggedInStudent ? loggedInStudent.id : undefined);

  const { data: groups, addItem: addGroupToDb, updateItem: updateGroupInDb, deleteItem: deleteGroupFromDb } = useFirestoreData<Group>(
    'groups', !!user, groupFilterField, groupFilterValue, groupFilterOperator
  );
  
  // MATERIAS: Docentes no descargan TODAS aquí (lo hacen en TeacherPortal), solo Admin y Alumnos.
  const shouldFetchSubjectAssignments = isAdminUser || !!loggedInStudent;
  const { data: subjectAssignments, addItem: addSubjectAssignmentToDb, deleteItem: deleteSubjectAssignmentFromDb } = useFirestoreData<SubjectAssignment>('subjectAssignments', shouldFetchSubjectAssignments);

  // CALIFICACIONES: Solo se descargan si un alumno entra.
  const gradeFilterField = loggedInStudent ? 'studentId' : undefined;
  const gradeFilterValue = loggedInStudent ? loggedInStudent.id : undefined;
  const { data: grades } = useFirestoreData<Grade>('grades', !!loggedInStudent, gradeFilterField, gradeFilterValue);

  // PAGOS: Solo descargar si es estudiante, o si el Admin DESBLOQUEÓ el Dashboard con el PIN, o si el Admin seleccionó a un alumno
  const [isDashboardUnlocked, setIsDashboardUnlocked] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const adminWantsAllPayments = isAdminUser && isDashboardUnlocked;
  const adminWantsSingleStudentPayments = isAdminUser && !isDashboardUnlocked && !!selectedStudentId;
  const shouldFetchPayments = !!loggedInStudent || adminWantsAllPayments || adminWantsSingleStudentPayments;
  
  const paymentFilterField = adminWantsAllPayments ? undefined : 'studentId';
  // Use logged in student if applicable, otherwise specific selected student, otherwise undefined
  const paymentFilterValue = adminWantsAllPayments ? undefined : (loggedInStudent ? loggedInStudent.id : (selectedStudentId || undefined));

  const { data: payments, addItem: addPaymentToDb, updateItem: updatePaymentInDb, deleteItem: deletePaymentFromDb } = useFirestoreData<Payment>(
    'payments', 
    shouldFetchPayments, 
    paymentFilterField, 
    paymentFilterValue
  );

  
  // Función para recalcular el estado del checklist de un alumno basado en sus pagos
  const recalculateStudentStatus = (studentOrId: string | Student, currentPayments: Payment[]) => {
    let student: Student | undefined;
    if (typeof studentOrId === 'string') {
        student = students.find(s => s.id === studentOrId);
    } else {
        student = studentOrId;
    }
    
    if (!student || !student.courseStartDate) return;

    const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
    if (!planConfig) return;

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

    // Actualizar el alumno con el nuevo estado calculado
    updateStudentInDb({ ...student, paymentPlanStatus: newStatus, status: newStudentStatus });
  };

  // Estado para el control de la UI
  const [activeTab, setActiveTab] = useState<Tab>('alumnos');
  // FIX: Replaced 'aistudio' with standard React hooks 'useState', 'useEffect', and 'useMemo'.
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isStudentModalOpen, setStudentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [isGroupDetailModalOpen, setIsGroupDetailModalOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);

  const [isGroupStudentsModalOpen, setIsGroupStudentsModalOpen] = useState(false);
  const [managingGroup, setManagingGroup] = useState<Group | null>(null);
  const [isGroupScheduleModalOpen, setIsGroupScheduleModalOpen] = useState(false);
  const [scheduleGroup, setScheduleGroup] = useState<Group | null>(null);

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isAssignCredentialsModalOpen, setIsAssignCredentialsModalOpen] = useState(false);
  const [isTeacherSubjectsModalOpen, setIsTeacherSubjectsModalOpen] = useState(false);
  const [teacherToAssign, setTeacherToAssign] = useState<Teacher | null>(null);
  const [teacherToAssignSubjects, setTeacherToAssignSubjects] = useState<Teacher | null>(null);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [pendingWhatsApp, setPendingWhatsApp] = useState<{ student: Student, payment: Omit<Payment, 'id'> } | null>(null);

  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatusFilter>('Todos');
  const [studyPlanFilter, setStudyPlanFilter] = useState<StudyPlanFilter>('Todos');

  const [showNipInput, setShowNipInput] = useState(false);
  const [nipValue, setNipValue] = useState('');
  
  // Estado para el modo oscuro
  const [theme, setTheme] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Manejar el callback de Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const paymentId = params.get('payment_id');
    const studentId = params.get('studentId');
    const preferenceId = params.get('preference_id');

    if (status === 'approved' && paymentId && studentId && user && loggedInStudent) {
      // Remover los params de la URL para que no se ejecute dos veces en el reload
      window.history.replaceState({}, document.title, window.location.pathname);

      // Verificamos si este pago ya fue registrado buscando en todo el arreglo
      // Pero 'payments' puede no haber terminado de cargar aqui.
      // UseFirestoreData maneja payments = [] inicialmente.
      // Así que primero vamos a esperar a asegurarnos que pasaron 2 segundos o checamos directamente,
      // para evitar duplicidad, lo mejor es guardar y si hay un query no pasa nada si agregamos y es duplicado? 
      // Si pasa. Busquemos en la base de datos o en los pagos ya cargados.
      
      const checkAndAddPayment = async () => {
        // En lugar de buscar en payments, guardaremos el status e informaremos.
        try {
          const qCheck = query(collection(db, 'payments'), where('description', '>=', `MP-${paymentId}`));
          const checkSnapshot = await getDocs(qCheck);
          // Check if any payment description literally includes this paymentId
          const isDuplicate = checkSnapshot.docs.some(doc => doc.data().description.includes(paymentId));

          if (!isDuplicate) {
             const student = students.find(s => s.id === studentId);
             if (student) {
                // Fetch student payments
                const qStudent = query(collection(db, 'payments'), where('studentId', '==', studentId));
                const studentPaymentsSnapshot = await getDocs(qStudent);
                const existingPayments = studentPaymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Payment);

                // Calcular adeudo (amount de la deuda)
                const schedule = generatePaymentSchedule(student.courseStartDate, student.studyPlan, student.hasScholarship);
                const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
                const paymentPlanStatus = calculatePaymentPlanStatus(student, existingPayments);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let totalDebt = 0;

                if (!paymentPlanStatus.enrollment) {
                  totalDebt += planConfig.prices.enrollment;
                }

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
                  }
                });

                const newPayment: Omit<Payment, 'id'> = {
                  studentId: student.id,
                  amount: totalDebt > 0 ? totalDebt : 0, 
                  date: new Date().toISOString(),
                  category: PaymentCategory.Balance,
                  description: `Pago Mercado Pago ID: ${paymentId}. Ref: ${preferenceId}`,
                  status: PaymentStatus.Paid,
                };
                
                addPaymentToDb(newPayment).then(() => {
                   // Al agregarlo, recalculamos
                   recalculateStudentStatus(student, [...existingPayments, newPayment as Payment]);
                });
                showAlert('Tu pago ha sido registrado exitosamente y reflejado en tu cuenta.', 'Pago Exitoso');
             }
          }
        } catch (error) {
          console.error('Error al procesar el retorno de MP', error);
        }
      };

      checkAndAddPayment();
    } else if (status === 'failure' || status === 'pending') {
       window.history.replaceState({}, document.title, window.location.pathname);
       const msg = status === 'pending' ? 'Tu pago está en proceso.' : 'Tu pago fue rechazado o hubo un error.';
       showAlert(msg, 'Estado del Pago');
    }
  }, [user, loggedInStudent, students]);

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // CRUD de Grupos
  const handleGroupSave = (groupData: Omit<Group, 'id' | 'userId' | 'name' | 'studentIds'>) => {
    const generatedName = `${groupData.studyPlan} - ${groupData.generation}`;
    if (editingGroup) {
      updateGroupInDb({
        ...editingGroup,
        ...groupData,
        name: generatedName,
      });
    } else {
      addGroupToDb({
        ...groupData,
        userId: user.uid,
        name: generatedName,
        studentIds: [],
      });
    }
    setIsGroupModalOpen(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (id: string) => {
    if (await showConfirm('¿Estás seguro de que deseas eliminar este grupo?')) {
      deleteGroupFromDb(id);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (await showConfirm('¿Estás seguro de que deseas eliminar este alumno? Esta acción no se puede deshacer.')) {
      await deleteStudentFromDb(studentId);
      if (selectedStudentId === studentId) {
        setSelectedStudentId(null);
      }
      
      // Update any groups involving this student
      const oldGroups = groups.filter(g => g.studentIds.includes(studentId));
      for (const group of oldGroups) {
          updateGroupInDb({
              ...group,
              studentIds: group.studentIds.filter(id => id !== studentId)
          });
      }
    }
  };

  const handleUpdateGroupStudents = (groupId: string, studentIds: string[]) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      updateGroupInDb({
        ...group,
        studentIds,
      });
    }
  };

  const assignStudentToGroup = async (studentId: string, studentData: Student) => {
    if (!user) return;
    
    // Remove from any groups that don't match the new criteria
    const oldGroups = groups.filter(g => g.studentIds.includes(studentId));
    let groupUpdated = false;
    for (const oldGroup of oldGroups) {
      if (oldGroup.schedule !== studentData.schedule || 
          oldGroup.studyPlan !== studentData.studyPlan || 
          oldGroup.generation !== studentData.courseStartDate) {
            
          const updatedGroup = {
            ...oldGroup,
            studentIds: oldGroup.studentIds.filter(id => id !== studentId)
          };
          updateGroupInDb(updatedGroup);
          groupUpdated = true;
      }
    }

    // Find if there's an existing matching group
    const existingGroup = groups.find(g => 
      g.schedule === studentData.schedule && 
      g.studyPlan === studentData.studyPlan &&
      g.generation === studentData.courseStartDate
    );

    if (existingGroup) {
      if (!existingGroup.studentIds.includes(studentId)) {
        updateGroupInDb({
            ...existingGroup,
            studentIds: [...existingGroup.studentIds, studentId]
        });
      }
    } else {
      // Need to check if there are other students to form a group
      const matchingStudents = students.filter(s => 
        s.schedule === studentData.schedule && 
        s.studyPlan === studentData.studyPlan && 
        s.courseStartDate === studentData.courseStartDate
      );
      
      const allMatchingStudents = [...matchingStudents];
      // Ensure current student is included
      if (!allMatchingStudents.find(s => s.id === studentId)) {
        allMatchingStudents.push({ ...studentData, id: studentId } as Student);
      }

      if (allMatchingStudents.length >= 2) {
        const scheduleInfo = getGroupScheduleInfo(studentData.schedule);
        const newGroup: Omit<Group, 'id'> = {
          userId: user.uid,
          name: `${studentData.studyPlan} - ${studentData.courseStartDate}`,
          studyPlan: studentData.studyPlan,
          schedule: studentData.schedule,
          generation: studentData.courseStartDate,
          classDay: scheduleInfo.classDay,
          scheduleStart: scheduleInfo.scheduleStart,
          scheduleEnd: scheduleInfo.scheduleEnd,
          classroom: 'Por asignar',
          teachers: [],
          studentIds: allMatchingStudents.map(s => s.id)
        };
        addGroupToDb(newGroup);
      }
    }
  };

  // CRUD de Alumnos
  const addStudent = async (studentData: Omit<Student, 'id' | 'paymentPlanStatus'>) => {
    // Generar matrícula
    const newMatricula = generateMatricula(studentData, students);

    const newStudent: Omit<Student, 'id'> = { 
      ...studentData, 
      matricula: newMatricula,
      paymentPlanStatus: getInitialPaymentPlanStatus(studentData.studyPlan) 
    };
    const studentId = await addStudentToDb(newStudent, newMatricula);
    
    if (studentId) {
      await showAlert(`El alumno ha sido registrado exitosamente con la matrícula: ${newMatricula}`, 'Alumno Registrado');
      await assignStudentToGroup(studentId, { ...newStudent, id: studentId } as Student);
    }
  };

  const getGroupScheduleInfo = (schedule: StudentSchedule) => {
    switch (schedule) {
      case StudentSchedule.MWF_9_12:
        return { classDay: ClassDay.Monday, scheduleStart: '09:00', scheduleEnd: '12:00' };
      case StudentSchedule.TJ_4_7:
        return { classDay: ClassDay.Tuesday, scheduleStart: '16:00', scheduleEnd: '19:00' };
      case StudentSchedule.SAT_MAT:
        return { classDay: ClassDay.Saturday, scheduleStart: '09:00', scheduleEnd: '14:00' };
      case StudentSchedule.SAT_VESP:
        return { classDay: ClassDay.Saturday, scheduleStart: '14:30', scheduleEnd: '19:00' };
      case StudentSchedule.SUN_MAT:
        return { classDay: ClassDay.Sunday, scheduleStart: '09:00', scheduleEnd: '14:00' };
      default:
        return { classDay: ClassDay.Monday, scheduleStart: '00:00', scheduleEnd: '00:00' };
    }
  };

  const updateStudent = async (updatedStudent: Student) => {
    const oldStudent = students.find(s => s.id === updatedStudent.id);
    
    if (oldStudent && oldStudent.studyPlan !== updatedStudent.studyPlan) {
      if (await showConfirm('Cambiar el plan de estudios reiniciará el checklist de pagos. ¿Desea continuar?')) {
        const newPaymentPlanStatus = getInitialPaymentPlanStatus(updatedStudent.studyPlan);
        recalculateStudentStatus({ ...updatedStudent, paymentPlanStatus: newPaymentPlanStatus }, payments);
        await assignStudentToGroup(updatedStudent.id, updatedStudent);
      } else {
        updatedStudent.studyPlan = oldStudent.studyPlan;
        recalculateStudentStatus(updatedStudent, payments);
        if (oldStudent.schedule !== updatedStudent.schedule || oldStudent.courseStartDate !== updatedStudent.courseStartDate) {
          await assignStudentToGroup(updatedStudent.id, updatedStudent);
        }
      }
    } else {
      recalculateStudentStatus(updatedStudent, payments);
      if (oldStudent && (oldStudent.schedule !== updatedStudent.schedule || oldStudent.courseStartDate !== updatedStudent.courseStartDate)) {
        await assignStudentToGroup(updatedStudent.id, updatedStudent);
      }
    }
  };

  const handleStudentSave = async (studentData: Omit<Student, 'id' | 'paymentPlanStatus'>) => {
    if (editingStudent) {
      const studentToUpdate = students.find(s => s.id === editingStudent.id);
      if (studentToUpdate) {
        let updatedStudent: Student = { 
          ...studentToUpdate, 
          ...studentData 
        };
        updateStudent(updatedStudent);
      }
    } else {
      addStudent(studentData);
    }
    closeStudentModal();
  };

  // CRUD de Pagos
  const addPayment = (payment: Omit<Payment, 'id'>) => {
    addPaymentToDb(payment);
  };

  const updatePayment = (updatedPayment: Payment) => {
    updatePaymentInDb(updatedPayment).then(() => {
        if (updatedPayment.status === PaymentStatus.Paid) {
            const updatedPayments = payments.map(p => p.id === updatedPayment.id ? updatedPayment : p);
            recalculateStudentStatus(updatedPayment.studentId, updatedPayments);
        }
    });
  };

  const deletePayment = async (id: string) => {
    const paymentToDelete = payments.find(p => p.id === id);
    if (!paymentToDelete) return;

    if (await showConfirm('¿Estás seguro de que deseas eliminar este pago?')) {
        deletePaymentFromDb(id).then(() => {
            if (paymentToDelete.status === PaymentStatus.Paid) {
                const remainingPayments = payments.filter(p => p.id !== id);
                recalculateStudentStatus(paymentToDelete.studentId, remainingPayments);
            }
        });
    }
  };
  
  const sendWhatsAppReminder = async (student: Student, item: { label: string, dueDate: Date, amount: number }) => {
    if (!await showConfirm(`¿Deseas enviar un recordatorio de pago por WhatsApp a ${student.nombre} para el concepto "${item.label}"?`)) {
        return;
    }

    const phoneNumber = student.telefono.replace(/\D/g, '');
    const formattedPhone = phoneNumber.length === 10 ? `52${phoneNumber}` : phoneNumber;
    
    const isOverdue = item.dueDate < new Date();
    const dateStr = item.dueDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    const message = `*RECORDATORIO DE PAGO - CESS PLANTEL CHIHUAHUA*\n\n` +
      `Hola *${student.nombre} ${student.apellidoPaterno}*,\n` +
      `Este es un recordatorio amigable sobre tu próximo pago.\n\n` +
      `*Concepto:* ${item.label}\n` +
      `*Monto:* $${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `*Fecha límite:* ${dateStr}\n` +
      `${isOverdue ? '⚠️ *Este pago se encuentra vencido.*' : '⏳ *Este pago está próximo a vencer.*'}\n\n` +
      `Si ya realizaste tu pago, por favor haz caso omiso a este mensaje.\n` +
      `¡Gracias!`;

    try {
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      await showAlert("Abriendo WhatsApp para enviar el recordatorio.", "Éxito");
    } catch (error) {
      console.error("Error al abrir WhatsApp:", error);
      await showAlert("Error al intentar abrir WhatsApp.", "Error");
    }
  };

  const sendWhatsAppReceipt = async (student: Student, payment: Omit<Payment, 'id'>) => {
    const phoneNumber = student.telefono.replace(/\D/g, '');
    const formattedPhone = phoneNumber.length === 10 ? `52${phoneNumber}` : phoneNumber;
    
    const message = `*RECIBO DE PAGO - CESS PLANTEL CHIHUAHUA*\n\n` +
      `Hola *${student.nombre} ${student.apellidoPaterno}*,\n` +
      `Hemos registrado tu pago con éxito.\n\n` +
      `*Detalles del Pago:*\n` +
      `• Concepto: ${payment.description}\n` +
      `• Monto: $${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\n` +
      `• Fecha: ${new Date(payment.date).toLocaleDateString('es-MX')}\n` +
      `• Categoría: ${payment.category}\n` +
      `• Estado: ${payment.status}\n\n` +
      `¡Gracias por tu pago!`;

    try {
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedPhone, message }),
      });

      if (!response.ok) {
        throw new Error('API failed or not configured, fallback to URL');
      }
      console.log("WhatsApp message sent via API successfully.");
    } catch (error) {
      console.warn("Fallo en API automática de WhatsApp, abriendo pestaña manual:", error);
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handlePaymentSave = async (paymentData: Omit<Payment, 'id'>, penaltyAmount: number = 0) => {
    const student = students.find(s => s.id === paymentData.studentId);
    if (!student) {
        await showAlert("El alumno seleccionado no existe.", "Error");
        return;
    }
    
    // Adjuntar el email del estudiante para control de reglas de Firestore
    if (student.email) {
      paymentData.studentEmail = student.email;
    } else {
      paymentData.studentEmail = "";
    }
    
    // Si se está editando un pago pendiente y se cambia a pagado, se eliminará el original
    const isEditingAndStatusChangedToPaid = editingPayment && editingPayment.status !== PaymentStatus.Paid && paymentData.status === PaymentStatus.Paid;
    
    // Lógica para aplicar el pago al checklist si se marca como "Pagado"
    if (paymentData.status === PaymentStatus.Paid) {
        if (!student.courseStartDate) {
            await showAlert("El alumno seleccionado no tiene una fecha de inicio de curso configurada.", "Atención");
            closePaymentModal();
            return;
        }

        const planConfig = STUDY_PLAN_CONFIG[student.studyPlan];
        if (!planConfig || !planConfig.prices) {
            closePaymentModal();
            return;
        }
        
        let remainingAmount = paymentData.amount;
        const newPayments: Omit<Payment, 'id'>[] = [];
        const newStatus = JSON.parse(JSON.stringify(student.paymentPlanStatus));

        // Extraer la penalización como un pago separado
        if (penaltyAmount > 0 && remainingAmount >= penaltyAmount) {
            newPayments.push({
                ...paymentData,
                description: `Amonestación / Recargo - ${paymentData.description}`,
                amount: penaltyAmount,
                category: PaymentCategory.LateFee
            });
            remainingAmount -= penaltyAmount;
        }

        // 1. Pagar Inscripción
        if (!newStatus.enrollment && remainingAmount >= planConfig.prices.enrollment) {
            newPayments.push({ 
                ...paymentData, 
                description: PaymentCategory.Enrollment, 
                amount: planConfig.prices.enrollment, 
                category: PaymentCategory.Enrollment 
            });
            remainingAmount -= planConfig.prices.enrollment;
            newStatus.enrollment = true;
        }
        
        // 2. Pagar Cuotas del Plan
        const schedule = generatePaymentSchedule(student.courseStartDate, student.studyPlan, student.hasScholarship);
        for (let i = 0; i < schedule.length; i++) {
            if (remainingAmount <= 0) break;
            if (!newStatus.schedule[i]) {
                const itemToPay = schedule[i];
                if (remainingAmount >= itemToPay.cost) {
                    const category = itemToPay.isReEnrollment 
                        ? PaymentCategory.ReEnrollment 
                        : (planConfig.feeType === 'Mensualidad' ? PaymentCategory.MonthlyFee : PaymentCategory.WeeklyFee);

                    newPayments.push({ 
                        ...paymentData, 
                        description: itemToPay.label, 
                        amount: itemToPay.cost, 
                        category: category 
                    });
                    remainingAmount -= itemToPay.cost;
                    newStatus.schedule[i] = true;
                }
            }
        }

        // 3. Registrar Saldo a Favor
        if (remainingAmount > 0) {
             newPayments.push({ 
                ...paymentData, 
                description: 'Saldo a favor', 
                amount: remainingAmount, 
                category: PaymentCategory.Balance 
            });
        }
        
        if(newPayments.length === 0) {
            await showAlert(`El monto de ${paymentData.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} no es suficiente para cubrir el siguiente pago pendiente.`, "Monto Insuficiente");
            return;
        }

        if (isEditingAndStatusChangedToPaid && editingPayment) {
            deletePaymentFromDb(editingPayment.id);
        }

        // Si es una edición de un pago que ya era "Pagado", solo actualizamos ese registro
        if (editingPayment && !isEditingAndStatusChangedToPaid) {
            updatePaymentInDb({ ...paymentData, id: editingPayment.id }).then(() => {
                // Recalcular después de actualizar
                const updatedPayments = payments.map(p => p.id === editingPayment.id ? { ...paymentData, id: p.id } : p);
                recalculateStudentStatus(student.id, updatedPayments);
            });
        } else {
            // Si es un pago nuevo o cambio de estado, aplicamos la lógica de desglose
            newPayments.forEach(p => addPaymentToDb(p));
            // Recalcular el estado usando TODOS los pagos (incluyendo los nuevos)
            const allPayments = [...payments, ...newPayments as Payment[]];
            recalculateStudentStatus(student.id, allPayments);
        }

        // Enviar recibo por WhatsApp automáticamente (vía API o pestaña emergente como respaldo)
        void sendWhatsAppReceipt(student, paymentData);

    } else { // Si el pago es "Pendiente" o se está editando sin cambiar a "Pagado"
      if (editingPayment && !isEditingAndStatusChangedToPaid) {
        updatePaymentInDb({ ...paymentData, id: editingPayment.id }).then(() => {
            // Recalcular si el pago anterior era "Pagado" y ahora es "Pendiente"
            if (editingPayment.status === PaymentStatus.Paid) {
                const updatedPayments = payments.map(p => p.id === editingPayment.id ? { ...paymentData, id: p.id } : p);
                recalculateStudentStatus(student.id, updatedPayments);
            }
        });
      } else {
        addPaymentToDb(paymentData);
      }

      // Recordatorio automático para pagos pendientes
      const dueDate = new Date(paymentData.date);
      dueDate.setMinutes(dueDate.getMinutes() + dueDate.getTimezoneOffset());
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 5) {
          sendWhatsAppReminder(student, {
              label: paymentData.description,
              dueDate: dueDate,
              amount: paymentData.amount
          });
      }
    }
    closePaymentModal();
  };

  // Manejadores de modales para Alumnos y Pagos...
  const openAddStudentModal = () => { setEditingStudent(null); setStudentModalOpen(true); };
  const openEditStudentModal = (student: Student) => { setEditingStudent(student); setStudentModalOpen(true); };
  const closeStudentModal = () => { setStudentModalOpen(false); setEditingStudent(null); };
  const openAddPaymentModal = () => { setEditingPayment(null); setPaymentModalOpen(true); };
  const openEditPaymentModal = (payment: Payment) => { setEditingPayment(payment); setPaymentModalOpen(true); };
  const closePaymentModal = () => { setPaymentModalOpen(false); setEditingPayment(null); };
  const handleSelectStudent = (id: string | null) => setSelectedStudentId(id);
  
  // Exportar pagos del alumno seleccionado
  const handleExportStudentPayments = async () => {
    if (!selectedStudent || paymentsForSelectedStudent.length === 0) {
      await showAlert("No hay pagos para exportar para este alumno.", "Sin datos");
      return;
    }

    const headers = ['ID Pago', 'Descripción', 'Monto', 'Fecha', 'Categoría', 'Estado'];
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
    const csvRows = [headers.join(',')];

    paymentsForSelectedStudent.forEach(p => {
      const row = [p.id, escapeCSV(p.description), p.amount, p.date, p.category, p.status];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const studentNameSafe = `${selectedStudent.nombre}_${selectedStudent.apellidoPaterno}`.replace(/\s/g, '_');
    link.setAttribute("download", `historial_pagos_${studentNameSafe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Estado derivado y memorizado
  const filteredStudentsByPlan = useMemo(() => {
    if (studyPlanFilter === 'Todos') return students;
    return students.filter(s => s.studyPlan === studyPlanFilter);
  }, [students, studyPlanFilter]);

  const filteredPayments = useMemo(() => {
    if (studyPlanFilter === 'Todos') return payments;
    const filteredStudentIds = new Set(filteredStudentsByPlan.map(s => s.id));
    return payments.filter(p => filteredStudentIds.has(p.studentId));
  }, [payments, filteredStudentsByPlan]);
  
  useEffect(() => {
    if (selectedStudentId && !filteredStudentsByPlan.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [filteredStudentsByPlan, selectedStudentId]);
  
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const paymentsForSelectedStudent = useMemo(() => {
    if (!selectedStudentId) return [];
    return payments
      .filter(p => p.studentId === selectedStudentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, selectedStudentId]);
  
  const sortedStudents = useMemo(() => {
    const filtered = filteredStudentsByPlan.filter(student => studentStatusFilter === 'Todos' || student.status === studentStatusFilter);
    return [...filtered].sort((a, b) => `${a.apellidoPaterno} ${a.apellidoMaterno} ${a.nombre}`.localeCompare(`${b.apellidoPaterno} ${b.apellidoMaterno} ${b.nombre}`));
  }, [filteredStudentsByPlan, studentStatusFilter]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch (error: any) {
      setLoginError('Credenciales incorrectas o usuario no encontrado.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">Cargando...</div>;
  }

  const handleRegisterMode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await registerWithEmail(loginEmail, loginPassword);
    } catch (error: any) {
      setLoginError('Error al crear cuenta. La matricula no existe o ya fue enlazada.');
    }
  };

  if (!user) {
    if (!isAdminLoginMode) {
      return <LoginScreen onAdminTeacherMode={() => setIsAdminLoginMode(true)} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 relative">
        <button 
           onClick={() => setIsAdminLoginMode(false)}
           className="absolute top-6 left-6 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          &larr; Volver
        </button>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md text-center w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Acceso a Personal</h2>
          
          <div className="flex space-x-2 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => { setIsTeacherLogin(false); setLoginError(''); setIsRegisterMode(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isTeacherLogin ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            >
              Portal Admin
            </button>
            <button
              onClick={() => { setIsTeacherLogin(true); setLoginError(''); setIsRegisterMode(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isTeacherLogin ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            >
              Portal Docentes
            </button>
          </div>
          
          {isTeacherLogin ? (
            <div className="animate-fade-in">
              <p className="mb-6 text-gray-600 dark:text-gray-400">Ingresa con tu correo de docente.</p>
              <form onSubmit={handleEmailLogin} className="space-y-4 text-left mb-2">
                {loginError && (
                  <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
                    {loginError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-4"
                >
                  Ingresar al Portal
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-fade-in">
              <p className="mb-6 text-gray-600 dark:text-gray-400">Exclusivo para la dirección (Google).</p>
              <div className="mb-2">
                <button 
                  onClick={signIn}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Header 
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentStudyPlanFilter={studyPlanFilter}
        onStudyPlanFilterChange={setStudyPlanFilter}
      />
     
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {loggedInStudent ? (
          <StudentPortal 
            student={loggedInStudent} 
            payments={payments} 
            grades={grades} 
            groups={groups} 
            subjectAssignments={subjectAssignments}
          />
        ) : loggedInTeacher ? (
          <div className="relative">
            {adminTeacherMode && (
              <div className="flex justify-end mb-4">
                 <button onClick={() => setAdminTeacherMode(null)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition-colors">
                    Cerrar Vista de Docente
                 </button>
              </div>
            )}
            <TeacherPortal 
              userId={user.uid} 
              groups={groups} 
              students={students} 
              teacher={loggedInTeacher}
              payments={payments}
            />
          </div>
        ) : isAdminUser ? (
          <>
            {!isDashboardUnlocked ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 flex flex-col items-center justify-center">
                 <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Información Confidencial</h3>
                 <p className="text-gray-500 dark:text-gray-400 mb-6 text-center">Inicia sesión con tu NIP para ver el resumen financiero.</p>
                 
                 {showNipInput ? (
                   <div className="flex flex-col items-center gap-3 w-full max-w-xs animate-fade-in">
                     <input 
                       type="password"
                       placeholder="Ingresa tu NIP..."
                       className="border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-md px-4 py-2 w-full text-center text-lg tracking-widest focus:ring-indigo-500 focus:border-indigo-500"
                       autoFocus
                       value={nipValue}
                       onChange={(e) => setNipValue(e.target.value)}
                       onKeyDown={async (e) => {
                         if (e.key === 'Enter') {
                            if (nipValue === '7695686') {
                              setIsDashboardUnlocked(true);
                              setShowNipInput(false);
                              setNipValue('');
                            } else {
                              await showAlert('NIP incorrecto. Acceso denegado.', 'Error de Seguridad');
                              setShowNipInput(false);
                              setNipValue('');
                            }
                         }
                       }}
                     />
                     <div className="flex gap-2 w-full">
                       <button 
                         className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                         onClick={() => {
                           setShowNipInput(false);
                           setNipValue('');
                         }}
                       >
                         Cancelar
                       </button>
                       <button 
                         className="flex-1 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
                         onClick={async () => {
                            if (nipValue === '7695686') {
                              setIsDashboardUnlocked(true);
                              setShowNipInput(false);
                              setNipValue('');
                            } else {
                              await showAlert('NIP incorrecto. Acceso denegado.', 'Error de Seguridad');
                              setShowNipInput(false);
                              setNipValue('');
                            }
                         }}
                       >
                         Verificar
                       </button>
                     </div>
                   </div>
                 ) : (
                   <button 
                     onClick={() => setShowNipInput(true)} 
                     className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                   >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                     Métricas de Dirección
                   </button>
                 )}
              </div>
            ) : (
              <div className="animate-fade-in relative">
                <div className="absolute top-4 right-4 z-10 hidden sm:block">
                  <button 
                    onClick={() => setIsDashboardUnlocked(false)}
                    className="flex items-center gap-2 text-sm bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    Bloquear Métricas
                  </button>
                </div>
                <Dashboard 
                  payments={filteredPayments} 
                  students={filteredStudentsByPlan} 
                  studyPlanFilter={studyPlanFilter}
                />
              </div>
            )}

            <div className="mt-8 mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('alumnos')}
                  className={`${
                    activeTab === 'alumnos'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Alumnos y Pagos
                </button>
                <button
                  onClick={() => setActiveTab('grupos')}
                  className={`${
                    activeTab === 'grupos'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Grupos y Salones
                </button>
                <button
                  onClick={() => setActiveTab('docentes')}
                  className={`${
                    activeTab === 'docentes'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Gestión de Docentes
                </button>
                <button
                  onClick={() => setActiveTab('planes')}
                  className={`${
                    activeTab === 'planes'
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Planes de Estudio
                </button>
              </nav>
            </div>

            {activeTab === 'alumnos' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <StudentList 
                    students={sortedStudents}
                    selectedStudentId={selectedStudentId}
                    onSelectStudent={handleSelectStudent}
                    onAddStudent={openAddStudentModal}
                    currentFilter={studentStatusFilter}
                    onFilterChange={setStudentStatusFilter}
                    onAssignMissingMatriculas={async () => {
                      if (await showConfirm('¿Desea generar y sobreescribir las matrículas para TODOS los alumnos en el orden en que fueron registrados?')) {
                        let count = 0;
                        const sortedByEnrollment = [...students].sort((a, b) => new Date(a.enrollmentDate).getTime() - new Date(b.enrollmentDate).getTime());
                        
                        const processedStudents: Student[] = [];
                        
                        for (let i = 0; i < sortedByEnrollment.length; i++) {
                          const s = sortedByEnrollment[i];
                          // generateMatricula will look at processedStudents to figure out maxIncrement
                          const newMatricula = generateMatricula(s, processedStudents);
                          
                          if (s.id !== newMatricula) {
                            const oldId = s.id;
                            const updatedS = { ...s, matricula: newMatricula };
                            const { id, ...dataToSave } = updatedS;
                            
                            // 1. Create new document
                            await setDoc(doc(db, 'students', newMatricula), dataToSave);
                            
                            // 2. Update groups
                            const groupsQuery = query(collection(db, 'groups'), where('studentIds', 'array-contains', oldId));
                            const groupsSnapshot = await getDocs(groupsQuery);
                            for (const gDoc of groupsSnapshot.docs) {
                              const gData = gDoc.data();
                              if (gData.studentIds && gData.studentIds.includes(oldId)) {
                                await updateDoc(gDoc.ref, {
                                  studentIds: gData.studentIds.map((sid: string) => sid === oldId ? newMatricula : sid)
                                });
                              }
                            }
                            
                            // 3. Update payments
                            const paymentsQuery = query(collection(db, 'payments'), where('studentId', '==', oldId));
                            const paymentsSnapshot = await getDocs(paymentsQuery);
                            for (const pDoc of paymentsSnapshot.docs) {
                              await updateDoc(pDoc.ref, { studentId: newMatricula });
                            }
                            
                            // 4. Update grades
                            const gradesQuery = query(collection(db, 'grades'), where('studentId', '==', oldId));
                            const gradesSnapshot = await getDocs(gradesQuery);
                            for (const grDoc of gradesSnapshot.docs) {
                              await updateDoc(grDoc.ref, { studentId: newMatricula });
                            }
                            
                            // 5. Delete old document
                            await deleteDoc(doc(db, 'students', oldId));
                            
                            processedStudents.push({ ...updatedS, id: newMatricula });
                            count++;
                          } else {
                            // Already correct ID, just update field if needed
                            if (s.matricula !== newMatricula) {
                              await updateStudentInDb({ ...s, matricula: newMatricula });
                              count++;
                            }
                            processedStudents.push({ ...s, matricula: newMatricula });
                          }
                        }
                        
                        if (count > 0) {
                          await showAlert(`Se generaron y actualizaron las matrículas para ${count} alumnos exitosamente.`, 'Matrículas Actualizadas');
                        } else {
                          await showAlert(`Todas las matrículas ya estaban en el formato correcto.`, 'Sin Cambios');
                        }
                      }
                    }}
                  />
                </div>

                <div className="lg:col-span-2 flex flex-col gap-8">
                  {selectedStudent ? (
                    <>
                      <StudentDetails 
                        student={selectedStudent} 
                        groups={groups}
                        subjectAssignments={subjectAssignments}
                        onEdit={() => openEditStudentModal(selectedStudent)}
                        onDelete={handleDeleteStudent}
                      />
                      <PaymentChecklist 
                        student={selectedStudent} 
                        payments={paymentsForSelectedStudent}
                        onSendReminder={sendWhatsAppReminder}
                      />
                      <PaymentList 
                        payments={paymentsForSelectedStudent} 
                        studentName={`${selectedStudent.nombre} ${selectedStudent.apellidoPaterno}`}
                        onEdit={openEditPaymentModal} 
                        onDelete={deletePayment}
                        onAdd={openAddPaymentModal}
                        onExportStudentPayments={handleExportStudentPayments}
                      />
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-full flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
                      <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.122-1.28-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.122-1.28.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold">Selecciona o Crea un Alumno</h3>
                      <p className="text-gray-500 mt-2 max-w-sm">
                        Elige un alumno de la lista para ver sus detalles y pagos, o añade uno nuevo para empezar a gestionar su información.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'grupos' ? (
              <div>
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingGroup(null);
                      setIsGroupModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Añadir Grupo
                  </button>
                </div>
                <GroupList
                  groups={groups}
                  students={students}
                  studyPlanFilter={studyPlanFilter}
                  onViewDetails={(group) => {
                    setDetailGroup(group);
                    setIsGroupDetailModalOpen(true);
                  }}
                  onAuditGroups={async () => {
                    if (await showConfirm('¿Desea auditar y reorganizar todos los grupos automáticamente basándose en los planes de estudio, horarios y fecha de inicio de los alumnos?')) {
                      let createdCount = 0;
                      let updatedCount = 0;
                      let deletedCount = 0;

                      // 1. Agrupar alumnos en "buckets" base por plan, horario y fecha
                      const baseBuckets = new Map<string, Student[]>();
                      students.forEach(student => {
                        if (student.schedule && student.studyPlan && student.courseStartDate) {
                          const key = `${student.studyPlan}|${student.schedule}|${student.courseStartDate}`;
                          if (!baseBuckets.has(key)) {
                            baseBuckets.set(key, []);
                          }
                          baseBuckets.get(key)!.push(student);
                        }
                      });

                      interface GroupPlan {
                        students: Student[];
                        teachers: string[];
                        nameSuffix: string;
                      }

                      // 2. Definir los planes de grupo a generar para cada bucket base
                      const groupPlansByBaseKey = new Map<string, GroupPlan[]>();

                      for (const [key, matchingStudents] of baseBuckets.entries()) {
                         const sample = matchingStudents[0];
                         if (sample.studyPlan === StudyPlan.PrehospitalCare) {
                             if (sample.schedule === StudentSchedule.SAT_VESP || sample.schedule === StudentSchedule.SUN_MAT) {
                                const sorted = [...matchingStudents].sort((a,b) => a.nombre.localeCompare(b.nombre));
                                const mid = Math.ceil(sorted.length / 2);
                                const half1 = sorted.slice(0, mid);
                                const half2 = sorted.slice(mid);
                                
                                groupPlansByBaseKey.set(key, [
                                   { students: half1, teachers: ['Roberto Córdova'], nameSuffix: ' G1' },
                                   { students: half2, teachers: ['Rocío Álvarez'], nameSuffix: ' G2' }
                                ]);
                             } else if (sample.schedule === StudentSchedule.SAT_MAT) {
                                groupPlansByBaseKey.set(key, [
                                   { students: matchingStudents, teachers: ['Roberto Córdova'], nameSuffix: '' }
                                ]);
                             } else {
                                groupPlansByBaseKey.set(key, [
                                   { students: matchingStudents, teachers: [], nameSuffix: '' }
                                ]);
                             }
                         } else {
                             groupPlansByBaseKey.set(key, [
                                { students: matchingStudents, teachers: [], nameSuffix: '' }
                             ]);
                         }
                      }

                      // 3. Obtener grupos existentes y agrupar por "baseKey"
                      const existingGroupsByBaseKey = new Map<string, Group[]>();
                      for (const group of groups) {
                         const key = `${group.studyPlan}|${group.schedule}|${group.generation}`;
                         if (!existingGroupsByBaseKey.has(key)) {
                            existingGroupsByBaseKey.set(key, []);
                         }
                         existingGroupsByBaseKey.get(key)!.push(group);
                      }

                      // 4. Mapear y crear/actualizar/eliminar
                      for (const [baseKey, plans] of groupPlansByBaseKey.entries()) {
                         const existingGroups = existingGroupsByBaseKey.get(baseKey) || [];
                         existingGroups.sort((a, b) => a.name.localeCompare(b.name));
                         
                         for (let i = 0; i < plans.length; i++) {
                            const plan = plans[i];
                            const sample = plan.students[0];
                            if (!sample && plan.students.length === 0) continue; 
                            
                            const requiredStudentIds = plan.students.map(s => s.id).sort();
                            // If base matching rules apply
                            if (sample?.studyPlan !== StudyPlan.PrehospitalCare && requiredStudentIds.length < 2) {
                               continue; // standard logic for others: need >= 2 students
                            }

                            if (i < existingGroups.length) {
                               const group = existingGroups[i];
                               const currentIds = (group.studentIds || []).slice().sort();
                               const newTeachers = plan.teachers.length > 0 ? plan.teachers : group.teachers;
                               const newName = `${sample?.studyPlan || group.studyPlan} - ${sample?.courseStartDate || group.generation}${plan.nameSuffix}`;
                               
                               if (JSON.stringify(requiredStudentIds) !== JSON.stringify(currentIds) || 
                                   JSON.stringify(newTeachers) !== JSON.stringify(group.teachers) ||
                                   group.name !== newName) {
                                  await updateGroupInDb({
                                     ...group,
                                     studentIds: requiredStudentIds,
                                     teachers: newTeachers,
                                     name: newName
                                  });
                                  updatedCount++;
                               }
                            } else {
                               if (sample) {
                                  const scheduleInfo = getGroupScheduleInfo(sample.schedule!);
                                  const newGroup = {
                                    userId: user!.uid,
                                    name: `${sample.studyPlan} - ${sample.courseStartDate}${plan.nameSuffix}`,
                                    studyPlan: sample.studyPlan!,
                                    schedule: sample.schedule!,
                                    generation: sample.courseStartDate!,
                                    classDay: scheduleInfo.classDay,
                                    scheduleStart: scheduleInfo.scheduleStart,
                                    scheduleEnd: scheduleInfo.scheduleEnd,
                                    classroom: 'Por asignar',
                                    teachers: plan.teachers,
                                    studentIds: requiredStudentIds
                                  };
                                  await addGroupToDb(newGroup);
                                  createdCount++;
                               }
                            }
                         }
                         
                         for (let i = plans.length; i < existingGroups.length; i++) {
                            // Delete extra groups not covered by plans OR if students < 2 on a non-TAMP base
                            const sample = plans[0]?.students[0];
                            if (sample?.studyPlan !== StudyPlan.PrehospitalCare && plans[0]?.students.length < 2) {
                               await deleteGroupFromDb(existingGroups[i].id);
                               deletedCount++;
                            } else if (i >= plans.length) {
                               await deleteGroupFromDb(existingGroups[i].id);
                               deletedCount++;
                            }
                         }
                      }
                      
                      // Delete empty existing base keys
                      for (const [baseKey, existingGroups] of existingGroupsByBaseKey.entries()) {
                         if (!groupPlansByBaseKey.has(baseKey)) {
                            for (const group of existingGroups) {
                               await deleteGroupFromDb(group.id);
                               deletedCount++;
                            }
                         }
                      }

                      await showAlert(`Auditoría completada. Grupos creados: ${createdCount}, actualizados: ${updatedCount}, eliminados (vacíos o < 2 alumnos): ${deletedCount}.`, 'Auditoría de Grupos');
                    }
                  }}
                />
              </div>
            ) : activeTab === 'docentes' ? (
              <TeacherList 
                teachers={teachers} 
                onAddTeacher={() => setIsTeacherModalOpen(true)} 
                onDeleteTeacher={deleteTeacherFromDb} 
                onSimulateLogin={(teacher) => setAdminTeacherMode(teacher)}
                onAssignCredentials={(teacher) => {
                  setTeacherToAssign(teacher);
                  setIsAssignCredentialsModalOpen(true);
                }}
                onAssignSubjects={(teacher) => {
                  setTeacherToAssignSubjects(teacher);
                  setIsTeacherSubjectsModalOpen(true);
                }}
              />
            ) : activeTab === 'planes' ? (
              <StudyPlansAdmin />
            ) : null}
          </>
        ) : user?.email?.includes('@cessdigital.local') ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center max-w-lg mx-auto mt-10">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Matrícula no encontrada</h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              No encontramos ningún alumno activo con esta matrícula en el sistema.
            </p>
            <button 
              onClick={() => logout()}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Volver a intentar
            </button>
          </div>
        ) : (
          <StudentAccountClaim 
             userEmail={user.email} 
             onClaimSuccess={async (matricula) => {
               await showAlert(`¡Bienvenido! Tu cuenta ha sido enlazada exitosamente a la matrícula ${matricula}.`, 'Cuenta Enlazada');
               // After claim, the students snapshot will naturally update!
             }}
          />
        )}
      </main>

      {isTeacherModalOpen && (
        <TeacherFormModal
          isOpen={isTeacherModalOpen}
          onClose={() => setIsTeacherModalOpen(false)}
          onSave={addTeacherToDb}
          userId={user.uid}
        />
      )}

      {isAssignCredentialsModalOpen && (
        <AssignCredentialsModal
          isOpen={isAssignCredentialsModalOpen}
          onClose={() => {
            setIsAssignCredentialsModalOpen(false);
            setTeacherToAssign(null);
          }}
          teacher={teacherToAssign}
          onSave={(updatedTeacher) => {
            updateTeacherInDb(updatedTeacher);
          }}
        />
      )}

      {isTeacherSubjectsModalOpen && (
        <TeacherSubjectsModal
          isOpen={isTeacherSubjectsModalOpen}
          onClose={() => {
            setIsTeacherSubjectsModalOpen(false);
            setTeacherToAssignSubjects(null);
          }}
          teacher={teacherToAssignSubjects}
          groups={groups}
          subjectAssignments={subjectAssignments}
          onAddSubject={(assignment) => {
            addSubjectAssignmentToDb({
              ...assignment,
              createdAt: new Date().toISOString()
            });
          }}
          onDeleteSubject={deleteSubjectAssignmentFromDb}
        />
      )}

      {isStudentModalOpen && (
        <StudentFormModal 
          isOpen={isStudentModalOpen}
          onClose={closeStudentModal}
          onSave={handleStudentSave}
          student={editingStudent}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentFormModal
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
          onSave={handlePaymentSave}
          payment={editingPayment}
          students={students}
          selectedStudentId={selectedStudentId}
          payments={payments}
        />
      )}

      {isGroupModalOpen && (
        <GroupFormModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onSave={handleGroupSave}
          group={editingGroup}
          existingGroups={groups}
          teachers={teachers}
        />
      )}

      {isGroupDetailModalOpen && (
        <GroupDetailModal
          isOpen={isGroupDetailModalOpen}
          onClose={() => setIsGroupDetailModalOpen(false)}
          group={detailGroup}
          students={students}
          onEdit={(group) => {
            setEditingGroup(group);
            setIsGroupModalOpen(true);
          }}
          onDelete={handleDeleteGroup}
          onManageStudents={(group) => {
            setManagingGroup(group);
            setIsGroupStudentsModalOpen(true);
          }}
          onViewSchedule={(group) => {
            setScheduleGroup(group);
            setIsGroupScheduleModalOpen(true);
          }}
        />
      )}

      {isGroupStudentsModalOpen && (
        <GroupStudentsModal
          isOpen={isGroupStudentsModalOpen}
          onClose={() => setIsGroupStudentsModalOpen(false)}
          group={groups.find(g => g.id === managingGroup?.id) || null}
          students={students}
          allGroups={groups}
          onUpdateGroupStudents={handleUpdateGroupStudents}
        />
      )}

      {isGroupScheduleModalOpen && (
        <GroupScheduleModal
          isOpen={isGroupScheduleModalOpen}
          onClose={() => setIsGroupScheduleModalOpen(false)}
          group={groups.find(g => g.id === scheduleGroup?.id) || null}
          subjectAssignments={subjectAssignments}
        />
      )}

      {isWhatsAppModalOpen && pendingWhatsApp && (
        <WhatsAppConfirmationModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setPendingWhatsApp(null);
          }}
          onConfirm={() => {
            sendWhatsAppReceipt(pendingWhatsApp.student, pendingWhatsApp.payment);
            setIsWhatsAppModalOpen(false);
            setPendingWhatsApp(null);
          }}
          student={pendingWhatsApp.student}
          payment={pendingWhatsApp.payment}
        />
      )}
    </div>
  );
};

export default App;