const { Op } = require('sequelize');
const Guest = require('../models/Guest');
const Attendance = require('../models/Attendance');

exports.getAttendance = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: attendance } = await Attendance.findAndCountAll({
      include: Guest,
      limit: limit,
      offset: offset,
      order: [['attendance_date', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('panitia/attendance', {
      attendance,
      page,
      totalPages,
      limit,
      searchResults: []
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    req.flash('error', 'An error occurred while fetching attendance.');
    res.redirect('/panitia/attendance');
  }
};

exports.addAttendance = async (req, res) => {
  const { guest_id } = req.body;

  try {
    const existingAttendance = await Attendance.findOne({ where: { guest_id } });

    if (existingAttendance) {
      req.flash('error', 'This guest has already been marked as present.');
    } else {
      const guest = await Guest.findByPk(guest_id);
      if (!guest) {
        req.flash('error', 'Guest not found.');
      } else {
        await Attendance.create({ guest_id });
        req.session.lastGuest = guest;
        req.flash('success', 'Attendance added successfully.');
      }
    }
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      req.flash('error', 'Duplicate entry for guest ID.');
    } else {
      console.error('Error adding attendance:', error);
      req.flash('error', 'An error occurred while adding attendance.');
    }
  }

  res.redirect('/panitia/attendance');
};

exports.addAttendanceByQRCode = async (req, res) => {
  const { guest_id } = req.body;

  try {
    const existingAttendance = await Attendance.findOne({ where: { guest_id } });

    if (existingAttendance) {
      req.flash('error', 'This guest has already been marked as present.');
    } else {
      const guest = await Guest.findByPk(guest_id);
      if (!guest) {
        req.flash('error', 'Guest not found.');
      } else {
        await Attendance.create({ guest_id });
        req.session.lastGuest = guest;
        req.flash('success', 'Attendance added successfully.');
      }
    }
    res.json({ redirect: true });
  } catch (error) {
    console.error('Error adding attendance:', error);
    req.flash('error', 'An error occurred while adding attendance.');
    res.json({ redirect: true });
  }
};


exports.searchGuest = async (req, res) => {
  const { fullname, page = 1, limit = 5 } = req.body;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: guests } = await Guest.findAndCountAll({
      where: {
        fullname: { [Op.like]: `%${fullname}%` }
      },
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(count / limit);

    res.json({ guests, page: parseInt(page), totalPages });
  } catch (error) {
    console.error('Error searching for guest:', error);
    res.status(500).json({ error: 'An error occurred while searching for guests.' });
  }
};

exports.getLastAttendee = (req, res) => {
  const guest = req.session.lastGuest;
  res.json(guest ? { fullname: guest.fullname } : {});
};

exports.addUnregisteredGuest = async (req, res) => {
  const { fullname, phone_number, status, info } = req.body;

  try {
    // Check if the guest already exists in the database
    const existingGuest = await Guest.findOne({
      where: {
        fullname: fullname
      }
    });

    if (existingGuest) {
      // If the guest already exists, stop the operation and send a message
      req.flash('error', 'Guest already exists.');
      return res.redirect('/panitia/attendance');
    } else {
      // If the guest does not exist, create a new guest
      const newGuest = await Guest.create({
        fullname: fullname,
        phone_number: phone_number,
        status: status,
        info: info
      });

      // Record attendance for the new guest
      await Attendance.create({
        guest_id: newGuest.guest_id,
        attendance_date: new Date()
      });

      req.flash('success', 'Unregistered guest added successfully.');
      return res.redirect('/panitia/attendance');
    }
  } catch (error) {
    console.error('Error adding unregistered guest:', error);
    req.flash('error', 'An error occurred while adding the unregistered guest.');
    return res.redirect('/panitia/attendance');
  }
};
