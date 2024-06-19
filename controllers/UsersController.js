import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ email });

    if (user) return res.status(400).json({ error: 'Already exist' });

    const hashedPassword = sha1(password);
    const newUser = {
      email,
      password: hashedPassword,
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId;

    return res.status(201).json({
      id: userId,
      email,
    });
  }
}

export default UsersController;
