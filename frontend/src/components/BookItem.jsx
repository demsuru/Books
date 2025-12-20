function BookItem({ book }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '5px', marginBottom: '10px' }}>
      <h2>{book.title}</h2>
      <p>✍️ {book.author}</p>
      <p>📅 {book.year}</p>
    </div>
  );
}

export default BookItem;