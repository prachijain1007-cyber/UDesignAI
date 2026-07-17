export const siteConfig = {
  name: "UDesign AI",
  tagline: "AI Interior Design, Delivered Like a Human Designer",
  description:
    "UDesign AI turns any room photo into stunning, on-budget interior design concepts in seconds — then a real design consultant guides you the rest of the way on WhatsApp.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://udesignai.com",
  ogImage: "/og-image.jpg",
  keywords: [
    "AI interior design",
    "interior design app",
    "room design AI",
    "virtual interior designer",
    "AI home makeover",
    "living room design ideas",
    "AI room planner",
  ],
  links: {
    instagram: "https://instagram.com/udesignai",
    pinterest: "https://pinterest.com/udesignai",
    facebook: "https://facebook.com/udesignai",
  },
  contact: {
    email: "hello@udesignai.com",
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "15550123456",
  },
} as const;

export const NAV_LINKS = [
  { label: "Studio", href: "/studio" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Consultation", href: "/consultation" },
] as const;

export const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Home Office",
  "Bathroom",
  "Kids Room",
  "Balcony",
] as const;

export const DESIGN_STYLES = [
  {
    name: "Modern Minimalist",
    description: "Clean lines, neutral palettes, and purposeful negative space.",
    image: "/images/styles/modern-minimalist.jpg",
  },
  {
    name: "Scandinavian",
    description: "Light woods, soft textiles, and cozy functional simplicity.",
    image: "/images/styles/scandinavian.jpg",
  },
  {
    name: "Industrial",
    description: "Exposed materials, metal accents, and moody urban textures.",
    image: "/images/styles/industrial.jpg",
  },
  {
    name: "Bohemian",
    description: "Layered textiles, warm earth tones, and eclectic character.",
    image: "/images/styles/bohemian.jpg",
  },
  {
    name: "Luxury Contemporary",
    description: "Statement lighting, refined materials, and tailored elegance.",
    image: "/images/styles/luxury-contemporary.jpg",
  },
  {
    name: "Coastal",
    description: "Airy palettes, natural textures, and relaxed seaside living.",
    image: "/images/styles/coastal.jpg",
  },
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];
export type DesignStyle = (typeof DESIGN_STYLES)[number]["name"];

export const PRICING_PLANS = [
  {
    name: "AI Starter",
    price: "Free",
    period: "",
    description: "Explore AI-generated concepts for any room, on us.",
    features: [
      "3 AI room designs / month",
      "All design styles",
      "Shareable design boards",
      "WhatsApp designer chat",
    ],
    cta: "Start Designing",
    href: "/studio",
    highlighted: false,
  },
  {
    name: "Design Consult",
    price: "$149",
    period: "/room",
    description: "A dedicated designer refines your AI concept into a buildable plan.",
    features: [
      "Everything in AI Starter",
      "Unlimited AI regenerations",
      "1:1 video consultation",
      "Shoppable furniture list",
      "Priority WhatsApp support",
    ],
    cta: "Book a Consultation",
    href: "/consultation",
    highlighted: true,
  },
  {
    name: "Full Renovation",
    price: "Custom",
    period: "",
    description: "End-to-end project management for full home transformations.",
    features: [
      "Everything in Design Consult",
      "Dedicated project manager",
      "Vendor & contractor sourcing",
      "On-site styling day",
      "Budget & timeline tracking",
    ],
    cta: "Talk to Sales",
    href: "/consultation",
    highlighted: false,
  },
] as const;

export const TESTIMONIALS = [
  {
    name: "Ananya R.",
    location: "Mumbai",
    quote:
      "I uploaded a photo of my dull living room and had a gorgeous Scandinavian concept in under a minute. The designer on WhatsApp already knew exactly what I wanted.",
    rating: 5,
  },
  {
    name: "Marcus T.",
    location: "Austin, TX",
    quote:
      "We used UDesign AI for our kitchen remodel. The AI concepts saved us weeks of back-and-forth with contractors, and the team handled sourcing end to end.",
    rating: 5,
  },
  {
    name: "Priya K.",
    location: "Bengaluru",
    quote:
      "The WhatsApp assistant felt like texting a friend who happens to be a professional designer. Zero friction, and the final room looks better than the render.",
    rating: 5,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "How accurate are the AI-generated designs?",
    answer:
      "Our AI is trained specifically on interior photography and respects your room's real dimensions, lighting and architecture — so concepts are grounded, not fantasy renders.",
  },
  {
    question: "Do I need to talk to a designer to get value?",
    answer:
      "No. You can generate and download unlimited moodboards for free. Talking to a designer on WhatsApp is optional, but it's the fastest way to turn a concept into a shopping list and installation plan.",
  },
  {
    question: "What happens after I click the WhatsApp button?",
    answer:
      "We automatically share what you've explored on the site — your uploaded photo, chosen style, and any AI designs — so the designer never asks you to repeat yourself.",
  },
  {
    question: "Can you help outside of design — like sourcing furniture?",
    answer:
      "Yes. Design Consult and Full Renovation plans include a shoppable furniture list and vendor sourcing support tailored to your budget and location.",
  },
] as const;
