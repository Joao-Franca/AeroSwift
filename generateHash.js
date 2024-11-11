const bcrypt = require('bcrypt');

async function generateHash() {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('1234', saltRounds);
    console.log(hashedPassword); // Esse hash será exibido no console
}

generateHash();
