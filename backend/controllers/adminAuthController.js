import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../middleware/responseHandler.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

export const loginAdmin = async (req, res) => {
  const { Email, Password } = req.body;
  try {
    const admin = await Admin.findOne({ Email });
    if (admin && (await admin.matchPassword(Password))) {
      sendSuccess(res, {
        token: generateToken(admin._id),
        admin: {
          _id: admin._id,
          Name: admin.Name,
          Email: admin.Email,
          role: admin.role,
        }
      }, 'Login successful');
    } else {
      sendError(res, 'Invalid email or password', 401);
    }
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-Password');
    if (admin) {
      sendSuccess(res, { admin }, 'Admin profile fetched successfully');
    } else {
      sendError(res, 'Admin not found', 404);
    }
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

export const registerAdmin = async (req, res) => {
  const { Name, Email, Password, phone } = req.body;
  try {
    const adminExists = await Admin.findOne({ Email });
    if (adminExists) {
      return sendError(res, 'Admin with this email already exists', 400);
    }

    const admin = await Admin.create({
      Name,
      Email,
      Password, // Password hashing is handled in Mongoose pre-save middleware
      role: 'admin'
    });

    if (admin) {
      sendSuccess(res, {
        token: generateToken(admin._id),
        admin: {
          _id: admin._id,
          Name: admin.Name,
          Email: admin.Email,
          role: admin.role,
        }
      }, 'Admin registered successfully', 201);
    } else {
      sendError(res, 'Invalid admin data', 400);
    }
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
