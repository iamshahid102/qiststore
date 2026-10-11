import type { ComponentType } from 'react';
import {
  LuBath,
  LuBatteryCharging,
  LuBedDouble,
  LuCar,
  LuDisc,
  LuDroplets,
  LuFan,
  LuLaptop,
  LuMicrowave,
  LuPlug,
  LuRefrigerator,
  LuShoppingBag,
  LuSmartphone,
  LuSnowflake,
  LuSofa,
  LuSun,
  LuTablet,
  LuTv,
  LuWashingMachine,
  LuWind,
  LuZap,
} from 'react-icons/lu';
import { FaMotorcycle } from 'react-icons/fa';

/**
 * Category icon registry.
 *
 * Categories store an icon KEY in the database (e.g. "smartphone") rather than
 * a glyph, so the storefront can render crisp, themeable React icons at any
 * size/colour instead of platform-dependent emoji artwork.
 */
const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  smartphone: LuSmartphone,
  laptop: LuLaptop,
  tv: LuTv,
  refrigerator: LuRefrigerator,
  washingmachine: LuWashingMachine,
  airconditioner: LuWind,
  appliance: LuPlug,
  microwave: LuMicrowave,
  waterdispenser: LuDroplets,
  fan: LuFan,
  bike: FaMotorcycle,
  deepfreezer: LuSnowflake,
  battery: LuBatteryCharging,
  mattress: LuBedDouble,
  tyre: LuDisc,
  tablet: LuTablet,
  solar: LuSun,
  sofa: LuSofa,
  car: LuCar,
  bath: LuBath,
  zap: LuZap,
  shoppingbag: LuShoppingBag,
};

/** Falls back to a shopping bag so an unknown key never renders an empty box. */
export function CategoryIcon({
  name,
  className = 'h-6 w-6',
}: {
  name?: string;
  className?: string;
}) {
  const key = (name ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const Icon = ICONS[key] ?? LuShoppingBag;
  return <Icon className={className} aria-hidden />;
}
