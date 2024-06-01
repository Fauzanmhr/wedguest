const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Login function with try-catch for error handling
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).render('login', { error: 'Username and password are required' });
    }

    const user = await User.findOne({ where: { username } });

    if (user && bcrypt.compareSync(password, user.password_hash)) {
      req.session.user = user;
      const redirectUrl = user.role === 'admin' ? '/admin/guests' : '/panitia/attendance';
      res.redirect(redirectUrl);
    } else {
      res.status(401).render('login', { error: 'Invalid credentials' });
    }
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res, next) => {
  try {
    req.session.destroy(err => {
      if (err) {
        return next(err);
      }
      res.redirect('/login');
    });
  } catch (error) {
    next(error);
  }
};

exports.ensureAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

exports.ensureAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else if (req.session.user) {
    res.redirect('/panitia/attendance');
  } else {
    res.redirect('/login');
  }
};

exports.ensurePanitia = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'panitia') {
    next();
  } else if (req.session.user) {
    res.redirect('/admin/guests');
  } else {
    res.redirect('/login');
  }
};
