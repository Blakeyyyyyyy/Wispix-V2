require('dotenv').config();

console.log('Environment Variables Test:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'SET' : 'NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET' : 'NOT SET');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET');

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}
if (process.env.DIRECT_URL) {
  console.log('DIRECT_URL starts with:', process.env.DIRECT_URL.substring(0, 20) + '...');
} 