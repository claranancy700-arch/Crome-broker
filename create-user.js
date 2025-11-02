const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

async function main() {
  const dataDir = path.join(__dirname, 'data');
  await fs.mkdir(dataDir, { recursive: true });
  const usersFile = path.join(dataDir, 'users.json');

  let users = [];
  try {
    const raw = await fs.readFile(usersFile, 'utf8');
    users = JSON.parse(raw || '[]');
  } catch (e) {
    users = [];
  }

  const email = 'emily@example.com';
  if (users.find(u => u.email === email.toLowerCase())) {
    console.log('User already exists:', email);
    return;
  }

  const name = 'EMILY';
  const password = '123456'; // per your request (weak password)

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString('hex');

  const user = {
    id,
    name,
    email: email.toLowerCase(),
    salt,
    hash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
  console.log('Created user:', name, email);
  console.log('Warning: password is weak. Change it for production.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});