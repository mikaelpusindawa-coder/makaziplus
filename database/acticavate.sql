USE makaziplus41;

-- Use id column (which is a KEY column) to satisfy safe mode
UPDATE properties SET status = 'active' WHERE id > 0;

-- Or disable safe mode temporarily for this session
SET SQL_SAFE_UPDATES = 0;
UPDATE properties SET status = 'active' WHERE status != 'active';
SET SQL_SAFE_UPDATES = 1;

-- Verify the update
SELECT id, title, status FROM properties;