

import React from 'react';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { StudyPlan, StudyPlanFilter } from '../types';
import { useAuth } from '../AuthProvider';

interface HeaderProps {
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    currentStudyPlanFilter: StudyPlanFilter;
    onStudyPlanFilterChange: (filter: StudyPlanFilter) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, currentStudyPlanFilter, onStudyPlanFilterChange }) => {
  const { logout, user } = useAuth();
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              Control de Pagos
            </h1>
            <div className="hidden md:block">
                <label htmlFor="studyPlanFilter" className="sr-only">Filtrar por Plan de Estudio</label>
                 <select
                    id="studyPlanFilter"
                    value={currentStudyPlanFilter}
                    onChange={(e) => onStudyPlanFilterChange(e.target.value as StudyPlanFilter)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="Todos">Todos los Planes</option>
                    {Object.values(StudyPlan).map(plan => (
                        <option key={plan} value={plan}>{plan}</option>
                    ))}
                </select>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user && (
              <div className="flex items-center space-x-3 mr-2">
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
            <button
              onClick={onToggleTheme}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            >
              {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;