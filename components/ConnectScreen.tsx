
import React from 'react';
import { GoogleDriveIcon } from './icons/GoogleDriveIcon';

interface ConnectScreenProps {
    onSignIn: () => void;
}

const ConnectScreen: React.FC<ConnectScreenProps> = ({ onSignIn }) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    Control de Pagos de Alumnos
                </h1>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Conecta tu cuenta de Google Drive para guardar y cargar los datos de forma segura en la nube.
                </p>
                <div className="mt-8">
                    <button
                        onClick={onSignIn}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-transform transform hover:scale-105"
                    >
                        <GoogleDriveIcon className="w-6 h-6 mr-3" />
                        Conectar con Google Drive
                    </button>
                </div>
                <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
                    La aplicación solicitará permiso para crear y administrar sus propios archivos en tu Google Drive. No podrá acceder a otros archivos.
                </p>
            </div>
        </div>
    );
};

export default ConnectScreen;