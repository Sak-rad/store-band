"use client";

import { Slider } from "../../shared/ui/Slider/Slider";
import { ListingCard } from "../../entities/listing/ui/ListingCard";
import styles from "./FeaturedListings.module.scss";

interface Listing {
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

interface Props {
  listings: Listing[];
  locale: string;
}

export function FeaturedListings({ listings, locale }: Props) {
  return (
    <Slider slideClassName={styles.slide} className={styles.root}>
      {listings.map((listing, i) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          locale={locale}
          priority={i < 2}
        />
      ))}
    </Slider>
  );
}
