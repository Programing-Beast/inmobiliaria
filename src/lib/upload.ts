type UploadResult = {
  url?: string;
  error?: string;
};

const uploadProvider = (import.meta.env.VITE_UPLOAD_PROVIDER || "cloudinary").toLowerCase();

const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  folder: import.meta.env.VITE_CLOUDINARY_FOLDER || "amenity-rules",
};

const validatePdf = (file: File) => {
  if (!file) return "Missing file";
  if (file.type !== "application/pdf") return "Only PDF files are allowed";
  const maxSizeMb = Number(import.meta.env.VITE_UPLOAD_MAX_MB || 10);
  if (Number.isFinite(maxSizeMb) && file.size > maxSizeMb * 1024 * 1024) {
    return `File exceeds ${maxSizeMb}MB limit`;
  }
  return null;
};

const uploadToCloudinary = async (file: File): Promise<UploadResult> => {
  const validationError = validatePdf(file);
  if (validationError) return { error: validationError };

  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    return { error: "Missing Cloudinary upload configuration" };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", cloudinaryConfig.uploadPreset);
  formData.append("folder", cloudinaryConfig.folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/raw/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    const payload = await response.json();
    if (!response.ok) {
      return { error: payload?.error?.message || "Upload failed" };
    }
    return { url: payload.secure_url || payload.url };
  } catch (error: any) {
    return { error: error?.message || "Network error during upload" };
  }
};

export const uploadAmenityRulesPdf = async (file: File): Promise<UploadResult> => {
  if (uploadProvider !== "cloudinary") {
    return { error: `Unsupported upload provider: ${uploadProvider}` };
  }
  return uploadToCloudinary(file);
};
