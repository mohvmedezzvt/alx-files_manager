import dbClient, { ObjectId } from '../utils/db';
import redisClient from '../utils/redis';
import mime from 'mime-types';
import fs from 'fs';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;
    const allowedTypes = ['folder', 'file', 'image'];

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
    };

    const result = await filesCollection.insertOne(newFile);
    const fileId = result.insertedId;

    return res.status(201).json({
      id: fileId,
      userId,
      name,
      type,
      parentId,
    });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({
      _id: ObjectId(fileId),
      userId,
    });

    if (!file) {
      return res.status(400).json({ error: 'Not found' });
    }
    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;

    const filter = { userId };
    if (parentId !== 0) {
      filter.parentId = parentId;
    }

    const files = await dbClient.files
      .find(filter)
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({
      _id: ObjectId(fileId),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: true } }
    );

    const updatedFile = await filesCollection.findOne({
      _id: new ObjectId(fileId),
    });

    return res.status(200).json(updatedFile);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const filesCollection = dbClient.db.collection('files');
    const file = await filesCollection.findOne({
      _id: ObjectId(fileId),
    });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    await filesCollection.updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: false } }
    );

    const updatedFile = await filesCollection.findOne({
      _id: new ObjectId(fileId),
    });

    return res.status(200).json(updatedFile);
  }

  static async getFile(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      if (!ObjectId.isValid(fileId)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const filesCollection = dbClient.db.collection('files');
      const file = await filesCollection.findOne({
        _id: ObjectId(fileId),
        userId,
      });

      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (!file.localPath) {
        return res.status(404).json({ error: 'Not found' });
      }

      let filePath = file.localPath;

      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({ error: 'Not found' });
      }

      const data = await fs.readFile(file.localPath);

      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);

      return res.status(200).send(data);
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;
