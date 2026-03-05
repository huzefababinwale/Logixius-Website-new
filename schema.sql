CREATE DATABASE IF NOT EXISTS logixius_db;
USE logixius_db;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    intern_id VARCHAR(50) NOT NULL UNIQUE,
    student_name VARCHAR(100) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    duration VARCHAR(50), -- e.g., "3 Months"
    issue_date DATE DEFAULT (CURRENT_DATE),
    qr_code_path TEXT,
    certificate_file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    mobile_no VARCHAR(15) NOT NULL UNIQUE,
    gender VARCHAR(10),
    college_name VARCHAR(150),
    degree VARCHAR(100),
    department VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Internship Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    domain VARCHAR(100) NOT NULL,
    status ENUM('PENDING', 'ONGOING', 'COMPLETED', 'REJECTED') DEFAULT 'PENDING',
    intern_id VARCHAR(50), -- Generated upon approval (Offer Letter stage)
    offer_letter_path VARCHAR(255), -- Path to Offer Letter PDF
    certificate_path VARCHAR(255), -- Path to Completion Certificate PDF
    start_date DATE, -- Set when status becomes ONGOING
    completion_date DATE, -- Set when status becomes COMPLETED
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Insert default admin (Password: admin123)
-- Hash generated using bcrypt for 'admin123'
INSERT IGNORE INTO admins (username, password_hash) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere');
