const QRCode = require('qrcode');
const User = require('../models/User');
const Guest = require('../models/Guest');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fastCsv = require('fast-csv');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Helper function to generate QR code buffer
const generateQRCode = async (data) => {
  try {
    return await QRCode.toBuffer(data);
  } catch (error) {
    throw new Error('Failed to generate QR code.');
  }
};

exports.getUsers = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: users } = await User.findAndCountAll({
      limit: parseInt(limit),  // Ensure limit is an integer
      offset: parseInt(offset),  // Ensure offset is an integer
      order: [['registration_date', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('admin/users', { users, page: parseInt(page), totalPages, limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching users:', error);
    req.flash('error', 'An error occurred while fetching users.');
    res.redirect('/admin/users');
  }
};

exports.addUser = async (req, res) => {
  try {
    const { username, password, fullname, role } = req.body;

    // Check if the username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      req.flash('error', 'Username already exists.');
      return res.redirect('/admin/users');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      user_id: uuidv4(),
      username,
      password_hash: hashedPassword,
      fullname,
      role,
      registration_date: new Date()
    });
    req.flash('success', 'User added successfully.');
  } catch (error) {
    console.error('Error adding user:', error);
    req.flash('error', 'Failed to add user.');
  }
  res.redirect('/admin/users');
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.destroy({ where: { user_id: userId } });
    req.flash('success', 'User deleted successfully.');
  } catch (error) {
    console.error('Error deleting user:', error);
    req.flash('error', 'Failed to delete user.');
  }
  res.redirect('/admin/users');
};


exports.getGuests = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: guests } = await Guest.findAndCountAll({
      limit: parseInt(limit),  // Ensure limit is an integer
      offset: parseInt(offset),  // Ensure offset is an integer
      order: [['createdAt', 'DESC']]
    });
    const totalPages = Math.ceil(count / limit);
    res.render('admin/guests', { guests, page: parseInt(page), totalPages, limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching guests:', error);
    req.flash('error', 'An error occurred while fetching guests.');
    res.redirect('/admin/guests');
  }
};

exports.addGuest = async (req, res) => {
  try {
    const { fullname, phone_number, status, info } = req.body;

    const existingGuest = await Guest.findOne({ where: { fullname } });
    if (existingGuest) {
      req.flash('error', 'Guest with this fullname already exists.');
      return res.redirect('/admin/guests');
    }

    const guest_id = uuidv4();
    const qrCodeData = await generateQRCode(guest_id);

    await Guest.create({
      guest_id,
      fullname,
      phone_number,
      status,
      info,
      qr_code_url: qrCodeData,
    });

    req.flash('success', 'Guest added successfully.');
  } catch (error) {
    console.error('Error adding guest:', error);
    req.flash('error', 'Failed to add guest.');
  }
  res.redirect('/admin/guests');
};

exports.uploadGuestsCsv = async (req, res) => {
  const filePath = req.file.path;
  const guests = [];
  const errors = [];
  const concurrencyLimit = 5;
  let activePromises = 0;

  const processRow = async (row) => {
    const guest_id = uuidv4();
    try {
      const qrCodeData = await generateQRCode(guest_id);
      const guest = {
        guest_id,
        fullname: row.fullname,
        phone_number: row.phone_number,
        status: row.status,
        info: row.info,
        qr_code_url: qrCodeData,
      };

      if (!guest.fullname || !guest.status) {
        const errorMsg = `Missing required fields in row: ${JSON.stringify(row)}`;
        errors.push(errorMsg);
      } else {
        await Guest.create(guest);
      }
    } catch (error) {
      const validationErrors = `Error processing row: ${JSON.stringify(row)} - ${error.message}`;
      errors.push(validationErrors);
    }
  };

  const handleRow = async (row) => {
    if (Object.keys(row).length > 0) {
      activePromises++;
      await processRow(row);
      activePromises--;
    }
  };

  const parseCsv = () => {
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(fastCsv.parse({ headers: true }))
        .on('data', async (row) => {
          while (activePromises >= concurrencyLimit) {
            await new Promise((r) => setTimeout(r, 100));
          }
          handleRow(row).catch(reject);
        })
        .on('end', resolve)
        .on('error', reject);
    });
  };

  try {
    await parseCsv();
    while (activePromises > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
    fs.unlinkSync(filePath);

    if (errors.length > 0) {
      req.flash('error', errors.join('<br>'));
    } else {
      req.flash('success', 'Guests imported successfully.');
    }
  } catch (error) {
    console.error('Error processing CSV file:', error);
    req.flash('error', 'Error processing CSV file.');
  }

  res.redirect('/admin/guests');
};

exports.deleteGuest = async (req, res) => {
  try {
    const guestId = req.params.id;
    await Guest.destroy({ where: { guest_id: guestId } });
    req.flash('success', 'Guest deleted successfully.');
  } catch (error) {
    console.error('Error deleting guest:', error);
    req.flash('error', 'Failed to delete guest.');
  }
  res.redirect('/admin/guests');
};

exports.sendInvite = async (req, res) => {
  // Implement WhatsApp invite functionality
};

exports.exportGuests = async (req, res) => {
  try {
    const guests = await Guest.findAll();
    const protocol = req.protocol;
    const host = req.get('host');
    const domain = `${protocol}://${host}`;

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Guests');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone Number', key: 'phoneNumber', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Info', key: 'info', width: 30 },
      { header: 'QR Code Link', key: 'qrCodeLink', width: 50 }
    ];

    // Add rows
    guests.forEach(guest => {
      worksheet.addRow({
        name: guest.fullname,
        phoneNumber: guest.phone_number,
        status: guest.status,
        info: guest.info,
        qrCodeLink: `${domain}/public/qrcode/${guest.guest_id}`
      });
    });

    // Save the workbook to a file
    const exportFilePath = path.join(__dirname, '..', 'private', 'Guest_List.xlsx');
    await workbook.xlsx.writeFile(exportFilePath);

    // Send the file to the client
    res.download(exportFilePath, 'Guest_List.xlsx', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        req.flash('error', 'An error occurred while exporting guests.');
        res.redirect('/admin/guests');
      } else {
        fs.unlinkSync(exportFilePath);
      }
    });
  } catch (error) {
    console.error('Error exporting guests:', error);
    req.flash('error', 'An error occurred while exporting guests.');
    res.redirect('/admin/guests');
  }
};


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

    res.render('admin/attendance', {
      attendance,
      page,
      totalPages,
      limit
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    req.flash('error', 'An error occurred while fetching attendance.');
    res.redirect('/admin');
  }
};

exports.exportAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findAll({ include: Guest });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    // Define columns
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Phone Number', key: 'phoneNumber', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Info', key: 'info', width: 30 },
      { header: 'Attendance Date', key: 'attendanceDate', width: 20 },
      { header: 'Attendance Time', key: 'attendanceTime', width: 20 }
    ];

    // Add rows
    attendance.forEach(record => {
      const attendanceDate = new Date(record.attendance_date);
      worksheet.addRow({
        name: record.Guest.fullname,
        phoneNumber: record.Guest.phone_number,
        status: record.Guest.status,
        info: record.Guest.info,
        attendanceDate: attendanceDate.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }),
        attendanceTime: attendanceDate.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    });

    // Apply center alignment to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });

    const exportFilePath = path.join(__dirname, '..', 'private', 'WedGuest_Attendance_List.xlsx');
    await workbook.xlsx.writeFile(exportFilePath);

    res.download(exportFilePath, 'WedGuest_Attendance_List.xlsx', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        req.flash('error', 'An error occurred while exporting attendance.');
        res.redirect('/admin/attendance');
      } else {
        fs.unlinkSync(exportFilePath);
      }
    });
  } catch (error) {
    console.error('Error exporting attendance:', error);
    req.flash('error', 'An error occurred while exporting attendance.');
    res.redirect('/admin/attendance');
  }
};



