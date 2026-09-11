import React from 'react';
import { Student, Payment } from '../types';

interface WhatsAppConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  student: Student;
  payment: Omit<Payment, 'id'>;
}

const WhatsAppConfirmationModal: React.FC<WhatsAppConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  student,
  payment,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">¿Enviar recibo por WhatsApp?</h3>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-gray-600 dark:text-gray-400">
            Se enviará una notificación a <strong>{student.nombre} {student.apellidoPaterno}</strong> con los detalles del pago:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-600">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Monto:</span>
              <span className="font-semibold text-gray-900 dark:text-white">${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Concepto:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{payment.description}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{student.telefono}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            No, omitir
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-lg shadow-green-600/20 transition-all active:scale-95"
          >
            Sí, enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConfirmationModal;
