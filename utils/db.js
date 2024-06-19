import { MongoClient, ObjectId } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    this.client.connect((err) => {
      if (err) {
        // console.error('Error connecting to database:', err);
        this.db = null;
      } else {
        // console.log('Connected to database!');
        this.db = this.client.db(database);
      }
    });
  }

  isAlive() {
    return this.db !== null;
  }

  async nbUsers() {
    if (!this.isAlive()) return 0;
    const usersCollection = this.db.collection('users');
    return usersCollection.countDocuments();
  }

  async nbFiles() {
    if (!this.isAlive()) return 0;
    const filesCollection = this.db.collection('files');
    return filesCollection.countDocuments();
  }
}

const dbClient = new DBClient();
export { dbClient as default, ObjectId };
