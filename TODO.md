# TODO (ARRABAL/ALMOZARA/LAS FUENTES/SAN JOSÉ y similares) — Corrección de fiabilidad y dataset

- [x] 1) Revisar `src/data/barrioComparsasBloquesFiabilidad.ts` y asegurar que incluya todos los barrios del listado proporcionado con sus cabezudos/gigantes correctos (san-jose ya estaba añadido).
- [x] 2) Corregir `src/data/barrioComparsasData.ts` para que por cada barrio tenga `hasGigantes/hasCabezudos` coherentes y la lista `personajes` use los mismos nombres que en fiabilidad (al menos en San José y Santa Isabel).
- [ ] 3) Corregir cualquier ID/nombre de barrio (p. ej. `arrabal` vs `rabal`, `casetas`/otros) para que el filtro matchee.
- [x] 4) Build: `npm run build`.
- [ ] 5) (Si aplica) revisar en `src/components`/`src/pages` dónde se consume el filtro y verificar que está usando el dataset correcto.


