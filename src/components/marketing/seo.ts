import { useEffect } from "react";

/** Sets document title + basic meta for public marketing pages (SPA-friendly). */
export function usePageSeo({
  title,
  description,
  path = "/",
  noindex = false,
}: {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
}) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const ensureMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        if (selector.includes("property=")) {
          el.setAttribute("property", selector.match(/property="([^"]+)"/)?.[1] || "");
        } else {
          el.setAttribute("name", selector.match(/name="([^"]+)"/)?.[1] || "");
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
      return el;
    };

    ensureMeta('meta[name="description"]', "content", description);
    ensureMeta('meta[property="og:title"]', "content", title);
    ensureMeta('meta[property="og:description"]', "content", description);
    ensureMeta('meta[property="og:type"]', "content", "website");
    ensureMeta('meta[name="twitter:card"]', "content", "summary_large_image");

    let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", noindex ? "noindex, nofollow" : "index, follow");

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.aslilearn.ai";
    canonical.setAttribute("href", `${origin}${path}`);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, path, noindex]);
}

export const MARKETING_NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#platform", label: "Platform" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#resources", label: "Resources" },
  { href: "/#about", label: "About Us" },
  { href: "/#faq", label: "FAQ" },
] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;
