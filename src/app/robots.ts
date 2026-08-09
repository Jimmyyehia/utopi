import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || "https://utopi.space"

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/schedule", "/teams", "/partners"],
        disallow: ["/api/", "/dashboard", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
