import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { protect, staffOrAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure Google Cloud Storage explicitly (no local fallback)
let storageClient: Storage;

if (process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
  storageClient = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
      client_email: process.env.GCP_CLIENT_EMAIL,
      // Replace escaped newlines so the private key is parsed correctly from .env
      private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n')
    }
  });
} else {
  // Try Application Default Credentials if specific keys aren't in .env
  storageClient = new Storage();
}

const bucketName = process.env.GCS_BUCKET_NAME || 'cdn.lanforge.co';
const bucket = storageClient.bucket(bucketName);

const uploadBufferToGCS = async (buffer: Buffer, originalname: string, mimetype: string, folder: string): Promise<string> => {
  const uniqueName = `${crypto.randomUUID()}${path.extname(originalname).toLowerCase()}`;
  const safeFolder = folder.replace(/[^a-zA-Z0-9-_]/g, '') || 'misc';
  const destination = `${safeFolder}/${uniqueName}`;
  const file = bucket.file(destination);

  await file.save(buffer, {
    resumable: false,
    contentType: mimetype,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    }
  });

  return `https://${bucketName}/${destination}`;
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/uploads/image
router.post('/image', protect, staffOrAdmin, upload.single('image'), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    
    const folder = typeof req.body.folder === 'string' ? req.body.folder : 'misc';
    const url = await uploadBufferToGCS(req.file.buffer, req.file.originalname, req.file.mimetype, folder);
    
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// POST /api/uploads/images (multiple)
router.post('/images', protect, staffOrAdmin, upload.array('images', 10), async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }
    
    const folder = typeof req.body.folder === 'string' ? req.body.folder : 'misc';
    const urls = await Promise.all(
      (req.files as Express.Multer.File[]).map((f) => 
        uploadBufferToGCS(f.buffer, f.originalname, f.mimetype, folder)
      )
    );
    
    res.json({ urls });
  } catch (error) {
    next(error);
  }
});

export default router;
