import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  Search,
  ArrowRight,
  MapPin,
  Building2,
  Home,
  Compass,
  Car,
  Wrench,
  UtensilsCrossed,
  Stethoscope,
  GraduationCap,
  CheckCircle,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Link } from "../../navigation";
import { Header } from "../../shared/ui/Header";
import { Footer } from "../../shared/ui/Footer";
import styles from "./page.module.scss";

const FeaturedListings = dynamic(() =>
  import("../../widgets/home/FeaturedListings").then((m) => m.FeaturedListings),
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiListing {
  id: string;
  title: string;
  priceMin: number;
  priceOnRequest?: boolean;
  currency: string;
  listingType?: string;
  isShortTermAvailable?: boolean;
  category?: { name: string };
  city?: { name: string };
  country?: { name: string };
  media?: Array<{ url: string; thumbUrl?: string }>;
  rating: number;
  reviewCount: number;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    slug: "apartments",
    Icon: Building2,
    labelKey: "apartments",
    color: "#1C4532",
  },
  { slug: "villas", Icon: Home, labelKey: "villas", color: "#15803D" },
  {
    slug: "excursions",
    Icon: Compass,
    labelKey: "excursions",
    color: "#B45309",
  },
  { slug: "transport", Icon: Car, labelKey: "transport", color: "#6D28D9" },
  { slug: "services", Icon: Wrench, labelKey: "services", color: "#E8603A" },
  { slug: "food", Icon: UtensilsCrossed, labelKey: "food", color: "#DC2626" },
  {
    slug: "healthcare",
    Icon: Stethoscope,
    labelKey: "healthcare",
    color: "#0E7490",
  },
  {
    slug: "education",
    Icon: GraduationCap,
    labelKey: "education",
    color: "#7C3AED",
  },
] as const;

const DESTINATIONS = [
  {
    city: "Nha Trang",
    country: "Vietnam",
    countryKey: "vietnam",
    cityKey: "nha-trang",
    gradient: "linear-gradient(145deg, #0D4F5F 0%, #1B8C7A 100%)",
    textAccent: "#5EEAD4",
    emoji: "🇻🇳",
    tagline: "Beaches & expat life",
  },
  {
    city: "Phuket",
    country: "Thailand",
    countryKey: "thailand",
    cityKey: "phuket",
    gradient: "linear-gradient(145deg, #78350F 0%, #C97B2E 100%)",
    textAccent: "#FDE68A",
    emoji: "🇹🇭",
    tagline: "Tropical paradise",
  },
  {
    city: "Pattaya",
    country: "Thailand",
    countryKey: "thailand",
    cityKey: "pattaya",
    gradient: "linear-gradient(145deg, #1E3A5F 0%, #2E7EB5 100%)",
    textAccent: "#93C5FD",
    emoji: "🇹🇭",
    tagline: "Coast & city living",
  },
  {
    city: "Dubai",
    country: "UAE",
    countryKey: "uae",
    cityKey: "dubai",
    gradient: "linear-gradient(145deg, #3B1500 0%, #B45309 100%)",
    textAccent: "#FCD34D",
    emoji: "🇦🇪",
    tagline: "Modern & cosmopolitan",
  },
] as const;

// ─── Server-side data fetch ───────────────────────────────────────────────────

async function getFeaturedListings(): Promise<ApiListing[]> {
  try {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    const res = await fetch(`${apiUrl}/listings?limit=6&sort=rating_desc`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as ApiListing[];
  } catch {
    return [];
  }
}

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  const canonicalBase =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://meriloz.com";
  const canonical =
    locale === "en" ? canonicalBase : `${canonicalBase}/${locale}`;

  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: {
      canonical,
      languages: {
        en: canonicalBase,
        ru: `${canonicalBase}/ru`,
      },
    },
    openGraph: {
      title: t("homeTitle"),
      description: t("homeDescription"),
      url: canonical,
      siteName: t("listingsSiteName"),
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("homeTitle"),
      description: t("homeDescription"),
    },
  };
}

// ─── JSON-LD structured data ──────────────────────────────────────────────────

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const [t, tH, featuredListings] = await Promise.all([
    getTranslations({ locale, namespace: "listings" }),
    getTranslations({ locale, namespace: "home" }),
    getFeaturedListings(),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meriloz.com";

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Meriloz",
    url: siteUrl,
    description:
      "Marketplace for expats and travellers in Southeast Asia and UAE. Apartments, tours, doctors, restaurants.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/${locale}/listings?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Meriloz",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [],
  };

  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <Header />

      <main className={styles.home}>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className={styles.hero} aria-label="Hero">
          <div className={styles.hero__inner}>
            {/* Left column */}
            <div className={styles.hero__content}>
              <p className={styles.hero__badge}>
                <MapPin size={13} strokeWidth={2.5} />
                {tH("trustBadge")}
              </p>

              <h1 className={styles.hero__title}>
                {tH("heroTitle")}{" "}
                <span className={styles.hero__accent}>{tH("heroAccent")}</span>
              </h1>

              <p className={styles.hero__sub}>{tH("heroSub")}</p>

              <Link
                href="/listings"
                className={styles.hero__search}
                aria-label={tH("searchBtn")}
              >
                <span className={styles.hero__search__icon}>
                  <Search size={17} strokeWidth={2} />
                </span>
                <span className={styles.hero__search__placeholder}>
                  {t("searchPlaceholder")}
                </span>
                <span className={styles.hero__search__btn}>
                  {tH("searchBtn")} <ArrowRight size={15} strokeWidth={2.5} />
                </span>
              </Link>

              <div
                className={styles.hero__cats}
                role="navigation"
                aria-label="Browse categories"
              >
                {CATEGORIES.slice(0, 5).map(({ slug, Icon, labelKey }) => (
                  <Link
                    key={slug}
                    href={`/listings/${slug}`}
                    className={styles.hero__cat}
                    aria-label={`Browse ${t(`categories.${labelKey}`)}`}
                  >
                    <Icon size={14} strokeWidth={2} />
                    {t(`categories.${labelKey}`)}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right column — destination showcase */}
            <div className={styles.hero__mosaic} aria-hidden="true">
              {DESTINATIONS.map((dest) => (
                <Link
                  key={dest.city}
                  href={`/listings/${dest.countryKey}/${dest.cityKey}`}
                  className={styles.hero__mosaic__card}
                  style={{ background: dest.gradient } as React.CSSProperties}
                >
                  <span className={styles.hero__mosaic__flag}>
                    {dest.emoji}
                  </span>
                  <div className={styles.hero__mosaic__text}>
                    <p
                      className={styles.hero__mosaic__city}
                      style={{ color: "#fff" }}
                    >
                      {dest.city}
                    </p>
                    <p
                      className={styles.hero__mosaic__tag}
                      style={{ color: dest.textAccent }}
                    >
                      {dest.tagline}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured listings ─────────────────────────────────────────── */}
        {featuredListings.length > 0 && (
          <section className={styles.section} aria-labelledby="featured-title">
            <div className={styles.section__inner}>
              <div className={styles.section__header}>
                <div>
                  <h2 id="featured-title" className={styles.section__title}>
                    {tH("featured")}
                  </h2>
                  <p className={styles.section__sub}>{tH("featuredSub")}</p>
                </div>
                <Link href="/listings" className={styles.section__link}>
                  {tH("viewAll")} <ArrowRight size={14} />
                </Link>
              </div>
              <FeaturedListings listings={featuredListings} locale={locale} />
            </div>
          </section>
        )}

        {/* ── Destinations ─────────────────────────────────────────────── */}
        <section
          className={`${styles.section} ${styles["section--alt"]}`}
          aria-labelledby="dest-title"
        >
          <div className={styles.section__inner}>
            <div className={styles.section__header}>
              <div>
                <h2 id="dest-title" className={styles.section__title}>
                  {tH("destTitle")}
                </h2>
                <p className={styles.section__sub}>{tH("destSub")}</p>
              </div>
              <Link href="/listings" className={styles.section__link}>
                {tH("viewAll")} <ArrowRight size={14} />
              </Link>
            </div>

            <div className={styles.destinations}>
              {DESTINATIONS.map((dest) => (
                <Link
                  key={dest.city}
                  href={`/listings/${dest.countryKey}/${dest.cityKey}`}
                  className={styles.destination}
                  style={{ background: dest.gradient } as React.CSSProperties}
                  aria-label={`${dest.city}, ${dest.country}`}
                >
                  <div className={styles.destination__inner}>
                    <span className={styles.destination__flag}>
                      {dest.emoji}
                    </span>
                    <div>
                      <p className={styles.destination__city}>{dest.city}</p>
                      <p
                        className={styles.destination__country}
                        style={{ color: dest.textAccent }}
                      >
                        {dest.tagline}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={2}
                    className={styles.destination__arrow}
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ───────────────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="cats-title">
          <div className={styles.section__inner}>
            <div className={styles.section__header}>
              <div>
                <h2 id="cats-title" className={styles.section__title}>
                  {tH("catsTitle")}
                </h2>
                <p className={styles.section__sub}>{tH("catsSub")}</p>
              </div>
            </div>
            <nav className={styles.categories} aria-label="Browse by category">
              {CATEGORIES.map(({ slug, Icon, labelKey, color }) => (
                <Link
                  key={slug}
                  href={`/listings/${slug}`}
                  className={styles.category}
                  style={{ "--cat-color": color } as React.CSSProperties}
                  aria-label={`Browse ${t(`categories.${labelKey}`)}`}
                >
                  <span className={styles.category__icon}>
                    <Icon size={24} strokeWidth={1.75} />
                  </span>
                  <span className={styles.category__label}>
                    {t(`categories.${labelKey}`)}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {/* ── Provider CTA ─────────────────────────────────────────────── */}
        <section className={styles.provider} aria-labelledby="provider-title">
          <div className={styles.provider__inner}>
            <div className={styles.provider__content}>
              <h2 id="provider-title" className={styles.provider__title}>
                {tH("provider.title")}
              </h2>
              <p className={styles.provider__desc}>{tH("provider.desc")}</p>
              <Link href="/register" className={styles.provider__cta}>
                {tH("provider.cta")} <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>

            <ul className={styles.provider__benefits} role="list">
              {(["benefit1", "benefit2", "benefit3"] as const).map((key, i) => {
                const IconComp = [BadgeCheck, CheckCircle, MessageSquare][i];
                return (
                  <li key={key} className={styles.provider__benefit}>
                    <IconComp
                      size={20}
                      strokeWidth={2}
                      className={styles.provider__benefit__icon}
                    />
                    <span>{tH(`provider.${key}`)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
