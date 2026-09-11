
import React, { useState, useEffect } from 'react';
import { Payment, PaymentStatus, PaymentCategory, Student } from '../types';
import { useModal } from './ModalProvider';
import { getNextPendingPaymentInfo } from '../utils/paymentPlans';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<Payment, 'id'>, penaltyAmount?: number) => void;
  payment: Payment | null;
  students: Student[];
  selectedStudentId: string | null;
  payments: Payment[];
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({ isOpen, onClose, onSave, payment, students, selectedStudentId, payments }) => {
  const { showAlert } = useModal();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<PaymentCategory>(PaymentCategory.MonthlyFee);
  const [status, setStatus] = useState<PaymentStatus>(PaymentStatus.Pending);
  const [studentId, setStudentId] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'auto' | 'manual'>('auto');
  const [lateFeeApplied, setLateFeeApplied] = useState(0);
  const [lostScholarship, setLostScholarship] = useState(0);
  const [penaltyAmount, setPenaltyAmount] = useState(0);

  useEffect(() => {
    if (payment) {
      setDescription(payment.description);
      setAmount(payment.amount);
      setDate(payment.date.split('T')[0]);
      setCategory(payment.category);
      setStatus(payment.status);
      setStudentId(payment.studentId);
      setPaymentType('manual');
      setLateFeeApplied(0);
      setLostScholarship(0);
      setPenaltyAmount(0);
    } else {
      const initialStudentId = selectedStudentId || (students.length > 0 ? students[0].id : '');
      setStudentId(initialStudentId);
      setDate(new Date().toISOString().split('T')[0]);
      setStatus(PaymentStatus.Pending);
      setPaymentType('auto');
    }
  }, [payment, isOpen, selectedStudentId, students]);

  useEffect(() => {
    if (!payment && paymentType === 'auto' && studentId) {
      const student = students.find(s => s.id === studentId);
      if (student) {
        const nextPayment = getNextPendingPaymentInfo(student, payments);
        if (nextPayment) {
          setCategory(nextPayment.category);
          setDescription(nextPayment.description);
          setAmount(nextPayment.totalAmount);
          setLateFeeApplied(nextPayment.lateFee);
          setLostScholarship(nextPayment.lostScholarshipAmount);
          setPenaltyAmount(nextPayment.penaltyAmount);
        } else {
          setCategory(PaymentCategory.Other);
          setDescription('');
          setAmount('');
          setLateFeeApplied(0);
          setLostScholarship(0);
          setPenaltyAmount(0);
        }
      }
    } else if (!payment && paymentType === 'manual') {
      setLateFeeApplied(0);
      setLostScholarship(0);
      setPenaltyAmount(0);
    }
  }, [studentId, paymentType, payment, students, payments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || amount <= 0) {
      await showAlert('Por favor, introduce un monto válido.', 'Error');
      return;
    }
    if (!studentId) {
        await showAlert('Por favor, selecciona un alumno.', 'Error');
        return;
    }
    onSave({
      description,
      amount: Number(amount),
      date,
      category,
      status,
      studentId
    }, paymentType === 'auto' ? penaltyAmount : 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{payment ? 'Editar Pago' : 'Añadir Nuevo Pago'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {!payment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Registro</label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-indigo-600"
                        name="paymentType"
                        value="auto"
                        checked={paymentType === 'auto'}
                        onChange={() => setPaymentType('auto')}
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Siguiente Cuota (Automático)</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-indigo-600"
                        name="paymentType"
                        value="manual"
                        checked={paymentType === 'manual'}
                        onChange={() => setPaymentType('manual')}
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Otro Pago (Manual)</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="student" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alumno</label>
                <select
                  id="student"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                  disabled={!!payment} // No se puede cambiar el alumno de un pago existente
                >
                  <option value="" disabled>Selecciona un alumno</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{`${s.apellidoPaterno} ${s.apellidoMaterno}, ${s.nombre}`}</option>
                  ))}
                </select>
              </div>
               <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 disabled:opacity-50"
                  required
                  disabled={paymentType === 'auto' && !payment}
                />
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto (MXN)</label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 disabled:opacity-50"
                  required
                  step="0.01"
                  min="0"
                  disabled={paymentType === 'auto' && !payment}
                />
                {penaltyAmount > 0 && paymentType === 'auto' && !payment && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Incluye amonestación por pago tardío de ${lateFeeApplied} MXN
                    {lostScholarship > 0 ? ` y pérdida de beca por $${lostScholarship} MXN` : ''}.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha de Pago</label>
                <input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  required
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PaymentCategory)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 disabled:opacity-50"
                  disabled={paymentType === 'auto' && !payment}
                >
                  {Object.values(PaymentCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estado</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                >
                  {Object.values(PaymentStatus).map(stat => (
                    <option key={stat} value={stat}>{stat}</option>
                  ))}
                </select>
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
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentFormModal;