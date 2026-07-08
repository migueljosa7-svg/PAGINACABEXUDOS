import { validateSingleSource } from './singleSourceValidator';

/**
 * Guard para CI/build/desarrollo.
 * - En producción debe fallar si hay inconsistencias reales.
 * - En desarrollo se puede activar mediante env, pero el objetivo es que no dependa de placeholders.
 */
export function runSingleSourceValidationGuard(): void {
  const result = validateSingleSource();

  if (!result.ok) {
    const header = '❌ singleSource validation failed';

    const lines = result.issues.map((i) => {
      const details = i.details as unknown as {
        barrio?: { id?: string };
        route?: { id?: string };
      };

      const where = details?.barrio?.id ? ` | barrio=${details.barrio.id}` : '';
      const extra = details?.route?.id ? ` | route=${details.route.id}` : '';
      return `- [${i.code}] ${i.message}${where}${extra}`;
    });

    console.error(header);
    console.error(lines.join('\n'));

    throw new Error(`${header}: ${result.issues.length} issue(s).`);
  }
}

