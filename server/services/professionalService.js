import Professional from "../models/Professional.js";
import {
  memoryProfessionals,
} from "../store/memoryStore.js";

export async function getAllProfessionals() {
  try {
    return await Professional.find().sort({ createdAt: -1 }).lean();
  } catch {
    return memoryProfessionals;
  }
}

export async function createProfessional(data) {
  try {
    const professional = await Professional.create({
      name: data.name,
      service: data.service,
      location: data.location,
      experienceYears: Number(data.experienceYears) || 1,
      completedJobs: Number(data.completedJobs) || 0,
      phone: data.phone || "",
      description: data.description || "",
      imageUrl: data.imageUrl || "",
      specialties: data.specialties || ["Verified", "New profile"],
      ownerUserId: data.ownerUserId || "",
      bio: data.bio || "",
      availability: data.availability || "Available today",
      rate: data.rate || "",
    });

    return professional.toObject();
  } catch {
    const professional = {
      id: Date.now(),
      ...data,
      rating: 4.8,
      distance: "Newly joined",
      specialties: data.specialties || ["Verified", "New profile"],
    };

    memoryProfessionals.unshift(professional);

    return professional;
  }
}

export async function updateProfessionalProfile(req) {
  const data = req.body || {};

  const profile = await Professional.findOneAndUpdate(
    { ownerUserId: data.ownerUserId },
    {
      $set: {
        ownerUserId: data.ownerUserId,
        name: data.name,
        service: data.service,
        location: data.location,
        experienceYears: Number(data.experienceYears) || 1,
        completedJobs: Number(data.completedJobs) || 0,
        description: data.bio || "",
        bio: data.bio || "",
        availability: data.availability || "Available today",
        rate: data.rate || "",
        imageUrl: data.imageUrl || "",
      },
    },
    {
      new: true,
      upsert: true,
    }
  );

  return profile;
}