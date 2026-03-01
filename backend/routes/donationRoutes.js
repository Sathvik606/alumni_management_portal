const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @route   POST /api/donations
// @desc    Record a donation (no real payment integration yet)
// @access  Private (any logged-in alumni)
router.post('/', protect, async (req, res) => {
  try {
    const { amount, currency, purpose, message, paymentMethod, status } = req.body;

    const donation = await Donation.create({
      amount,
      currency,
      purpose,
      message,
      paymentMethod,
      status,
      donatedBy: req.user._id,
    });

    res.status(201).json(donation);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donations/my
// @desc    Get donations made by logged-in alumni
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const donations = await Donation.find({ donatedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donations
// @desc    Get all donations (admin only)
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const donations = await Donation.find().populate('donatedBy', 'name email').sort({ createdAt: -1 });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/donations/stats
// @desc    Basic donations stats (total amount, count)
// @access  Private/Admin
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [stats] = await Donation.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      totalAmount: stats?.totalAmount || 0,
      totalDonations: stats?.count || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/donations/:id
// @desc    Delete a donation record (admin only)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    await donation.deleteOne();
    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
