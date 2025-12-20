// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { getBooks } from '../services/bookService' 
import BookItem from '../components/BookItem'

function HomePage() {
  const [books, setBooks] = useState([])

  useEffect(() => {
    cargarLibros();
  }, [])

  const cargarLibros = async () => {
    const data = await getBooks();
    setBooks(data);
  }

  return (
    <div>
      <h1>📚 Biblioteca Principal</h1>
      
      {books.length === 0 ? (
        <p>Cargando libros...</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {books.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HomePage