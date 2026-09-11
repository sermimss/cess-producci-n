import { Student, StudyPlan } from '../types';

export function generateMatricula(student: Partial<Student>, allStudents: Student[]): string {
  const planConfigMap: Record<StudyPlan, string> = {
    [StudyPlan.NursingAssistant]: 'AUX',
    [StudyPlan.GeneralNursing]: 'TEG',
    [StudyPlan.LevelingDegree]: 'LIC',
    [StudyPlan.PrehospitalCare]: 'TAMP',
    [StudyPlan.IndustrialNursing]: 'IND',
    [StudyPlan.SurgicalNursing]: 'QX',
    [StudyPlan.Podiatry]: 'POD'
  };
  
  const prefix = student.studyPlan ? planConfigMap[student.studyPlan] || 'UNK' : 'UNK';
  
  // Extraer las primeras 4 letras de la CURP o usar el apellido paterno + materno + nombre o 'XXXX'
  let curpLetters = 'XXXX';
  if (student.curp && student.curp.length >= 4) {
    curpLetters = student.curp.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
  } else if (student.apellidoPaterno) {
    // Fallback if no CURP: construct similar to CURP
    const p1 = student.apellidoPaterno.substring(0, 2).toUpperCase();
    const p2 = (student.apellidoMaterno?.substring(0, 1) || 'X').toUpperCase();
    const p3 = (student.nombre?.substring(0, 1) || 'X').toUpperCase();
    curpLetters = `${p1}${p2}${p3}`.replace(/[^A-Z]/g, 'X');
  }

  const yearDigits = new Date().getFullYear().toString().slice(-2);
  
  let maxIncrement = 0;
  allStudents.forEach(s => {
    if (s.matricula) {
      // Find the counter at the end of the matricula
      // Format is PREFIX (2-4 letters) + CURP (4 letters) + Year (2 digits) + Increment (3+ digits)
      const match = s.matricula.match(/^[a-zA-Z]{6,8}\d{2}(\d{3,})$/);
      if (match) {
         const num = parseInt(match[1], 10);
         if (!isNaN(num) && num > maxIncrement) {
           maxIncrement = num;
         }
      } else {
        // Fallback for custom or old formats: just look for the last 3 digits IF it's a short string
        const fallbackMatch = s.matricula.match(/\d{3,}$/);
        if (fallbackMatch && fallbackMatch[0].length <= 4) { // Max 4 digits counter in fallback to prevent huge numbers
           const num = parseInt(fallbackMatch[0], 10);
           if (!isNaN(num) && num > maxIncrement) {
             maxIncrement = num;
           }
        }
      }
    }
  });
  
  const nextNumber = (maxIncrement + 1).toString().padStart(3, '0');
  return `${prefix}${curpLetters}${yearDigits}${nextNumber}`;
}
