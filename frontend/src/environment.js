const IS_PROD = true;

export const server = IS_PROD
  ? "https://call-buddy.onrender.com"
  : "http://localhost:3000";
