// Required modules
const express = require('express');
const session = require('express-session');
const sequelize = require('./config/database');
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const path = require('path');
const dotenv = require('dotenv');
const uuid = require('uuid');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Flash messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  next();
});

// Serve Bootstrap CSS and JS
app.use("/css", express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use("/js", express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));

// Serve HTML5 QR Code
app.use("/js", express.static(path.join(__dirname, 'node_modules/html5-qrcode')));

// Serve jQuery
app.use("/js", express.static(path.join(__dirname, 'node_modules/jquery/dist')));

// Set view engine
app.set('view engine', 'ejs');

// Routes
const adminRoutes = require('./routes/admin');
const panitiaRoutes = require('./routes/panitia');
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');

// Root route handler
app.get('/', (req, res) => {
  if (req.session.user) {
    const redirectUrl = req.session.user.role === 'admin' ? '/admin/guests' : '/panitia/attendance';
    res.redirect(redirectUrl);
  } else {
    res.redirect('/login');
  }
});

app.use('/admin', adminRoutes);
app.use('/panitia', panitiaRoutes);
app.use('/', authRoutes);
app.use('/public', publicRoutes);

// Custom 404 Page
app.use((req, res, next) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Models
const User = require('./models/User');
const Guest = require('./models/Guest');
const Attendance = require('./models/Attendance');

// Associations
Guest.hasMany(Attendance, { foreignKey: 'guest_id' });
Attendance.belongsTo(Guest, { foreignKey: 'guest_id' });

// Default admin user initialization
async function initializeAdmin() {
  const adminExists = await User.findOne({ where: { username: process.env.DEFAULT_ADMIN_USERNAME } });

  if (!adminExists) {
    const passwordHash = bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD, 8);
    await User.create({
      user_id: uuid.v4(),
      username: process.env.DEFAULT_ADMIN_USERNAME,
      password_hash: passwordHash,
      fullname: 'Default Admin',
      role: 'admin',
      registration_date: new Date(),
    });
  }
}

// Database synchronization and server start
sequelize.sync()
  .then(() => initializeAdmin())
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
