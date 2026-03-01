const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Alumni = require('../models/Alumni');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// @route   POST /api/auth/register
// @desc    Register a new alumni
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password, graduationYear, department } = req.body;

  try {
    const existingUser = await Alumni.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const alumni = await Alumni.create({
      name,
      email,
      password,
      graduationYear,
      department
    });

    res.status(201).json({
      _id: alumni._id,
      name: alumni.name,
      email: alumni.email,
      role: alumni.role,
      token: generateToken(alumni._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login alumni
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const alumni = await Alumni.findOne({ email });

    if (!alumni || !(await alumni.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: alumni._id,
      name: alumni.name,
      email: alumni.email,
      role: alumni.role,
      token: generateToken(alumni._id)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
