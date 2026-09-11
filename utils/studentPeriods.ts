import { StudyPlan } from '../types';

export function getStudentPeriod(courseStartDate: string | undefined, studyPlan: StudyPlan): string {
  if (!courseStartDate) return 'Sin asignación principal';

  const startDate = new Date(courseStartDate);
  const now = new Date();
  
  // Calculate difference in months (approximate)
  let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  
  // Adjust if day of month hasn't been reached yet
  if (now.getDate() < startDate.getDate()) {
    monthsDiff--;
  }

  // Prevent negative periods if start date is in the future
  const safeMonthsDiff = Math.max(0, monthsDiff);

  switch (studyPlan) {
    case StudyPlan.LevelingDegree:
    case StudyPlan.GeneralNursing: {
      // Cuatrimestral (every 4 months)
      const cuatrimestre = Math.floor(safeMonthsDiff / 4) + 1;
      return `${cuatrimestre}° Cuatrimestre`;
    }
    case StudyPlan.NursingAssistant: {
      // Semestral (every 6 months)
      const semestre = Math.floor(safeMonthsDiff / 6) + 1;
      return `${semestre}° Semestre`;
    }
    default: {
      // Default to Cuatrimestral if we want to default, but user said others are whatever.
      // Since podiatry/etc are shorter, maybe "Ciclo"
      const ciclo = Math.floor(safeMonthsDiff / 4) + 1;
      return `Ciclo ${ciclo}`;
    }
  }
}
