-- Migration: Create rooms for existing properties that don't have any
-- This fixes the "Property has no room data" issue

-- Create rooms for properties that don't have any rooms yet
-- Uses property_details.capacity and total_rooms if available, otherwise creates default single rooms

INSERT INTO rooms (
    property_id,
    landlord_id,
    title,
    price,
    status,
    room_number,
    room_type,
    capacity,
    created_at,
    updated_at
)
SELECT 
    p.id as property_id,
    p.landlord_id,
    CONCAT(
        CASE 
            WHEN pd.capacity = '1' THEN 'Single Room'
            WHEN pd.capacity = '2' THEN 'Shared Room (2 persons)'
            WHEN pd.capacity = '3' THEN 'Shared Room (3 persons)'
            WHEN pd.capacity = '4' THEN 'Shared Room (4 persons)'
            ELSE 'Single Room'
        END,
        ' - Room ', 
        room_numbers.room_num
    ) as title,
    p.price,
    'available' as status,
    CONCAT('Room ', room_numbers.room_num) as room_number,
    CASE 
        WHEN pd.capacity = '1' THEN 'single'
        WHEN pd.capacity IN ('2', '3', '4', '5+') THEN 'shared'
        ELSE 'single'
    END as room_type,
    CASE 
        WHEN pd.capacity = '2' THEN 2
        WHEN pd.capacity = '3' THEN 3
        WHEN pd.capacity = '4' THEN 4
        WHEN pd.capacity = '5+' THEN 5
        ELSE 1
    END as capacity,
    NOW() as created_at,
    NOW() as updated_at
FROM properties p
LEFT JOIN property_details pd ON p.id = pd.property_id
LEFT JOIN rooms r ON p.id = r.property_id AND (r.deleted_at IS NULL OR r.deleted_at = '')
CROSS JOIN (
    SELECT 1 as room_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL 
    SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL 
    SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) room_numbers
WHERE r.id IS NULL  -- Property has no rooms
  AND (p.deleted_at IS NULL OR p.deleted_at = '')
  AND room_numbers.room_num <= COALESCE(pd.total_rooms, 1)  -- Create up to total_rooms count
ORDER BY p.id, room_numbers.room_num;

-- Update properties that still don't have room data by creating at least one room
INSERT INTO rooms (
    property_id,
    landlord_id,
    title,
    price,
    status,
    room_number,
    room_type,
    capacity,
    created_at,
    updated_at
)
SELECT 
    p.id as property_id,
    p.landlord_id,
    'Single Room - Room 1' as title,
    p.price,
    'available' as status,
    'Room 1' as room_number,
    'single' as room_type,
    1 as capacity,
    NOW() as created_at,
    NOW() as updated_at
FROM properties p
LEFT JOIN rooms r ON p.id = r.property_id AND (r.deleted_at IS NULL OR r.deleted_at = '')
WHERE r.id IS NULL  -- Still no rooms after first insert
  AND (p.deleted_at IS NULL OR p.deleted_at = '');