/**
 * Deep equality check for objects, arrays, and primitives.
 * Handles: primitives, arrays, plain objects, Date, null/undefined
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Primitives and reference equality
  if (a === b) return true;

  // Null/undefined checks
  if (a == null || b == null) return a === b;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Type mismatch
  if (typeof a !== typeof b) return false;

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  // Object comparison (plain objects only)
  if (typeof a === "object" && typeof b === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => deepEqual(objA[key], objB[key]));
  }

  return false;
}
