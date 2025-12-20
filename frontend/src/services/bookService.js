const API_URL = 'http://127.0.0.1:8000';

export const getBooks = async () => {
  try {
    const response = await fetch(`${API_URL}/books/`);
    if (!response.ok) throw new Error('Error al conectar con el servidor');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createBook = async (bookData) => {
  try {
    const response = await fetch(`${API_URL}/books/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookData),
    });
    if (!response.ok) throw new Error('Error al guardar el libro');
    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};