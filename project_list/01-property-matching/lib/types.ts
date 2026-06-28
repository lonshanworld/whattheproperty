export type Listing = {
  id: string;
  title: string;
  city: string;
  area: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  type: string;
  near_transit: string;
  furnished: boolean;
  image: string;
  description: string;
};

export type ListingFilters = {
  city?: string;
  maxPrice?: number;
  bedrooms?: number;
};

export type MatchResult = {
  listing: Listing;
  reason: string;
};
