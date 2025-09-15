-- Tạo admin user
INSERT INTO users (
    email,
    username,
    password,
    role,
    first_name,
    last_name,
    is_active,
    is_email_verified
) VALUES (
    'admin@example.com',
    'admin',
    -- Password: admin123 (đã hash với bcrypt)
    '$2b$10$YKpVMJbgFqT3dTBlMZ9mLOzLdxKVjWdqRoJQ4PqvQ3R8hGTKFLKaS',
    'admin',
    'Admin',
    'User',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Hiển thị user vừa tạo
SELECT id, email, username, role FROM users WHERE email = 'admin@example.com';
