import dbClient, { ObjectId } from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    const allowedTypes = ['folder', 'file', 'image']

    if (!name) {
        return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type != 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    const filesCollection = dbClient.db.collection('files');
    const parent = await filesCollection.findOne({
      _id: new ObjectId(parentId),
    });

    if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
    } else if (parent.type != 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const newFile = {
        userId,
        name,
        type,
        parentId,

    }

    const result = await filesCollection.insertOne(newFile);
    const fileId = result.insertedId;

    return res.status(201).json({
        id: fileId,
        userId,
        name,
        type,
        parentId
    });
  }
}

export default FilesController;
