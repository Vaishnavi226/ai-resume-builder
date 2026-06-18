const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./server/models/User');
const Resume = require('./server/models/Resume');
const Portfolio = require('./server/models/Portfolio');

const MONGO_URI = 'mongodb://127.0.0.1:27017/resume-portfolio';

const dummyUsers = [
  { email: 'admin@example.com', password: 'admin123' },
  { email: 'user@example.com', password: 'user123' }
];

const sampleResumeData = (userId, name, email) => ({
  userId,
  personalInfo: {
    fullName: name,
    email: email,
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/dummyprofile',
    website: 'github.com/dummyprofile',
    youtube: 'harshibar'
  },
  summary: 'Detail-oriented and results-driven Software Engineer with over 4 years of experience building responsive, accessible web applications and reliable microservices.',
  experience: [
    {
      jobTitle: 'Software Engineer II',
      company: 'Tech Solutions Inc.',
      location: 'San Francisco, CA',
      startDate: 'Mar 2022',
      endDate: 'Present',
      bulletPoints: [
        'Developed scalable REST APIs using Node.js and Express, improving data load times by 25%.',
        'Built interactive dashboard layouts using vanilla Javascript, which boosted user engagement by 15%.'
      ]
    },
    {
      jobTitle: 'Junior Developer',
      company: 'App Ventures',
      location: 'Oakland, CA',
      startDate: 'Jun 2020',
      endDate: 'Feb 2022',
      bulletPoints: [
        'Maintained front-end components and debugged issues, reducing bug reports by 40% over 6 months.',
        'Collaborated with designers to convert layout wireframes into responsive, cross-browser CSS code.'
      ]
    }
  ],
  education: [
    {
      degree: 'Graduation',
      school: 'California State University',
      year: '2016 - 2020',
      percentage: '3.8 GPA'
    },
    {
      degree: 'HSC',
      school: 'West High School',
      year: '2014 - 2016',
      percentage: '88%'
    },
    {
      degree: 'SSC',
      school: 'West Middle School',
      year: '2010 - 2014',
      percentage: '92%'
    }
  ],
  skills: ['JavaScript', 'HTML5', 'CSS3', 'Node.js', 'Express', 'MongoDB', 'Git', 'REST APIs'],
  projects: [
    {
      title: 'AI Resume & Portfolio Builder',
      description: 'Collaborated on building an ATS-optimized resume builder and live portfolio site generator using Node.js.',
      link: 'github.com/dummyprofile/resume-builder',
      technologies: ['Node.js', 'Express', 'MongoDB', 'Vanilla JS']
    }
  ],
  jobDescription: ''
});

const samplePortfolioData = (userId, name) => ({
  userId,
  fullName: name,
  profileImage: '',
  tagline: 'Crafting Minimal, Interactive Web Solutions',
  bio: 'Hi, I am a software engineer focused on building clean web architectures, writing maintainable code, and creating highly interactive user interfaces.',
  skills: ['HTML5', 'CSS3', 'Vanilla JS', 'Node.js', 'MongoDB', 'Git'],
  projects: [
    {
      title: 'AI Portfolio Engine',
      description: 'A minimal, fast compiler that generates static index.html pages from custom user states.',
      link: 'https://github.com/dummyprofile/portfolio-engine',
      image: '',
      technologies: ['Node.js', 'Express', 'CSS3'],
      order: 0
    },
    {
      title: 'E-commerce API Gateway',
      description: 'A secure gateway service handling rate-limiting, JWT authentication, and cache invalidation.',
      link: 'https://github.com/dummyprofile/ecommerce-api',
      image: '',
      technologies: ['Node.js', 'Express', 'MongoDB'],
      order: 1
    }
  ],
  theme: {
    primaryColor: '#5B6C7A',
    backgroundColor: '#FAFAFA',
    font: 'Inter'
  },
  socialLinks: {
    github: 'github.com/dummyprofile',
    linkedin: 'linkedin.com/in/dummyprofile',
    twitter: 'twitter.com/dummyprofile',
    youtube: 'harshibar'
  }
});

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    // Clear existing collections
    console.log('Clearing database collection data...');
    await User.deleteMany({});
    await Resume.deleteMany({});
    await Portfolio.deleteMany({});

    for (const u of dummyUsers) {
      console.log(`Creating user: ${u.email}...`);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);

      const user = new User({
        email: u.email,
        password: hashedPassword
      });
      await user.save();

      console.log(`Seeding resume data for ${u.email}...`);
      const resume = new Resume(sampleResumeData(user._id, u.email === 'admin@example.com' ? 'Alex Mercer (Admin)' : 'Sam Carter (User)', u.email));
      await resume.save();

      console.log(`Seeding portfolio data for ${u.email}...`);
      const portfolio = new Portfolio(samplePortfolioData(user._id, u.email === 'admin@example.com' ? 'Alex Mercer' : 'Sam Carter'));
      await portfolio.save();
    }

    console.log('==================================================');
    console.log('SUCCESS: Database successfully seeded!');
    console.log('Credentials:');
    console.log('1. Admin Account: email="admin@example.com", password="admin123"');
    console.log('2. User Account:  email="user@example.com", password="user123"');
    console.log('==================================================');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
