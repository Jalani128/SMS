import { IGradeBand } from '../models/GradingScale.model.js';

/**
 * Standard default grading scale used when school has not configured a custom scale
 */
export const DEFAULT_GRADE_BANDS: IGradeBand[] = [
  { grade: 'A+', minPercentage: 90, maxPercentage: 100, gradePoint: 4.0, isPassing: true, description: 'Outstanding' },
  { grade: 'A', minPercentage: 80, maxPercentage: 89.99, gradePoint: 3.5, isPassing: true, description: 'Excellent' },
  { grade: 'B', minPercentage: 70, maxPercentage: 79.99, gradePoint: 3.0, isPassing: true, description: 'Very Good' },
  { grade: 'C', minPercentage: 60, maxPercentage: 69.99, gradePoint: 2.5, isPassing: true, description: 'Good' },
  { grade: 'D', minPercentage: 50, maxPercentage: 59.99, gradePoint: 2.0, isPassing: true, description: 'Satisfactory / Pass' },
  { grade: 'F', minPercentage: 0, maxPercentage: 49.99, gradePoint: 0.0, isPassing: false, description: 'Fail' },
];

/**
 * Standard percentage rounding policy: 2 decimal places (e.g., 87.654 -> 87.65, 87.655 -> 87.66)
 */
export const roundPercentage = (percentage: number): number => {
  if (isNaN(percentage) || percentage === null || percentage === undefined) return 0;
  return Math.round((percentage + Number.EPSILON) * 100) / 100;
};

/**
 * Validates that grading bands cover range 0-100 without overlaps or unintended gaps
 */
export const validateGradingBands = (bands: IGradeBand[]): { isValid: boolean; error?: string } => {
  if (!bands || !Array.isArray(bands) || bands.length === 0) {
    return { isValid: false, error: 'At least one grade band is required' };
  }

  // Sort descending by minPercentage
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);

  // Check bounds
  for (const b of sorted) {
    if (b.minPercentage < 0 || b.maxPercentage > 100 || b.minPercentage > b.maxPercentage) {
      return {
        isValid: false,
        error: `Invalid band range for grade "${b.grade}": ${b.minPercentage}% to ${b.maxPercentage}%`,
      };
    }
  }

  // Highest band should cover up to 100%
  if (sorted[0].maxPercentage < 100) {
    return {
      isValid: false,
      error: `Highest grade band "${sorted[0].grade}" must reach 100% (currently ${sorted[0].maxPercentage}%)`,
    };
  }

  // Lowest band should reach 0%
  const lowest = sorted[sorted.length - 1];
  if (lowest.minPercentage > 0) {
    return {
      isValid: false,
      error: `Lowest grade band "${lowest.grade}" must start at 0% (currently ${lowest.minPercentage}%)`,
    };
  }

  // Check for overlaps and gaps between consecutive bands
  for (let i = 0; i < sorted.length - 1; i++) {
    const higher = sorted[i];
    const lower = sorted[i + 1];

    // Gap check: if higher.minPercentage > lower.maxPercentage + 0.01
    if (higher.minPercentage > lower.maxPercentage + 0.05) {
      return {
        isValid: false,
        error: `Gap detected between band "${lower.grade}" (max ${lower.maxPercentage}%) and "${higher.grade}" (min ${higher.minPercentage}%)`,
      };
    }

    // Overlap check: if lower.maxPercentage >= higher.minPercentage + 0.01 (allowing for 0.01 boundary transition)
    if (lower.maxPercentage > higher.minPercentage) {
      return {
        isValid: false,
        error: `Overlap detected between band "${lower.grade}" (max ${lower.maxPercentage}%) and "${higher.grade}" (min ${higher.minPercentage}%)`,
      };
    }
  }

  return { isValid: true };
};

/**
 * Calculates grade and grade points for a given percentage using active grade bands
 */
export const calculateGradeForPercentage = (
  percentage: number,
  bands: IGradeBand[] = DEFAULT_GRADE_BANDS
): { grade: string; gradePoint?: number; isPassing: boolean; description?: string } => {
  const rounded = roundPercentage(percentage);

  // Sort descending by minPercentage
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);

  for (const band of sorted) {
    // If percentage falls in [min, max] (or within 0.01 tolerance)
    if (rounded >= band.minPercentage && rounded <= band.maxPercentage + 0.01) {
      return {
        grade: band.grade,
        gradePoint: band.gradePoint,
        isPassing: band.isPassing,
        description: band.description,
      };
    }
  }

  // Edge fallback: if >= highest max
  if (rounded >= sorted[0].maxPercentage) {
    return {
      grade: sorted[0].grade,
      gradePoint: sorted[0].gradePoint,
      isPassing: sorted[0].isPassing,
      description: sorted[0].description,
    };
  }

  // Edge fallback: if <= lowest min
  const lowest = sorted[sorted.length - 1];
  return {
    grade: lowest.grade,
    gradePoint: lowest.gradePoint,
    isPassing: lowest.isPassing,
    description: lowest.description,
  };
};
