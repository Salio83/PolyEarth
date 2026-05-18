-- Schéma de la base de données PolyEarth

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    school VARCHAR(255) DEFAULT 'Polytech Montpellier',
    status VARCHAR(255),
    rating DECIMAL(2,1) DEFAULT 3.0,
    transaction_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    category VARCHAR(255) DEFAULT 'Autre',
    quality VARCHAR(50) DEFAULT 'good',
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'available', -- disponible, réservé, prêté
    type VARCHAR(20) DEFAULT 'offer', -- offre ou demande
    available_from DATE,
    available_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    borrower_id INTEGER REFERENCES users(id),
    owner_id INTEGER REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    true_end_date DATE,
    status VARCHAR(255) DEFAULT 'pending', -- pending, accepted, rejected, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    reviewer_id INTEGER REFERENCES users(id),
    reviewee_id INTEGER REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
