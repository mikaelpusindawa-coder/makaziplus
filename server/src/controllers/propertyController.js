// server/src/controllers/propertyController.js
// ─────────────────────────────────────────────────────────────────────────────

const db   = require('../config/db');
const path = require('path');
const fs   = require('fs');

const ALLOWED_TYPES        = new Set(['nyumba', 'chumba', 'frem', 'ofisi']);
const ALLOWED_PRICE_TYPES  = new Set(['rent', 'sale']);
const ALLOWED_STATUSES     = new Set(['active', 'inactive', 'pending', 'rejected', 'suspended']);
const ALLOWED_UPDATE_FIELDS = new Set([
  'title', 'description', 'type', 'price', 'price_type',
  'city', 'area', 'address', 'bedrooms', 'bathrooms', 'size_sqm', 'status', 'property_status'
]);

// ─── Helper: delete image file from disk safely ───────────────────────────────
const deleteImageFile = (imageUrl) => {
  if (!imageUrl || !imageUrl.startsWith('/uploads')) return;
  try {
    const filePath = path.join(__dirname, '../../', imageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.warn('[propertyController] Could not delete image file:', e.message);
  }
};

// ─── Shared filter builder used by getProperties + getPropertiesWithSort ─────
function buildPropertyFilters(query) {
  const { type, city, price_min, price_max, price_type, search, premium, min_beds, amenities } = query;
  const where = ['p.status = ?'];
  const vals  = ['active'];
  let amenityJoin = '';

  if (type && ALLOWED_TYPES.has(type))                                { where.push('p.type = ?');        vals.push(type); }
  if (type === 'sale')                                                 { where.push("p.price_type = 'sale'"); }
  if (city && typeof city === 'string' && city.trim().length <= 100)  { where.push('p.city LIKE ?');     vals.push(`%${city.trim()}%`); }
  if (price_min && !isNaN(price_min))                                 { where.push('p.price >= ?');      vals.push(parseFloat(price_min)); }
  if (price_max && !isNaN(price_max))                                 { where.push('p.price <= ?');      vals.push(parseFloat(price_max)); }
  if (price_type && ALLOWED_PRICE_TYPES.has(price_type))              { where.push('p.price_type = ?'); vals.push(price_type); }
  if (premium === '1' || premium === 'true')                          { where.push('p.is_premium = ?'); vals.push(1); }
  if (min_beds && !isNaN(min_beds) && parseInt(min_beds) > 0)        { where.push('p.bedrooms >= ?');   vals.push(parseInt(min_beds)); }
  if (search && typeof search === 'string' && search.trim().length <= 100) {
    where.push('(p.title LIKE ? OR p.area LIKE ? OR p.city LIKE ? OR p.description LIKE ?)');
    const s = `%${search.trim()}%`;
    vals.push(s, s, s, s);
  }
  if (amenities) {
    const list = (Array.isArray(amenities) ? amenities : [amenities])
      .map(a => String(a).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
    if (list.length) {
      amenityJoin = 'JOIN property_amenities pa ON pa.property_id = p.id';
      where.push(`LOWER(pa.amenity) IN (${list.map(() => '?').join(',')})`);
      vals.push(...list);
    }
  }

  return { where: `WHERE ${where.join(' AND ')}`, vals, amenityJoin };
}

// ─── GET /properties ──────────────────────────────────────────────────────────
exports.getProperties = async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page  = Math.max(1, parseInt(page)  || 1);
    limit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (page - 1) * limit;

    const { where: wc, vals, amenityJoin } = buildPropertyFilters(req.query);

    // ── FIXED primary_image subquery ──────────────────────────────────────────
    // Old code: single subquery that returned NULL if no is_primary=1 row existed.
    // Fix: COALESCE — tries is_primary=1 first, falls back to any first image.
    // This means every property that has at least one image will show it correctly.
    const [rows] = await db.execute(
      `SELECT DISTINCT p.*, u.name AS owner_name, u.verified AS owner_verified,
              COALESCE(
                (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 ORDER BY sort_order LIMIT 1),
                (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY sort_order LIMIT 1)
              ) AS primary_image
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       ${amenityJoin}
       ${wc}
       ORDER BY p.is_premium DESC, p.created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      vals
    );

    for (let i = 0; i < rows.length; i++) {
      const [images] = await db.execute(
        'SELECT id, image_url, is_primary, sort_order FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, sort_order ASC',
        [rows[i].id]
      );
      rows[i].images = images;
      if (!rows[i].primary_image && images.length > 0) {
        const primary = images.find(img => img.is_primary === 1) || images[0];
        rows[i].primary_image = primary.image_url;
      }
      const [amenRows] = await db.execute('SELECT amenity FROM property_amenities WHERE property_id = ?', [rows[i].id]);
      rows[i].amenities = amenRows.map(a => a.amenity);
    }

    const [[cnt]] = await db.execute(`SELECT COUNT(DISTINCT p.id) AS t FROM properties p ${amenityJoin} ${wc}`, vals);
    res.json({ success: true, data: rows, total: cnt.t, page, limit });

  } catch (e) {
    console.error('getProperties error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── GET /properties/:id ──────────────────────────────────────────────────────
exports.getProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'ID si sahihi' });

    await db.execute('UPDATE properties SET views = views + 1 WHERE id = ?', [id]);

    const [rows] = await db.execute(
      `SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email,
              u.avatar AS owner_avatar, u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mali haipatikani' });

    const property = rows[0];

    const [images] = await db.execute(
      'SELECT id, image_url, is_primary, sort_order FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, sort_order ASC',
      [id]
    );
    property.images = images;
    if (images.length > 0) {
      const primary = images.find(img => img.is_primary === 1) || images[0];
      property.primary_image = primary.image_url;
    }

    const [amenities] = await db.execute(
      'SELECT amenity FROM property_amenities WHERE property_id = ?', [id]
    );
    property.amenities = amenities.map(a => a.amenity);

    const [reviews] = await db.execute(
      `SELECT r.*, u.name AS reviewer_name, u.avatar AS reviewer_avatar
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.property_id = ? ORDER BY r.created_at DESC`,
      [id]
    );
    property.reviews = reviews;

    // Attach video if exists
    const [videos] = await db.execute(
      'SELECT video_url FROM property_videos WHERE property_id = ? LIMIT 1', [id]
    );
    property.video_url = videos.length ? videos[0].video_url : null;

    res.json({ success: true, data: property });
  } catch (e) {
    console.error('getProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── POST /properties ─────────────────────────────────────────────────────────
exports.createProperty = async (req, res) => {
  try {
    const { title, description, type, price, price_type, city, area, address, bedrooms, bathrooms, size_sqm, amenities } = req.body;

    if (!title || !description || !type || !price || !city || !area) {
      return res.status(400).json({ success: false, message: 'Jaza sehemu zote muhimu' });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return res.status(400).json({ success: false, message: 'Aina si sahihi' });
    }
    const safePrice = parseFloat(price);
    if (isNaN(safePrice) || safePrice <= 0) {
      return res.status(400).json({ success: false, message: 'Bei si sahihi' });
    }

    const safePriceType     = ALLOWED_PRICE_TYPES.has(price_type) ? price_type : 'rent';
    const latitude          = req.body.latitude          || null;
    const longitude         = req.body.longitude         || null;
    const placeId           = req.body.place_id          || null;
    const formattedAddress  = req.body.formatted_address || address || null;

    const [r] = await db.execute(
      `INSERT INTO properties
         (owner_id, title, description, type, price, price_type, city, area, address,
          bedrooms, bathrooms, size_sqm, status, latitude, longitude, place_id, formatted_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [
        req.user.id,
        String(title).trim().substring(0, 200),
        String(description).trim().substring(0, 5000),
        type,
        safePrice,
        safePriceType,
        String(city).trim().substring(0, 100),
        String(area).trim().substring(0, 100),
        formattedAddress ? String(formattedAddress).trim().substring(0, 500) : null,
        parseInt(bedrooms) || 0,
        parseInt(bathrooms) || 0,
        parseInt(size_sqm) || 0,
        latitude,
        longitude,
        placeId,
        formattedAddress,
      ]
    );
    const pid = r.insertId;

    // Insert images — first image is always primary
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        await db.execute(
          'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [pid, `/uploads/properties/${req.files[i].filename}`, i === 0 ? 1 : 0, i]
        );
      }
    }

    if (amenities) {
      const list = Array.isArray(amenities) ? amenities : JSON.parse(amenities);
      for (const a of list.slice(0, 20)) {
        await db.execute(
          'INSERT INTO property_amenities (property_id, amenity) VALUES (?, ?)',
          [pid, String(a).trim().substring(0, 100)]
        );
      }
    }

    const [newProp] = await db.execute('SELECT * FROM properties WHERE id = ?', [pid]);
    res.status(201).json({ success: true, data: newProp[0] });

  } catch (e) {
    console.error('createProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── PATCH /properties/:id ────────────────────────────────────────────────────
exports.updateProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'ID si sahihi' });

    const [rows] = await db.execute('SELECT * FROM properties WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    const sets = [];
    const vals = [];

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        if (field === 'type'         && !ALLOWED_TYPES.has(req.body[field]))       continue;
        if (field === 'price_type'   && !ALLOWED_PRICE_TYPES.has(req.body[field])) continue;
        if (field === 'status'       && !ALLOWED_STATUSES.has(req.body[field]))    continue;
        if (field === 'price'        && isNaN(parseFloat(req.body[field])))        continue;
        sets.push(`${field} = ?`);
        vals.push(req.body[field]);
      }
    }
    if (req.body.latitude           !== undefined) { sets.push('latitude = ?');           vals.push(req.body.latitude           || null); }
    if (req.body.longitude          !== undefined) { sets.push('longitude = ?');          vals.push(req.body.longitude          || null); }
    if (req.body.place_id           !== undefined) { sets.push('place_id = ?');           vals.push(req.body.place_id           || null); }
    if (req.body.formatted_address  !== undefined) { sets.push('formatted_address = ?');  vals.push(req.body.formatted_address  || null); }

    if (!sets.length && !(req.files && req.files.length)) {
      return res.status(400).json({ success: false, message: 'Hakuna mabadiliko' });
    }

    if (sets.length) {
      vals.push(id);
      await db.execute(`UPDATE properties SET ${sets.join(', ')} WHERE id = ?`, vals);
    }

    // ── FIXED: DELETE old images before inserting new ones ────────────────────
    // Old code inserted new images on top of old ones, causing:
    //   1. Multiple is_primary=1 rows per property
    //   2. Old wrong image still shown after agent edits
    if (req.files && req.files.length > 0) {

      // 1. Fetch existing image URLs to delete from disk
      const [oldImages] = await db.execute(
        'SELECT image_url FROM property_images WHERE property_id = ?', [id]
      );

      // 2. Delete all old DB rows for this property
      await db.execute('DELETE FROM property_images WHERE property_id = ?', [id]);

      // 3. Delete old physical files from disk
      for (const row of oldImages) {
        deleteImageFile(row.image_url);
      }

      // 4. Insert new images — first image is always primary
      for (let i = 0; i < req.files.length; i++) {
        await db.execute(
          'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [id, `/uploads/properties/${req.files[i].filename}`, i === 0 ? 1 : 0, i]
        );
      }
    }

    const [updated] = await db.execute('SELECT * FROM properties WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0] });

  } catch (e) {
    console.error('updateProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── DELETE /properties/:id ───────────────────────────────────────────────────
exports.deleteProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'ID si sahihi' });

    const [rows] = await db.execute('SELECT * FROM properties WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    // Delete all associated image files from disk before removing DB rows
    const [images] = await db.execute('SELECT image_url FROM property_images WHERE property_id = ?', [id]);
    for (const img of images) deleteImageFile(img.image_url);

    // Cascade delete handled by FK, but explicit for safety
    await db.execute('DELETE FROM property_images   WHERE property_id = ?', [id]);
    await db.execute('DELETE FROM property_amenities WHERE property_id = ?', [id]);
    await db.execute('DELETE FROM property_videos    WHERE property_id = ?', [id]);
    await db.execute('DELETE FROM properties WHERE id = ?', [id]);

    res.json({ success: true, message: 'Mali imefutwa' });
  } catch (e) {
    console.error('deleteProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── GET /properties/sort (with sort_by param) ────────────────────────────────
exports.getPropertiesWithSort = async (req, res) => {
  try {
    const { sort_by = 'newest', page = 1, limit = 20 } = req.query;
    const safePage  = Math.max(1, parseInt(page)  || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset    = (safePage - 1) * safeLimit;

    const { where: wc, vals, amenityJoin } = buildPropertyFilters(req.query);

    let orderBy = 'ORDER BY p.created_at DESC';
    if (sort_by === 'price_low')  orderBy = 'ORDER BY p.price ASC';
    if (sort_by === 'price_high') orderBy = 'ORDER BY p.price DESC';
    if (sort_by === 'popular')    orderBy = 'ORDER BY p.views DESC';
    if (sort_by === 'premium')    orderBy = 'ORDER BY p.is_premium DESC, p.created_at DESC';

    const query = `
      SELECT DISTINCT p.*, u.name AS owner_name, u.phone AS owner_phone, u.avatar AS owner_avatar,
             u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified,
             COALESCE(
               (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 ORDER BY sort_order LIMIT 1),
               (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY sort_order LIMIT 1)
             ) AS primary_image
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      ${amenityJoin}
      ${wc}
      ${orderBy}
      LIMIT ${parseInt(safeLimit)} OFFSET ${parseInt(offset)}
    `;

    const [rows] = await db.execute(query, vals);
    const [[cnt]] = await db.execute(`SELECT COUNT(DISTINCT p.id) AS t FROM properties p ${amenityJoin} ${wc}`, vals);

    res.json({ success: true, data: rows, total: cnt.t, page: safePage, limit: safeLimit });

  } catch (e) {
    console.error('getPropertiesWithSort error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── GET /properties/recent ───────────────────────────────────────────────────
exports.getRecentProperties = async (req, res) => {
  try {
    const limit = Math.min(10, parseInt(req.query.limit) || 4);

    // ── FIXED primary_image subquery ──────────────────────────────────────────
    const [properties] = await db.execute(
      `SELECT p.*, u.name AS owner_name, u.verified AS owner_verified,
              COALESCE(
                (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 ORDER BY sort_order LIMIT 1),
                (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY sort_order LIMIT 1)
              ) AS primary_image
       FROM properties p
       JOIN users u ON u.id = p.owner_id
       WHERE p.status = 'active'
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ success: true, data: properties });
  } catch (e) {
    console.error('getRecentProperties error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── PATCH /properties/:id/availability ───────────────────────────────────────
exports.updatePropertyAvailability = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { property_status } = req.body;
    const allowed = ['available', 'sold', 'rented', 'pending'];

    if (!id || isNaN(id))           return res.status(400).json({ success: false, message: 'ID si sahihi' });
    if (!allowed.includes(property_status)) return res.status(400).json({ success: false, message: 'Hali si sahihi' });

    const [rows] = await db.execute('SELECT owner_id FROM properties WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    await db.execute('UPDATE properties SET property_status = ? WHERE id = ?', [property_status, id]);
    res.json({ success: true, message: 'Hali imesasishwa' });

  } catch (e) {
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};

// ─── GET /properties/my ───────────────────────────────────────────────────────
exports.getMyProperties = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*,
              COALESCE(
                (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 ORDER BY sort_order LIMIT 1),
                (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY sort_order LIMIT 1)
              ) AS primary_image
       FROM properties p
       WHERE p.owner_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getMyProperties error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── POST /properties/:id/boost ───────────────────────────────────────────────
exports.boostProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'ID si sahihi' });
    const [result] = await db.execute(
      'UPDATE properties SET is_premium = 1 WHERE id = ? AND owner_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Mali haipatikani au huna ruhusa' });
    }
    res.json({ success: true, message: 'Tangazo limeboostwa!' });
  } catch (e) {
    console.error('boostProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ─── PATCH /properties/:id/status ────────────────────────────────────────────
exports.updatePropertyStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { property_status } = req.body;
    const allowed = new Set(['available', 'sold', 'rented', 'pending']);
    if (!id || isNaN(id))              return res.status(400).json({ success: false, message: 'ID si sahihi' });
    if (!allowed.has(property_status)) return res.status(400).json({ success: false, message: 'Hali si sahihi' });
    const [rows] = await db.execute('SELECT owner_id FROM properties WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }
    await db.execute('UPDATE properties SET property_status = ? WHERE id = ?', [property_status, id]);
    res.json({ success: true, message: 'Hali ya mali imesasishwa' });
  } catch (e) {
    console.error('updatePropertyStatus error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva' });
  }
};