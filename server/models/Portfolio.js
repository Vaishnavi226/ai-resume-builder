const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  link: { type: String, default: '' },
  image: { type: String, default: '' }, // base64 or image URL
  technologies: [{ type: String }],
  order: { type: Number, default: 0 }
});

const ThemeSchema = new mongoose.Schema({
  primaryColor: { type: String, default: '#d2bbff' },
  secondaryColor: { type: String, default: '#bec6e0' },
  tertiaryColor: { type: String, default: '#3cddc7' },
  backgroundColor: { type: String, default: '#101415' },
  cardStyle: { type: String, default: 'glassmorphic' }, // glassmorphic, bordered, glowing, flat
  font: { type: String, default: 'Geist' }
});

const SocialLinksSchema = new mongoose.Schema({
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  twitter: { type: String, default: '' },
  youtube: { type: String, default: '' }
});

const StatItemSchema = new mongoose.Schema({
  value: { type: String, default: '' },
  label: { type: String, default: '' }
});

const SkillCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  percentage: { type: Number, default: 90 },
  skills: [{ type: String }]
});

const PortfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: { type: String, default: '' },
  profileImage: { type: String, default: '' }, // base64 data URL
  syncFromResume: { type: Boolean, default: true },
  tagline: { type: String, default: '' },
  bio: { type: String, default: '' },
  skills: [{ type: String }],
  skillCategories: {
    type: [SkillCategorySchema],
    default: () => [
      { name: 'Frontend Mastery', percentage: 95, skills: ['HTML5', 'CSS3', 'React'] },
      { name: 'Backend & DB', percentage: 88, skills: ['Node.js', 'MongoDB', 'SQL'] },
      { name: 'Logic & Ops', percentage: 92, skills: ['Java', 'DSA', 'Git'] }
    ]
  },
  stats: {
    type: [StatItemSchema],
    default: () => [
      { value: '2+', label: 'Years Exp.' },
      { value: '15+', label: 'Projects' },
      { value: '500+', label: 'DSA Solved' },
      { value: '10+', label: 'Certs' }
    ]
  },
  projects: [ProjectSchema],
  education: [
    {
      degree: { type: String, required: true },
      school: { type: String, required: true },
      year: { type: String, default: '' },
      percentage: { type: String, default: '' }
    }
  ],
  theme: {
    type: ThemeSchema,
    default: () => ({})
  },
  socialLinks: {
    type: SocialLinksSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);
