
import React, { useMemo } from 'react';
import { Payment, PaymentStatus, Student, StudentStatus, StudyPlan, StudyPlanFilter } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UsersIcon } from './icons/UsersIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { calculateDueDate, STUDY_PLAN_CONFIG, generatePaymentSchedule, calculatePaymentPlanStatus } from '../utils/paymentPlans';
import { getStudentPeriod } from '../utils/studentPeriods';
import { useModal } from './ModalProvider';

interface DashboardProps {
  payments: Payment[];
  students: Student[];
  studyPlanFilter: StudyPlanFilter;
}

const STUDY_PLAN_COLORS: { [key in StudyPlan]: string } = {
  [StudyPlan.GeneralNursing]: '#0088FE',
  [StudyPlan.LevelingDegree]: '#00C49F',
  [StudyPlan.NursingAssistant]: '#FFBB28',
  [StudyPlan.PrehospitalCare]: '#FF8042',
  [StudyPlan.SurgicalNursing]: '#8884d8',
  [StudyPlan.IndustrialNursing]: '#82ca9d',
  [StudyPlan.Podiatry]: '#ffc658',
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center space-x-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ payments, students, studyPlanFilter }) => {
  const { showAlert } = useModal();
  const { totalPaid, totalOverdue, studyPlanData, activeStudents } = useMemo(() => {
    let paid = 0;
    const studentMap: Map<string, Student> = new Map(students.map((s) => [s.id, s]));
    const studyPlans: { [key in StudyPlan]?: number } = {};

    payments.forEach((p) => {
      if (p.status === PaymentStatus.Paid) {
        paid += p.amount;
        const student = studentMap.get(p.studentId);
        if (student && student.status === StudentStatus.Active) {
            studyPlans[student.studyPlan] = (studyPlans[student.studyPlan] || 0) + p.amount;
        }
      }
    });
    
    let overdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStudentsList = students.filter(s => s.status === StudentStatus.Active && s.courseStartDate);
    
    activeStudentsList.forEach(student => {
        const { studyPlan, courseStartDate } = student;
        const paymentPlanStatus = calculatePaymentPlanStatus(student, payments);
        const config = STUDY_PLAN_CONFIG[studyPlan];
        
        // Check enrollment
        const enrollmentDueDate = calculateDueDate(courseStartDate, studyPlan, 'enrollment');
        if (!paymentPlanStatus.enrollment && enrollmentDueDate < today) {
            overdue += config.prices.enrollment;
        }

        // Check schedule
        const schedule = generatePaymentSchedule(courseStartDate, studyPlan, student.hasScholarship);
        schedule.forEach((item, index) => {
            if (!paymentPlanStatus.schedule[index] && item.dueDate < today) {
                overdue += item.cost;
            }
        });
    });


    const chartData = Object.entries(studyPlans)
        .map(([name, value]) => ({ name: name as StudyPlan, value }))
        .sort((a, b) => b.value - a.value);

    return {
      totalPaid: paid,
      totalOverdue: overdue,
      studyPlanData: chartData,
      activeStudents: activeStudentsList.length,
    };
  }, [payments, students]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const handleExportCSV = async () => {
    if (payments.length === 0) {
      await showAlert("No hay pagos para exportar.", "Atención");
      return;
    }

    const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));

    const headers = [
      'ID Alumno',
      'Nombre Alumno',
      'Plan de Estudios',
      'Periodo Actual',
      'Descripción',
      'Monto',
      'Fecha',
      'Categoría',
      'Estado'
    ];

    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;

    const csvRows = [headers.join(',')];

    payments.forEach(payment => {
      const student = studentMap.get(payment.studentId);
      const studentName = student ? `${student.nombre} ${student.apellidoPaterno} ${student.apellidoMaterno}` : 'N/A';
      const studyPlanStr = student?.studyPlan || 'N/A';
      const periodStr = student ? getStudentPeriod(student.courseStartDate, student.studyPlan) : 'N/A';
      
      const row = [
        payment.studentId,
        studentName,
        studyPlanStr,
        periodStr,
        escapeCSV(payment.description),
        payment.amount,
        payment.date, // Use the date string directly as it's already YYYY-MM-DD
        payment.category,
        payment.status
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `reporte_pagos_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const dashboardTitle = studyPlanFilter === 'Todos' ? 'Dashboard General' : `Dashboard: ${studyPlanFilter}`;

  return (
    <div>
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{dashboardTitle}</h2>
            <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900"
                >
                <DownloadIcon className="w-5 h-5 mr-2 -ml-1" />
                Exportar Pagos (CSV)
            </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
                title="Alumnos Activos" 
                value={activeStudents.toString()}
                icon={<UsersIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />} 
            />
            <StatCard 
                title="Ingresos Totales (Pagado)" 
                value={formatCurrency(totalPaid)} 
                icon={<CurrencyIcon className="w-6 h-6 text-green-600 dark:text-green-400" />} 
            />
        </div>
        <div className="mt-6">
             <StatCard 
                title="Total Vencido" 
                value={formatCurrency(totalOverdue)} 
                icon={<ClockIcon className="w-6 h-6 text-red-600 dark:text-red-400" />} 
            />
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">Ingresos por Plan de Estudio (Activos)</h3>
            {studyPlanData.length > 0 ? (
                 <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <PieChart>
                        <Pie
                            data={studyPlanData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                            {studyPlanData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={STUDY_PLAN_COLORS[entry.name] || '#cccccc'} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No hay datos de ingresos para mostrar.
                </div>
            )}
        </div>
    </div>
  );
};

export default Dashboard;
