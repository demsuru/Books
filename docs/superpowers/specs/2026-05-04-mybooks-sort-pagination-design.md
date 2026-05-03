# Spec: Paginación y Ordenamiento por Puntuación en Mis Libros

**Fecha:** 2026-05-04
**Scope:** Backend + Frontend
**Páginas afectadas:** MyBooksPage (`/mybooks`)

---

## Resumen

Añadir paginación (máx. 20 libros por página) y ordenamiento por puntuación personal al endpoint `GET /books/mybooks` y a la página "Mis Libros". El sort se activa mediante un botón con ícono de sliders que despliega un dropdown con las opciones de orden. La búsqueda por título/autor pasa a ser server-side para funcionar correctamente con la nueva paginación.

---

## Backend

### Endpoint modificado: `GET /books/mybooks`

**Parámetros nuevos (todos opcionales):**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | int | 1 | Página actual (via `PaginationParams`) |
| `limit` | int | 20 | Libros por página (via `PaginationParams`) |
| `search` | str | None | Filtra por título o autor (ilike) |
| `sort_by` | str | None | Campo de ordenamiento; soportado: `"score"` |
| `order` | str | `"desc"` | Dirección: `"asc"` o `"desc"` |

**Comportamiento del sort:**
- Solo se aplica si `sort_by="score"` (valores no reconocidos se ignoran silenciosamente).
- Libros con `score = NULL` siempre van al final, independientemente de `order`, usando `.nullslast()` de SQLAlchemy.
- Si `order` es cualquier valor que no sea `"asc"`, se trata como `"desc"`.

**Comportamiento del search:**
- Filtra `Books.title.ilike(f"%{search}%")` OR `Books.author.ilike(f"%{search}%")`.
- Se aplica antes del sort y antes de paginar.

### Schema nuevo: `BookRateListResponse`

```python
class BookRateListResponse(BaseModel):
    items: list[BookRateList]
    total: int
    page: int
    pages: int
```

Se añade a `src/books/schema.py`. El response del endpoint cambia de `list[BookRateList]` a `BookRateListResponse`.

### Archivos a modificar (backend)

- `src/books/schema.py` — añadir `BookRateListResponse`
- `src/books/router.py` — actualizar `get_my_books`: parámetros, query con filter/sort/paginate, response model

---

## Frontend

### `bookService.js`

`getMyBooks` pasa de `(token)` a `(token, { page = 1, limit = 20, search = '', sort_by = '', order = '' } = {})`.
Construye `URLSearchParams` y hace fetch igual que `getBooks`.

### `MyBooksPage.jsx`

**Estado nuevo:**
- `page` (int, default 1), `pages` (int), `total` (int)
- `search` (string) — valor del input
- `query` (string) — valor debounced que dispara el fetch (resetea `page` a 1 al cambiar)
- `sort` (`null | 'asc' | 'desc'`) — orden activo
- `showSortMenu` (boolean) — visibilidad del dropdown

**Lógica de fetch:**
- Se reemplaza el `useEffect` + filter client-side actual por un `useCallback fetchBooks` + `useEffect` que reacciona a `[page, query, sort]`, idéntico al patrón de `HomePage`.
- El debounce del search usa `useRef` igual que en `HomePage` (300ms).
- Al cambiar `query` o `sort`, se resetea `page` a 1.

**Botón de filtro:**
- SVG de sliders (3 líneas horizontales con círculos) inline, mismo patrón que los iconos existentes.
- Se ubica dentro del `.searchRow` existente, a la derecha del input de búsqueda.
- Cuando `sort !== null`: aplica clase `.filterBtnActive` (fondo `--color-accent-light`) para indicar filtro activo.

**Dropdown de sort:**
- Absolutamente posicionado debajo del botón, con `z-index` sobre el contenido.
- Tres opciones: "Sin ordenar" (limpia el sort), "↑ Menor a mayor" (`asc`), "↓ Mayor a menor" (`desc`).
- La opción activa lleva clase `.sortMenuItemActive` (color acento).
- Se cierra al seleccionar una opción o al hacer clic fuera (click-outside via `useRef` + `useEffect` sobre `document`).

**Controles de paginación:**
- Mismo HTML y CSS que `HomePage`: botones "Anterior" / "Siguiente" + `<span>` "Página X de Y".
- Se muestra solo si `pages > 1`.

### `MyBooksPage.module.css`

Clases nuevas a añadir (usando variables CSS existentes):

| Clase | Propósito |
|-------|-----------|
| `.filterBtn` | Botón de sliders (base: igual a `.iconBtnEdit`) |
| `.filterBtnActive` | Estado activo del botón (fondo `--color-accent-light`) |
| `.sortMenuWrapper` | Contenedor relativo que envuelve botón + dropdown |
| `.sortMenu` | Dropdown flotante (surface, border, radius-md, shadow) |
| `.sortMenuItem` | Ítem del dropdown |
| `.sortMenuItemActive` | Ítem seleccionado (color acento) |
| `.pagination` | Controles de paginación (flex, centrado) |
| `.pageInfo` | "Página X de Y" (text-sm, muted) |

---

## Extensibilidad

El estado `sort` puede crecer a un string más rico (`'score_asc'`, `'title_asc'`, etc.) cuando se agreguen más opciones. El dropdown solo necesita más ítems. El backend ya valida `sort_by` por nombre, por lo que agregar un nuevo campo de sort es añadir un `elif` en el router.

---

## Fuera de scope

- Paginación en `HomePage` (ya tiene paginación, no cambia)
- Sort por otros campos (título, año, fecha de agregado) — posible en el futuro
- Persistencia del sort en URL o localStorage
