-- Per-room occupancy + room-type vocabulary (spec `create-listing-room-details` R7/R9).
--
-- `occupied` is a per-room occupant count, maintained as a delta by bookings
-- (confirmed booking +1, approved leave -1) and correctable by the landlord from
-- the room edit page. Free slots = MAX(capacity - occupied, 0).
ALTER TABLE rooms ADD COLUMN occupied INTEGER NOT NULL DEFAULT 0;

-- Room types become private / shared / dorm; legacy 'single' maps to 'private'.
UPDATE rooms SET room_type = 'private' WHERE room_type = 'single';
