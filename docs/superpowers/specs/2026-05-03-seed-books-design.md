# Spec: Carga masiva de libros desde JSON

**Fecha:** 2026-05-03  
**Archivo fuente:** `libros2.json` (2027 registros)  
**DB objetivo:** `books.db` (SQLite)

## Objetivo

Cargar masivamente los libros del archivo `libros2.json` a la base de datos, promoviendo al usuario `caro@libros.com` a rol `admin` y usándolo como `creator_id` de todos los libros importados.

## Implementación

### Archivo

`scripts/seed_books.py` — script standalone, sin dependencias del servidor ni del entorno async de la app.

### Pasos en orden

1. **Promover usuario** — `UPDATE users SET role='admin' WHERE email='caro@libros.com'`
2. **Obtener UUID** — query del `id` del usuario para usarlo como `creator_id`
3. **Filtrar registros** — descartar entradas donde `nombre` o `autor` sea `"(anonymous)"`
4. **Bulk insert** — un solo `executemany` inserta todos los libros válidos en una transacción

### Mapeo de campos

| JSON      | DB column    | Valor           |
|-----------|-------------|-----------------|
| `nombre`  | `title`      | del JSON        |
| `autor`   | `author`     | del JSON        |
| —         | `year`       | `NULL`          |
| —         | `url`        | `NULL`          |
| —         | `id`         | UUID v4 generado|
| —         | `creator_id` | UUID del usuario|
| —         | `is_deleted` | `0`             |
| —         | `created_at` | timestamp actual|

### Manejo de errores

- Si `caro@libros.com` no existe → imprime error y termina sin tocar la DB
- Si `libros2.json` no existe o es inválido → excepción con mensaje legible
- Toda la operación corre en una transacción — fallo parcial hace rollback automático
- Salida final: `"X libros insertados, Y omitidos (anonymous)"`

## Ejecución

```bash
python scripts/seed_books.py
```

No requiere que el servidor esté corriendo. Debe ejecutarse desde la raíz del repositorio.
