'use client';

import { Select } from './Select';

export interface GeoItem { id: number; name: string; slug: string }

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: GeoItem[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  error?: boolean;
}

export function GeoSelect({ options, ...rest }: Props) {
  const selectOptions = options.map(o => ({ value: o.slug, label: o.name }));
  return <Select {...rest} options={selectOptions} searchable />;
}
