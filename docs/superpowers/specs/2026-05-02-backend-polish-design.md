# Backend Polish — Design Spec
**Fecha:** 2026-05-02
**Proyecto:** BookSocial API
**Alcance:** Solo backend (`src/`)

---

## Objetivo

Terminar y pulir el backend de BookSocial aplicando buenas prácticas de FastAPI: estructura de módulos limpia, seguridad correcta, roles, soft delete, paginación con filtros, health check y logging estándar.

---

## Estructura del proyecto

Se crea `src/core/` con responsabilidades transversales:

```
src/
  core/
    config.py        # Pydantic BaseSettings — valida SECRET, DATABASE_URL, MONGO_URL al arrancar
    dependencies.py  # require_admin(), PaginationParams, get_book_or_404()
    exceptions.py    # handlers globales → respuestas JSON consistentes
    logging.py       # logger estándar Python, nivel configurable por env
  books/
    models.py        # + is_deleted: bool = False, deleted_at: DateTime nullable
    router.py        # refactorizado con ownership, soft delete, paginación, filtros
    schema.py        # + BookListResponse (items, total, page, pages)
  users/
    manager.py       # sin cambios funcionales
    models.py        # sin cambios
    schema.py        # sin cambios
  db.py              # sin cambios
  main.py            # monta routers, middleware, lifespan limpio, /health
```

---

## Seguridad

### 1. Validación de entorno al inicio
`core/config.py` usa `Pydantic BaseSettings`. Si `SECRET`, `DATABASE_URL` o `MONGO_URL` no están definidas, la app falla con error claro en startup, no en runtime.

```python
class Settings(BaseSettings):
    secret: str
    database_url: str
    mongo_url: str
    model_config = SettingsConfig(env_file=".env")

settings = Settings()
```

### 2. Control de acceso por roles y ownership

| Acción | `lector` | `admin` |
|--------|----------|---------|
| Crear libro | ✅ | ✅ |
| Editar libro propio | ✅ | ✅ |
| Editar libro ajeno | ❌ 403 | ✅ |
| Soft-delete libro propio | ✅ | ✅ |
| Soft-delete libro ajeno | ❌ 403 | ✅ |
| Ver catálogo | ✅ (público) | ✅ |
| Calificar libro | ✅ | ✅ |

Lógica de chequeo centralizada en el router:
```python
if current_user.role != "admin" and book.creator_id != current_user.id:
    raise HTTPException(status_code=403, detail="Sin permisos sobre este libro")
```

La dependencia `require_admin()` en `core/dependencies.py` protege cualquier endpoint exclusivo de admin.

### 3. Cierre del cliente MongoDB
El cliente Mongo se mueve al `lifespan` de la app para garantizar cierre limpio:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield
    mongo_client.close()
```

### 4. Eliminación de `print()` en producción
Todos los `print()` se reemplazan con el logger configurado en `core/logging.py`. El middleware HTTP usa `logger.info()`. Los eventos de auth usan `logger.warning()` / `logger.info()`.

---

## Funcionalidades nuevas

### Soft delete en `Books`

Nuevos campos en el modelo:
```python
is_deleted = Column(Boolean, default=False, nullable=False)
deleted_at = Column(DateTime(timezone=True), nullable=True)
```

Nuevo endpoint:
```
DELETE /books/{book_id}   → 204 No Content
```
- Marca `is_deleted=True` y `deleted_at=now()`
- Solo el creador o un admin puede ejecutarlo
- Las entradas en `user_book_association` se conservan (no se tocan)
- Todos los `GET` filtran automáticamente `Books.is_deleted == False`

### Paginación y filtros

```
GET /books/?page=1&limit=20&search=dune&author=herbert
```

- `page`: número de página (default 1)
- `limit`: resultados por página, máximo 20 forzado en backend con `Query(20, le=20)`
- `search`: filtro case-insensitive sobre `title` (`func.lower(title).contains(search.lower())`) — compatible con SQLite y PostgreSQL
- `author`: filtro case-insensitive sobre `author` (mismo patrón)

Respuesta tipada con `BookListResponse`:
```json
{
  "items": [...],
  "total": 84,
  "page": 1,
  "pages": 5
}
```

### Health check

```
GET /health
```

Verifica conectividad de ambas bases de datos:
```json
{"status": "ok", "db": "ok", "mongo": "ok"}
```
Si alguna falla, devuelve `503` con el campo correspondiente en `"error"`.

---

## Buenas prácticas FastAPI

### HTTP status codes correctos
| Endpoint | Código actual | Código correcto |
|----------|--------------|-----------------|
| `POST /books/` | 200 | **201 Created** |
| `DELETE /books/{id}` | (no existe) | **204 No Content** |
| `POST /books/{id}/rate` (nuevo) | 200 | **201** si crea, **200** si actualiza |

### `response_model` en todos los endpoints
`rate_book` y `remove_book_association` actualmente no tienen `response_model`. Se agregan en todos los endpoints para documentación precisa en `/docs` y para evitar exponer campos internos. `rate_book` usa un schema `RatingResponse(message: str, status: str)`.

### `GET /books/mybooks` sin paginar
Devuelve la lista completa de libros del usuario autenticado. Al ser una lista personal acotada no requiere paginación.

### Dependencias reutilizables (`core/dependencies.py`)
Elimina código duplicado presente hoy en 3+ endpoints:

```python
async def get_book_or_404(book_id: str, session: AsyncSession = Depends(get_async_session)) -> Books:
    # parsea UUID, busca en DB, lanza 404 si no existe o is_deleted=True

class PaginationParams:
    def __init__(self, page: int = 1, limit: int = Query(20, le=20)):
        self.page = page
        self.limit = limit
        self.offset = (page - 1) * limit

async def require_admin(user: User = Depends(current_active_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403)
    return user
```

### Handlers globales (`core/exceptions.py`)
Respuestas de error JSON consistentes en toda la API, incluyendo errores no manejados (500):
```json
{"detail": "Libro no encontrado", "status_code": 404}
```

### Migraciones con Alembic
Alembic ya está en `requirements.txt` pero no está inicializado. Se crea la migración inicial que agrega `is_deleted` y `deleted_at` a la tabla `books`. La migración es compatible con la base de datos existente (valores default no rompen registros actuales).

---

## Lo que NO entra en este spec

- Cambios al frontend
- Autenticación OAuth / social login
- Sistema de comentarios
- Subida de imágenes / covers
- Rate limiting / throttling (queda pendiente para un spec futuro)

---

## Resumen de archivos afectados

| Archivo | Acción |
|---------|--------|
| `src/core/config.py` | Nuevo |
| `src/core/dependencies.py` | Nuevo |
| `src/core/exceptions.py` | Nuevo |
| `src/core/logging.py` | Nuevo |
| `src/main.py` | Modificar (lifespan, mongo close, health, logging) |
| `src/books/models.py` | Modificar (is_deleted, deleted_at) |
| `src/books/router.py` | Modificar (ownership, soft delete, paginación, status codes) |
| `src/books/schema.py` | Modificar (BookListResponse) |
| `src/db.py` | Sin cambios |
| `src/users/` | Sin cambios funcionales |
| `alembic/` | Nuevo (init + migración) |
