-- Isolated demo seed for Haven Space full-app video walkthrough.
-- Password for all demo accounts: Landlord123!

-- 1. Admin account
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status)
SELECT 'Elena', 'Ramos', 'admin@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'admin', 1, 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@haven.demo');

-- 2. Ensure demo landlords from 0015 are marked verification_status = 'approved'
UPDATE landlord_profiles
SET verification_status = 'approved',
    business_bio = COALESCE(business_bio, 'Verified boarding house operator in Metro Manila.'),
    contact_number = COALESCE(contact_number, '09171234567')
WHERE user_id IN (SELECT id FROM users WHERE email IN ('lina.santos@haven.demo', 'ramon.delacruz@haven.demo', 'maria.reyes@haven.demo'));

-- 3. Pending landlord for Admin verification showcase
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status)
SELECT 'Marco', 'Villanueva', 'pending.owner@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'landlord', 0, 1, 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'pending.owner@haven.demo');

INSERT INTO landlord_profiles (user_id, boarding_house_name, boarding_house_description, property_type, total_rooms, available_rooms, city, province, contact_number, verification_status)
SELECT u.id, 'Vista Residences', 'Quiet student residence near Morayta with 24/7 CCTV and study lounge.', 'Dormitory', 4, 4, 'Sampaloc', 'Manila', '09185550192', 'submitted'
FROM users u WHERE u.email = 'pending.owner@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM landlord_profiles WHERE user_id = u.id);

INSERT INTO landlord_verification_documents (user_id, document_type, file_url, file_name, file_size, file_type)
SELECT u.id, 'government_id', 'https://placehold.co/800x500/f6f2e9/1f1f1f?text=Government+ID', 'gov-id-marco.png', 142000, 'image/png'
FROM users u WHERE u.email = 'pending.owner@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM landlord_verification_documents WHERE user_id = u.id AND document_type = 'government_id');

INSERT INTO landlord_verification_documents (user_id, document_type, file_url, file_name, file_size, file_type)
SELECT u.id, 'property_proof', 'https://placehold.co/800x500/f6f2e9/1f1f1f?text=Property+Title', 'title-deed-vista.png', 198000, 'image/png'
FROM users u WHERE u.email = 'pending.owner@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM landlord_verification_documents WHERE user_id = u.id AND document_type = 'property_proof');

-- 4. Pre-tenancy boarder (fresh applicant)
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status, boarder_status)
SELECT 'Sofia', 'Navarro', 'new.boarder@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'boarder', 1, 1, 'active', NULL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'new.boarder@haven.demo');

INSERT INTO boarder_profiles (user_id, bio, occupation, onboarding_completed_at, emergency_contact_name, emergency_contact_phone)
SELECT u.id, 'Incoming BS Accountancy student looking for a clean, quiet room.', 'Student', datetime('now'), 'Carmen Navarro', '09178881100'
FROM users u WHERE u.email = 'new.boarder@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM boarder_profiles WHERE user_id = u.id);

-- 5. Confirmed boarder (active tenancy)
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status, boarder_status)
SELECT 'Daniel', 'Reyes', 'confirmed.boarder@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'boarder', 1, 1, 'active', 'confirmed'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'confirmed.boarder@haven.demo');

INSERT INTO boarder_profiles (user_id, bio, occupation, onboarding_completed_at, emergency_contact_name, emergency_contact_phone)
SELECT u.id, '3rd-year Engineering student at UST.', 'Student', datetime('now', '-32 days'), 'Rosa Reyes', '09179992200'
FROM users u WHERE u.email = 'confirmed.boarder@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM boarder_profiles WHERE user_id = u.id);

-- 6. Pending applicant for landlord review
INSERT INTO users (first_name, last_name, email, password_hash, role, is_verified, email_verified, account_status, boarder_status)
SELECT 'Carlos', 'Mendoza', 'carlos.mendoza@haven.demo', '$2b$10$3IZeQRJpGti/mN963p2Aku3Cllxf7OUDwtvOFfykcpu6E0VcJkugi', 'boarder', 1, 1, 'active', 'pending'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'carlos.mendoza@haven.demo');

-- 7. Confirmed tenancy application for confirmed.boarder@haven.demo on Sunrise Boarding House
INSERT INTO applications (boarder_id, landlord_id, room_id, message, status, payment_method, confirmed_at, next_due_date, advance_amount)
SELECT
  b.id,
  l.id,
  r.id,
  'Hi Ms. Lina! I am a 3rd-year Engineering student at UST looking for a quiet room for the semester.',
  'confirmed',
  'gcash',
  datetime('now', '-32 days'),
  date('now', '+5 days'),
  3500
FROM users b, users l, properties p, rooms r
WHERE b.email = 'confirmed.boarder@haven.demo'
  AND l.email = 'lina.santos@haven.demo'
  AND p.landlord_id = l.id AND p.title = 'Sunrise Boarding House'
  AND r.property_id = p.id
  AND NOT EXISTS (SELECT 1 FROM applications WHERE boarder_id = b.id AND status = 'confirmed')
LIMIT 1;

-- Mark room occupied = 1 for confirmed tenancy
UPDATE rooms
SET occupied = 1
WHERE id IN (
  SELECT a.room_id FROM applications a
  JOIN users b ON b.id = a.boarder_id
  WHERE b.email = 'confirmed.boarder@haven.demo' AND a.status = 'confirmed'
);

-- Pending application from Carlos Mendoza on Sunrise Boarding House
INSERT INTO applications (boarder_id, landlord_id, room_id, message, status)
SELECT
  b.id,
  l.id,
  r.id,
  'Hello! Looking to move in next week. Clean, quiet, non-smoker.',
  'pending'
FROM users b, users l, properties p, rooms r
WHERE b.email = 'carlos.mendoza@haven.demo'
  AND l.email = 'lina.santos@haven.demo'
  AND p.landlord_id = l.id AND p.title = 'Sunrise Boarding House'
  AND r.property_id = p.id
  AND NOT EXISTS (SELECT 1 FROM applications WHERE boarder_id = b.id)
LIMIT 1;

-- 8. Payments for confirmed.boarder@haven.demo
INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, application_id, charge_type, description, amount, due_date, paid_date, status, payment_method, reference_number)
SELECT
  a.boarder_id, a.landlord_id, a.room_id, r.property_id, a.id,
  'rent', 'Monthly Rent - Previous Month', 3500, date('now', '-25 days'), date('now', '-26 days'), 'paid', 'gcash', 'GC-98214401'
FROM applications a
JOIN users b ON b.id = a.boarder_id
JOIN rooms r ON r.id = a.room_id
WHERE b.email = 'confirmed.boarder@haven.demo' AND a.status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM payments WHERE boarder_id = a.boarder_id AND status = 'paid');

INSERT INTO payments (boarder_id, landlord_id, room_id, property_id, application_id, charge_type, description, amount, due_date, status)
SELECT
  a.boarder_id, a.landlord_id, a.room_id, r.property_id, a.id,
  'rent', 'Monthly Rent - Upcoming Cycle', 3500, date('now', '+5 days'), 'pending'
FROM applications a
JOIN users b ON b.id = a.boarder_id
JOIN rooms r ON r.id = a.room_id
WHERE b.email = 'confirmed.boarder@haven.demo' AND a.status = 'confirmed'
  AND NOT EXISTS (SELECT 1 FROM payments WHERE boarder_id = a.boarder_id AND status = 'pending');

-- 9. Message thread between Lina Santos and Daniel Reyes
INSERT INTO message_threads (landlord_id, boarder_id, property_id, created_by, last_message_at)
SELECT l.id, b.id, p.id, b.id, datetime('now', '-1 hour')
FROM users l, users b, properties p
WHERE l.email = 'lina.santos@haven.demo'
  AND b.email = 'confirmed.boarder@haven.demo'
  AND p.landlord_id = l.id AND p.title = 'Sunrise Boarding House'
  AND NOT EXISTS (SELECT 1 FROM message_threads WHERE landlord_id = l.id AND boarder_id = b.id);

INSERT INTO thread_messages (thread_id, sender_id, body, property_id, created_at)
SELECT mt.id, b.id, 'Good morning Ms. Lina! Just confirming that the WiFi router on the 2nd floor is working great now. Thank you!', mt.property_id, datetime('now', '-2 hours')
FROM message_threads mt
JOIN users b ON b.id = mt.boarder_id
WHERE b.email = 'confirmed.boarder@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM thread_messages WHERE thread_id = mt.id);

INSERT INTO thread_messages (thread_id, sender_id, body, property_id, created_at)
SELECT mt.id, l.id, 'Glad to hear that, Daniel! Let me know anytime if you need anything for your room.', mt.property_id, datetime('now', '-1 hour')
FROM message_threads mt
JOIN users l ON l.id = mt.landlord_id
JOIN users b ON b.id = mt.boarder_id
WHERE b.email = 'confirmed.boarder@haven.demo'
  AND (SELECT COUNT(*) FROM thread_messages WHERE thread_id = mt.id) = 1;

-- 10. Announcements from Lina Santos for Sunrise Boarding House
INSERT INTO announcements (landlord_id, title, description, category, priority, publish_date)
SELECT l.id, 'Scheduled Water Tank Cleaning', 'Please store water for Saturday 8:00 AM to 11:00 AM while we clean and sanitize the main overhead tank.', 'maintenance', 'high', date('now', '-1 day')
FROM users l
WHERE l.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Scheduled Water Tank Cleaning');

INSERT INTO announcement_properties (announcement_id, property_id)
SELECT a.id, p.id
FROM announcements a, properties p, users l
WHERE a.title = 'Scheduled Water Tank Cleaning'
  AND l.email = 'lina.santos@haven.demo'
  AND p.landlord_id = l.id AND p.title = 'Sunrise Boarding House'
  AND NOT EXISTS (SELECT 1 FROM announcement_properties WHERE announcement_id = a.id AND property_id = p.id);

INSERT INTO announcements (landlord_id, title, description, category, priority, publish_date)
SELECT l.id, 'Curfew & Quiet Hours Reminder', 'Friendly reminder that quiet hours begin at 10:00 PM nightly to support everyone preparing for midterms.', 'policy', 'medium', date('now', '-3 days')
FROM users l
WHERE l.email = 'lina.santos@haven.demo'
  AND NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Curfew & Quiet Hours Reminder');

INSERT INTO announcement_properties (announcement_id, property_id)
SELECT a.id, p.id
FROM announcements a, properties p, users l
WHERE a.title = 'Curfew & Quiet Hours Reminder'
  AND l.email = 'lina.santos@haven.demo'
  AND p.landlord_id = l.id AND p.title = 'Sunrise Boarding House'
  AND NOT EXISTS (SELECT 1 FROM announcement_properties WHERE announcement_id = a.id AND property_id = p.id);
