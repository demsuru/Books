# Rating System: 1–5 Float Scale

**Date:** 2026-05-03

## Summary

Change the book rating system from an integer 0–10 dropdown to a float 1–5 text input. Existing scores are reset to null via a migration. One decimal place is accepted (e.g., 4.7).

## Backend Changes

### `src/books/schema.py` — `RatingCreate`

- Change `score` field validation: `ge=1.0, le=5.0` (was `ge=0.0, le=10.0`)
- Update description string accordingly

### Alembic migration

- Generate a new migration that sets `score = NULL` for all rows in `user_book_association`
- This handles existing out-of-range data (option C chosen by user)

## Frontend Changes

### `frontend/src/components/RatingSlider.jsx`

- Replace `<select>` (0–10 integers) with `<input type="number" min="1" max="5" step="0.1">`
- Initial state: `""` (empty string, not a number) so the field starts blank
- On save: parse to float, round to 1 decimal, validate range 1–5 before calling the API; show inline error toast if out of range or not a valid number

### `frontend/src/pages/MyBooksPage.jsx`

- Update display text from `${book.score}/10` → `${book.score}/5`

## Data Migration

- Alembic migration: `UPDATE user_book_association SET score = NULL`
- No data is preserved; users re-rate their books under the new scale

## Validation Rules

| Layer    | Rule                                      |
|----------|-------------------------------------------|
| Backend  | `ge=1.0, le=5.0` (Pydantic Field)         |
| Frontend | Parse float, round to 1 decimal, 1–5 range check before submit |

## Out of Scope

- Displaying half-star or visual star ratings
- Aggregated/average score per book
- Migration that scales old scores (user explicitly chose reset)
