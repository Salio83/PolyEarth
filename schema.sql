-- Schéma de la base de données PolyEarth

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    school VARCHAR(255),
    status VARCHAR(255),
    history TEXT,
    rating FLOAT DEFAULT 2.5,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    available BOOLEAN DEFAULT TRUE,
    owner_id INTEGER REFERENCES users(id),
    photo_url TEXT,
    category VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    borrower_id INTEGER REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    true_end_date DATE,
    status VARCHAR(255) DEFAULT 'pending'
);
