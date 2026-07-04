import {
  getAllProfessionals,
  createProfessional,
  updateProfessionalProfile,
} from "../services/professionalService.js";

import { sendJson } from "../utils/sendJson.js";

export async function getProfessionals(req, res) {
  try {
    const professionals = await getAllProfessionals();

    return sendJson(res, 200, professionals);
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message,
    });
  }
}

export async function addProfessional(req, res) {
  try {
    const professional = await createProfessional(req.body);

    return sendJson(res, 201, {
      success: true,
      professional,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message,
    });
  }
}

export async function updateProfile(req, res) {
  try {
    const profile = await updateProfessionalProfile(req);

    return sendJson(res, 200, {
      success: true,
      profile,
    });
  } catch (err) {
    return sendJson(res, 500, {
      success: false,
      message: err.message,
    });
  }
}