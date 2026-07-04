import express from "express";
import {
  getProfessionals,
  addProfessional,
  updateProfile,
} from "../controllers/professionalController.js";

const router = express.Router();

router.get("/", getProfessionals);
router.post("/", addProfessional);
router.post("/profile", updateProfile);

export default router;