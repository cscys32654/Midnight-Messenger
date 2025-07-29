const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,         // ✅ Typo fixed: useNewUrlParse ➝ useNewUrlParser
      useUnifiedTopology: true
    });
    console.log('Mongo Database connected successfully');
  } catch (error) {                 // ✅ Changed 'Error' ➝ 'error' (capital 'E' is wrong here)
    console.log('Error connecting database:', error.message);
    process.exit(1);
  }
};

module.exports = connectDb;
