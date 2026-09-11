import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; title: string; resolve: () => void } | null>(null);
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; message: string; title: string; resolve: (value: boolean) => void } | null>(null);

  const showAlert = (message: string, title = 'Atención') => {
    return new Promise<void>((resolve) => {
      setAlertState({ isOpen: true, message, title, resolve });
    });
  };

  const showConfirm = (message: string, title = 'Confirmar Acción') => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ isOpen: true, message, title, resolve });
    });
  };

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Alert Modal */}
      {alertState?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{alertState.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{alertState.message}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end">
              <button
                onClick={handleAlertClose}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{confirmState.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{confirmState.message}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
