import mongoose, { Document, Schema } from 'mongoose';

export type PCPartType =
  | 'cpu'
  | 'gpu'
  | 'ram'
  | 'storage'
  | 'case'
  | 'os'
  | 'psu'
  | 'fan'
  | 'cpu-cooler'
  | 'motherboard';

// ─── Type-specific spec interfaces ──────────────────────────────────────────

export interface CPUSpecs {
  cores: number;
  threads: number;
  baseClock: number;       // GHz
  boostClock?: number;     // GHz
  socket: string;          // e.g. AM5, LGA1700
  tdp: number;             // watts
  architecture?: string;   // e.g. Zen 4, Raptor Lake
  cache?: string;          // e.g. "32MB L3"
  integratedGraphics?: string;
}

export interface GPUSpecs {
  vram: number;            // GB
  vramType?: string;       // GDDR6X, GDDR6, etc.
  baseClock?: number;      // MHz
  boostClock?: number;     // MHz
  busInterface?: string;   // PCIe 4.0 x16
  length: number;          // mm
  tdp: number;             // watts
  powerConnectors?: string;
  displayOutputs?: string[];
  recommendedPSU?: number; // watts
}

export interface RAMSpecs {
  capacity: number;        // GB total (e.g. 32 = 2×16)
  modules: number;         // number of sticks
  speed: number;           // MT/s
  type: string;            // DDR4, DDR5
  timing?: string;         // e.g. CL16-18-18-38
  voltage?: number;        // V
  formFactor?: string;     // DIMM, SO-DIMM
  ecc?: boolean;
}

export interface StorageSpecs {
  capacity: number;        // GB
  type: string;            // SSD, HDD, NVMe, eMMC
  interface: string;       // PCIe 4.0, SATA III, USB 3.2
  formFactor: string;      // M.2 2280, 2.5", 3.5"
  readSpeed?: number;      // MB/s
  writeSpeed?: number;     // MB/s
  cache?: number;          // MB
  tbw?: number;            // Total Bytes Written (TB)
  rpm?: number;            // HDD only
}

export interface CaseSpecs {
  formFactor: string;           // ATX, mATX, ITX, E-ATX
  supportedMBFormFactors: string[];
  maxGpuLength: number;         // mm
  maxCpuCoolerHeight: number;   // mm
  driveBays25?: number;
  driveBays35?: number;
  expansionSlots?: number;
  sidePanelType?: string;       // Tempered Glass, Acrylic, Steel
  includedFans?: number;
  maxRadiatorSize?: number;     // mm (top)
  usbFrontPanel?: string[];
  dimensions?: string;          // W×H×D mm
}

export interface OSSpecs {
  version: string;         // e.g. Windows 11 Home, Ubuntu 22.04
  osType: string;          // Windows, Linux, macOS
  architecture: string;    // 64-bit, 32-bit
  licenseType: string;     // OEM, Retail, Volume
  deliveryMethod?: string; // USB, Download, DVD
  maxRam?: string;         // e.g. 128GB (Home)
}

export interface PSUSpecs {
  wattage: number;
  efficiency: string;      // 80+ Bronze/Silver/Gold/Platinum/Titanium
  modular: string;         // Full, Semi, Non-Modular
  formFactor: string;      // ATX, SFX, TFX
  length?: number;         // mm
  fanSize?: number;        // mm
  pciePower?: string[];    // e.g. ["8-pin ×2", "16-pin ×1"]
  certifications?: string[];
}

export interface FanSpecs {
  size: number;            // mm (120, 140, 92, 80, 200)
  rpm: number | string;    // or range e.g. "500-2000"
  airflow?: number;        // CFM
  staticPressure?: number; // mmH2O
  noiseLevel?: number;     // dBA
  bearing?: string;        // FDB, Rifle, Ball
  connector?: string;      // 3-pin, 4-pin PWM, ARGB
  rgbLighting?: boolean;
  numFans?: number;        // pack quantity
}

export interface CPUCoolerSpecs {
  type: string;            // Air, AIO, Custom Water
  radiatorSize?: number;   // mm (AIO: 120, 240, 280, 360)
  height?: number;         // mm (air coolers)
  tdpRating?: number;      // watts
  socketSupport: string[]; // e.g. ["AM5", "AM4", "LGA1700", "LGA1200"]
  fanIncluded?: number;    // number of fans included
  fanSize?: number;        // mm
  noiseLevel?: number;     // dBA
  rpm?: number | string;
}

export interface MotherboardSpecs {
  socket: string;          // AM5, LGA1700, etc.
  formFactor: string;      // ATX, mATX, ITX, E-ATX
  chipset: string;         // e.g. Z790, X670E, B650, H610
  memorySlots: number;
  maxMemory: number;       // GB
  memoryType: string;      // DDR5, DDR4
  memorySpeeds?: number[]; // supported speeds in MT/s
  m2Slots?: number;
  sataPorts?: number;
  pcie16Slots?: number;
  usbPorts?: string[];
  wifiIncluded?: boolean;
  bluetoothIncluded?: boolean;
  vrmPhases?: number;
}

// ─── Union of all spec types ─────────────────────────────────────────────────

export type PCPartSpecs =
  | CPUSpecs
  | GPUSpecs
  | RAMSpecs
  | StorageSpecs
  | CaseSpecs
  | OSSpecs
  | PSUSpecs
  | FanSpecs
  | CPUCoolerSpecs
  | MotherboardSpecs;

// ─── Document interface ───────────────────────────────────────────────────────

export interface IPCPart extends Document {
  type: PCPartType;
  slug: string;
  brand: string;
  partModel: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  cost: number;
  stock: number;
  reserved: number;
  reorderPoint: number;
  serialNumbers: string[];
  specs: PCPartSpecs;
  images: string[];
  description?: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  ratings: { average: number; count: number };
  weight?: number;
  productUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const PCPartSchema = new Schema<IPCPart>(
  {
    type: {
      type: String,
      enum: ['cpu', 'gpu', 'ram', 'storage', 'case', 'os', 'psu', 'fan', 'cpu-cooler', 'motherboard'],
      required: true,
      index: true,
    },
    slug: { type: String, required: true, unique: true, lowercase: true },
    brand: { type: String, required: true, trim: true },
    partModel: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    cost: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    reorderPoint: { type: Number, default: 3 },
    serialNumbers: [{ type: String }],
    specs: { type: Schema.Types.Mixed, required: true },
    images: [{ type: String }],
    description: { type: String, default: '' },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    weight: { type: Number, default: 0 },
    productUrl: { type: String },
  },
  { timestamps: true }
);

PCPartSchema.index({ serialNumbers: 1 }, { unique: true, partialFilterExpression: { serialNumbers: { $exists: true, $type: 'array', $ne: [] } } });
PCPartSchema.index({ brand: 'text', partModel: 'text', tags: 'text' });
PCPartSchema.index({ type: 1, isActive: 1 });
PCPartSchema.index({ slug: 1 });
PCPartSchema.index({ 'specs.socket': 1 }); // CPU / Motherboard / Cooler compatibility

export default mongoose.model<IPCPart>('PCPart', PCPartSchema);