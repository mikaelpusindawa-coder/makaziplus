const db = require('../config/db');

const ALLOWED_TYPES = new Set(['nyumba', 'chumba', 'frem', 'ofisi']);
const ALLOWED_PRICE_TYPES = new Set(['rent', 'sale']);
const ALLOWED_STATUSES = new Set(['active', 'inactive', 'pending', 'rejected', 'suspended']);
const ALLOWED_UPDATE_FIELDS = new Set([
  'title', 'description', 'type', 'price', 'price_type',
  'city', 'area', 'address', 'bedrooms', 'bathrooms', 'size_sqm', 'status', 'property_status'
]);

// ============================================================
// GET ALL PROPERTIES (with filters + images)
// ============================================================
exports.getProperties = async (req, res) => {
  try {
    let { type, city, price_min, price_max, price_type, search, premium, page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const offset = (page - 1) * limit;

    const where = ['p.status = ?'];
    const vals = ['active'];

    if (type && ALLOWED_TYPES.has(type)) {
      where.push('p.type = ?');
      vals.push(type);
    }
    if (city && typeof city === 'string' && city.trim().length <= 100) {
      where.push('p.city LIKE ?');
      vals.push(`%${city.trim()}%`);
    }
    if (price_min && !isNaN(price_min)) {
      where.push('p.price >= ?');
      vals.push(parseFloat(price_min));
    }
    if (price_max && !isNaN(price_max)) {
      where.push('p.price <= ?');
      vals.push(parseFloat(price_max));
    }
    if (price_type && ALLOWED_PRICE_TYPES.has(price_type)) {
      where.push('p.price_type = ?');
      vals.push(price_type);
    }
    if (premium === '1' || premium === 'true') {
      where.push('p.is_premium = ?');
      vals.push(1);
    }
    if (search && typeof search === 'string' && search.trim().length <= 100) {
      where.push('(p.title LIKE ? OR p.area LIKE ? OR p.city LIKE ?)');
      const safe = `%${search.trim()}%`;
      vals.push(safe, safe, safe);
    }

    const wc = 'WHERE ' + where.join(' AND ');

    const query = `
      SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.avatar AS owner_avatar,
             u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      ${wc}
      ORDER BY p.is_premium DESC, p.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const [rows] = await db.execute(query, vals);

    // Fetch images for each property
    for (let i = 0; i < rows.length; i++) {
      const [images] = await db.execute(
        'SELECT id, image_url, is_primary, sort_order FROM property_images WHERE property_id = ? ORDER BY sort_order',
        [rows[i].id]
      );
      rows[i].images = images;
      if (images.length > 0) {
        const primaryImg = images.find(img => img.is_primary === 1);
        rows[i].primary_image = primaryImg ? primaryImg.image_url : images[0].image_url;
      }
    }

    const countQuery = `SELECT COUNT(*) AS t FROM properties p ${wc}`;
    const [[cnt]] = await db.execute(countQuery, vals);

    res.json({ success: true, data: rows, total: cnt.t, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    console.error('getProperties error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ============================================================
// GET SINGLE PROPERTY (with images, amenities, reviews)
// ============================================================
exports.getProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }

    await db.execute('UPDATE properties SET views = views + 1 WHERE id = ?', [id]);

    const [rows] = await db.execute(`
      SELECT p.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email,
             u.avatar AS owner_avatar, u.plan AS owner_plan, u.role AS owner_role, u.verified AS owner_verified
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      WHERE p.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    }

    const [images] = await db.execute('SELECT * FROM property_images WHERE property_id = ? ORDER BY sort_order', [id]);
    const [amenities] = await db.execute('SELECT amenity FROM property_amenities WHERE property_id = ?', [id]);
    const [reviews] = await db.execute(`
      SELECT r.*, u.name AS reviewer_name, u.avatar AS reviewer_avatar
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.property_id = ? ORDER BY r.created_at DESC LIMIT 10
    `, [id]);

    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

    res.json({
      success: true,
      data: {
        ...rows[0],
        images,
        amenities: amenities.map(a => a.amenity),
        reviews,
        avg_rating: avg,
        review_count: reviews.length,
      },
    });
  } catch (e) {
    console.error('getProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ============================================================
// GET MY PROPERTIES (for owner/dalali dashboard)
// ============================================================
exports.getMyProperties = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) AS primary_image
      FROM properties p
      WHERE p.owner_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);

    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('getMyProperties error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ============================================================
// CREATE PROPERTY (WITH IMAGE UPLOAD)
// ============================================================
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

    const safePriceType = ALLOWED_PRICE_TYPES.has(price_type) ? price_type : 'rent';
    const latitude = req.body.latitude || null;
    const longitude = req.body.longitude || null;
    const placeId = req.body.place_id || null;
    const formattedAddress = req.body.formatted_address || address || null;

    const [r] = await db.execute(`
      INSERT INTO properties 
      (owner_id, title, description, type, price, price_type, city, area, address, bedrooms, bathrooms, size_sqm, 
       status, latitude, longitude, place_id, formatted_address, property_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 'available')
    `, [
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
      formattedAddress
    ]);

    const pid = r.insertId;
    console.log(`📝 Created property ID: ${pid}`);

    if (req.files && req.files.length > 0) {
      console.log(`📸 Saving ${req.files.length} images for property ${pid}`);
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = `/uploads/properties/${file.filename}`;
        await db.execute(
          'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [pid, imageUrl, i === 0 ? 1 : 0, i]
        );
        console.log(`   Image ${i + 1}: ${imageUrl}`);
      }
    } else {
      console.log(`⚠️ No images uploaded for property ${pid}`);
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

    const [prop] = await db.execute('SELECT * FROM properties WHERE id = ?', [pid]);
    res.status(201).json({ success: true, data: prop[0], message: 'Tangazo limechapishwa!' });
  } catch (e) {
    console.error('createProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ============================================================
// UPDATE PROPERTY (WITH FIXED IMAGE HANDLING)
// ============================================================
exports.updateProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }

    const [rows] = await db.execute('SELECT * FROM properties WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    }
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    // Update property basic info
    const sets = [];
    const vals = [];
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        if (field === 'type' && !ALLOWED_TYPES.has(req.body[field])) continue;
        if (field === 'price_type' && !ALLOWED_PRICE_TYPES.has(req.body[field])) continue;
        if (field === 'status' && !ALLOWED_STATUSES.has(req.body[field])) continue;
        if (field === 'price' && isNaN(parseFloat(req.body[field]))) continue;
        sets.push(`${field} = ?`);
        vals.push(req.body[field]);
      }
    }

    if (req.body.latitude !== undefined) { sets.push('latitude = ?'); vals.push(req.body.latitude || null); }
    if (req.body.longitude !== undefined) { sets.push('longitude = ?'); vals.push(req.body.longitude || null); }
    if (req.body.place_id !== undefined) { sets.push('place_id = ?'); vals.push(req.body.place_id || null); }
    if (req.body.formatted_address !== undefined) { sets.push('formatted_address = ?'); vals.push(req.body.formatted_address || null); }

    if (sets.length > 0) {
      vals.push(id);
      await db.execute(`UPDATE properties SET ${sets.join(', ')} WHERE id = ?`, vals);
    }

    // Add new images
    if (req.files && req.files.length > 0) {
      console.log(`📸 Adding ${req.files.length} new images for property ${id}`);
      const [existingImages] = await db.execute(
        'SELECT MAX(sort_order) as max_order FROM property_images WHERE property_id = ?',
        [id]
      );
      let startOrder = (existingImages[0].max_order || -1) + 1;
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = `/uploads/properties/${file.filename}`;
        await db.execute(
          'INSERT INTO property_images (property_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)',
          [id, imageUrl, 0, startOrder + i]
        );
        console.log(`   New image ${i + 1}: ${imageUrl}`);
      }
    }

    // CRITICAL FIX: Only remove images if remove_images exists and is an array
    if (req.body.remove_images) {
      try {
        const toRemove = typeof req.body.remove_images === 'string' 
          ? JSON.parse(req.body.remove_images) 
          : req.body.remove_images;
        
        if (Array.isArray(toRemove) && toRemove.length > 0) {
          for (const imgId of toRemove) {
            await db.execute('DELETE FROM property_images WHERE id = ? AND property_id = ?', [imgId, id]);
            console.log(`🗑️ Removed image ID: ${imgId}`);
          }
        }
      } catch (parseErr) {
        console.error('Error parsing remove_images:', parseErr.message);
        // Continue without removing images
      }
    }

    const [updated] = await db.execute('SELECT * FROM properties WHERE id = ?', [id]);
    res.json({ success: true, data: updated[0], message: 'Tangazo limesasishwa!' });
  } catch (e) {
    console.error('updateProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ============================================================
// DELETE PROPERTY
// ============================================================
exports.deleteProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }

    const [rows] = await db.execute('SELECT * FROM properties WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    }
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    await db.execute('DELETE FROM properties WHERE id = ?', [id]);
    res.json({ success: true, message: 'Tangazo limefutwa' });
  } catch (e) {
    console.error('deleteProperty error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};

// ============================================================
// BOOST PROPERTY (Make Premium)
// ============================================================
exports.boostProperty = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID si sahihi' });
    }

    const [result] = await db.execute(
      'UPDATE properties SET is_premium = 1 WHERE id = ? AND owner_id = ?',
      [1, req.user.id]
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

// ============================================================
// UPDATE PROPERTY STATUS (available/sold/rented/pending)
// ============================================================
exports.updatePropertyStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { property_status } = req.body;
    const allowed = new Set(['available', 'sold', 'rented', 'pending']);

    if (!allowed.has(property_status)) {
      return res.status(400).json({ success: false, message: 'Hali si sahihi' });
    }

    const [rows] = await db.execute('SELECT owner_id FROM properties WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Mali haipatikani' });
    }
    if (rows[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Huna ruhusa' });
    }

    await db.execute('UPDATE properties SET property_status = ? WHERE id = ?', [property_status, id]);
    res.json({ success: true, message: 'Hali ya mali imesasishwa' });
  } catch (e) {
    console.error('updatePropertyStatus error:', e.message);
    res.status(500).json({ success: false, message: 'Hitilafu ya seva', error: e.message });
  }
};