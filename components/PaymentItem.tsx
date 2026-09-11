
import React from 'react';
import { Payment, PaymentStatus } from '../types';
import { EditIcon } from './icons/EditIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useModal } from './ModalProvider';

interface PaymentItemProps {
  payment: Payment;
  onEdit: (payment: Payment) => void;
  onDelete: (id: string) => void;
  isCardView: boolean;
}

const PaymentItem: React.FC<PaymentItemProps> = ({ payment, onEdit, onDelete, isCardView }) => {
  const { showConfirm } = useModal();
  const { id, description, amount, date, category, status } = payment;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight of the current day for accurate comparison

  const paymentDate = new Date(date);
  // The date string 'YYYY-MM-DD' is interpreted as UTC midnight.
  // Adjust it to local timezone midnight to prevent off-by-one day errors.
  paymentDate.setMinutes(paymentDate.getMinutes() + paymentDate.getTimezoneOffset());
  
  const isOverdue = status === PaymentStatus.Pending && paymentDate < today;

  const formatDate = (dateString: string) => {
    // Agregamos un día para corregir el desfase de zona horaria en la visualización
    const dateObj = new Date(dateString);
    dateObj.setDate(dateObj.getDate() + 1);
    return dateObj.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };
  
  const statusBadge = (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        status === PaymentStatus.Paid 
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        : isOverdue
        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }`}>
      {isOverdue ? 'Vencido' : status}
    </span>
  );

  const handleDelete = async () => {
    if (await showConfirm(`¿Estás seguro de que quieres eliminar el pago "${description}"?`)) {
      onDelete(id);
    }
  };

  if (isCardView) {
    return (
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
        <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100">{description}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{category} &middot; {formatDate(date)}</p>
            </div>
            <p className="text-lg font-bold text-right text-gray-900 dark:text-white">{formatCurrency(amount)}</p>
        </div>
        <div className="mt-2 flex justify-between items-center">
            {statusBadge}
            <div className="flex space-x-3">
                <button onClick={() => onEdit(payment)} title="Editar pago" className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200">
                    <EditIcon className="w-5 h-5" />
                </button>
                <button onClick={handleDelete} title="Eliminar pago" className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200">
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <tr className={isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{description}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-gray-300 font-semibold">{formatCurrency(amount)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {formatDate(date)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
        {category}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {statusBadge}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-4">
          <button onClick={() => onEdit(payment)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200" aria-label="Editar" title="Editar pago">
            <EditIcon className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" aria-label="Eliminar" title="Eliminar pago">
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default PaymentItem;