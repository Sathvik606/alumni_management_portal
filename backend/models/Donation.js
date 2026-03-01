const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
    },
    donatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alumni',
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'bank-transfer', 'cash', 'other'],
      default: 'online',
    },
    status: {
      type: String,
      enum: ['pledged', 'completed', 'cancelled'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Donation', DonationSchema);
