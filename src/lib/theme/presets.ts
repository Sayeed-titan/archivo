// Preset seed swatches + option labels for the appearance settings page.
// Any hex works as a seed — these are just curated starting points.

export const SEED_PRESETS: { name: string; hex: string }[] = [
  { name: "Baseline purple", hex: "#6750A4" },
  { name: "Indigo", hex: "#3F51B5" },
  { name: "Ocean blue", hex: "#1565C0" },
  { name: "Teal", hex: "#00695C" },
  { name: "Forest green", hex: "#2E7D32" },
  { name: "Olive", hex: "#827717" },
  { name: "Amber gold", hex: "#B26A00" },
  { name: "Terracotta", hex: "#BF360C" },
  { name: "Crimson", hex: "#B3261E" },
  { name: "Magenta", hex: "#AD1457" },
];

export const MODE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Follow device" },
] as const;

export const SHAPE_OPTIONS = [
  { value: "sharp", label: "Sharp", description: "Tighter corners, denser feel" },
  { value: "standard", label: "Standard", description: "Material Design 3 reference scale" },
  { value: "rounded", label: "Rounded", description: "Softer, friendlier corners" },
] as const;

export const FONT_SCALE_OPTIONS = [
  { value: "small", label: "Compact", description: "15px base size" },
  { value: "medium", label: "Default", description: "16px base size" },
  { value: "large", label: "Comfortable", description: "17px base size" },
] as const;
