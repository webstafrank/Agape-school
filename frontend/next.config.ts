import type { NextConfig } from "next";

/**
 * Hosts that next/image may load photos from. Media lives in cloud storage
 * (never in the repo). Keep in sync with MEDIA_IMAGE_HOSTS on the backend,
 * which validates the links admins paste in.
 */
const imageHosts = (process.env.IMAGE_REMOTE_HOSTS ?? "res.cloudinary.com")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: "https", hostname, pathname: "/**" })),
  },
};

export default nextConfig;
