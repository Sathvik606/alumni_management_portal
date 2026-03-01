const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AlumniSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['alumni', 'admin'],
    default: 'alumni'
  },
  graduationYear: {
    type: Number
  },
  department: {
    type: String
  },
  currentJobTitle: {
    type: String
  },
  company: {
    type: String
  },
  location: {
    type: String
  },
  linkedin: {
    type: String
  },
  phone: {
    type: String
  },
  bio: {
    type: String
  },
  profilePicture: {
    type: String
  }
}, { timestamps: true });

// Hash password before saving
AlumniSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
AlumniSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Alumni', AlumniSchema);
