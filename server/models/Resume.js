const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema({
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  bulletPoints: [{ type: String }]
});

const EducationSchema = new mongoose.Schema({
  degree: { type: String, required: true },
  school: { type: String, required: true },
  year: { type: String, default: '' },
  percentage: { type: String, default: '' }
});

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  personalInfo: {
    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
    youtube: { type: String, default: '' }
  },
  summary: { type: String, default: '' },
  experience: [ExperienceSchema],
  education: [EducationSchema],
  skills: [{ type: String }],
  projects: [
    {
      title: { type: String, required: true },
      description: { type: String, default: '' },
      link: { type: String, default: '' },
      technologies: [{ type: String }]
    }
  ],
  jobDescription: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resume', ResumeSchema);
