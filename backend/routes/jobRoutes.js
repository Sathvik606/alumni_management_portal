const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @route   GET /api/jobs
// @desc    Get all jobs with optional filters
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { title, company, location, type, mode, isActive } = req.query;

    const filter = {};
    if (title) filter.title = { $regex: title, $options: 'i' };
    if (company) filter.company = { $regex: company, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (type) filter.type = type;
    if (mode) filter.mode = mode;
    if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';

    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single job
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/jobs
// @desc    Create job (any logged-in alumni)
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, company, location, type, mode, description, requirements, salaryRange, applyLink } = req.body;

    const job = await Job.create({
      title,
      company,
      location,
      type,
      mode,
      description,
      requirements,
      salaryRange,
      applyLink,
      postedBy: req.user._id,
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update job (owner or admin)
// @access  Private
router.put('/:id', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Only job owner or admin can update
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const { title, company, location, type, mode, description, requirements, salaryRange, applyLink, isActive } = req.body;

    job.title = title || job.title;
    job.company = company || job.company;
    job.location = location || job.location;
    job.type = type || job.type;
    job.mode = mode || job.mode;
    job.description = description || job.description;
    job.requirements = requirements || job.requirements;
    job.salaryRange = salaryRange || job.salaryRange;
    job.applyLink = applyLink || job.applyLink;
    if (typeof isActive === 'boolean') job.isActive = isActive;

    const updated = await job.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete job (admin only)
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
