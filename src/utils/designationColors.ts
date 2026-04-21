export const DESIGNATION_COLORS: Record<string, { bg: string; color: string }> = {
  'Barista': { bg: '#fef3c7', color: '#92400e' },
  'MDS': { bg: '#fee2e2', color: '#991b1b' },
  'GEL': { bg: '#dcfce7', color: '#166534' },
  'VIP': { bg: '#f3e8ff', color: '#6b21a8' },
  'Crew Trainer': { bg: '#dbeafe', color: '#1e40af' },
  'Core Crew': { bg: '#e0e7ff', color: '#3730a3' },
  'Part Time Crew': { bg: '#fce7f3', color: '#9f1239' }
};

export function getDesignationColor(designation: string): { bg: string; color: string } {
  return DESIGNATION_COLORS[designation] || { bg: '#f3f4f6', color: '#374151' };
}
