// Organisation name shown in the header wordmark and on the login screen.
// Override at build time with VITE_ORG_NAME (baked in by Vite — change it in
// .env and rebuild the image to take effect). Falls back to the OBTV default.
export const ORG_NAME =
  import.meta.env.VITE_ORG_NAME?.trim() || "OBTV Edit Systems";
