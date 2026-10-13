# UI/UX & Design System Specification
> **Exported Design Blueprint & Agent Guidelines**  
> Use this document as a direct system prompt or reference specification for any AI agent or frontend developer to replicate the exact UI, UX, styling, and design philosophy of this application.

---

## 1. Core Design Philosophy

- **Extreme Minimalism with Purpose**: Eliminate all unnecessary cards, charts, and clutter. Each screen has one unmistakable primary objective.
- **Premium Monochrome Palette with Deliberate Accents**: Rich neutral-900 (`#171717`) primary elements, crisp pure whites (`#ffffff`), soft neutral backgrounds (`#f9fafb`), paired with Emerald green for confirmation/success and Crimson red for validation warnings.
- **High-Density, Business-Grade Precision**: Compact inputs, crisp borders, 12px/13px (`text-xs`) typography with generous whitespace and clear visual hierarchy. No cartoonish oversized buttons or generic templates.
- **Smooth Micro-Interactions**: Hover lift effects (`hover:-translate-y-0.5`), subtle ring highlights (`ring-2 ring-neutral-200`), smooth scrolling, and animated laser scanning lines.

---

## 2. Design Tokens & Styling Primitives

### Color Palette (Tailwind CSS or Vanilla CSS equivalent)

| Token | Class | Hex / HSL | Usage |
| :--- | :--- | :--- | :--- |
| **Dark Primary** | `bg-neutral-900` | `#171717` | Primary CTA buttons, brand badges, active states |
| **Dark Hover** | `hover:bg-neutral-800` | `#262626` | Button hover states |
| **Surface Base** | `bg-white` | `#ffffff` | Form cards, modals, popovers, dropdowns |
| **Page Canvas** | `bg-neutral-50/50` | `#fafafa` | Global body background |
| **Subtle Surface**| `bg-neutral-100` | `#f5f5f5` | Secondary pills, active navbar tabs, code blocks |
| **Border Neutral**| `border-neutral-200` | `#e5e5e5` | Container cards, header dividers |
| **Border Input** | `border-neutral-300` | `#d4d4d4` | Default input and select field borders |
| **Text Primary** | `text-neutral-900` | `#171717` | Headings, labels, primary text |
| **Text Muted** | `text-neutral-500` | `#737373` | Subtitles, hints, metadata |
| **Text Placeholder**| `text-neutral-400`| `#a3a3a3` | Input placeholders, optional markers |
| **Success / Valid**| `emerald-600` / `50` | `#059669` / `#ecfdf5` | Badges, success banners, active scanner beam |
| **Warning / Error**| `red-500` / `red-50`| `#ef4444` / `#fef2f2` | Field error rings, error badges, required asterisks |

### Typography & Fonts
- **Primary Font**: `Inter`, `Roboto`, or modern system sans-serif (`font-sans`).
- **Data / Codes / Numbers**: Monospace font (`font-mono`, e.g. `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`). Used for IDs, phone numbers, timestamps, and idempotency keys.
- **Hierarchy**:
  - Page Titles: `text-base` to `text-lg font-bold tracking-tight text-neutral-900`
  - Section Headers: `text-xs font-bold uppercase tracking-wider text-neutral-800`
  - Form Field Labels: `text-xs font-semibold text-neutral-900`
  - Secondary/Hint Text: `text-[11px] text-neutral-500`
  - Badges/Tags: `text-[10px] font-bold uppercase tracking-wider`

---

## 3. Layout Patterns

### A. Navigation Bar (Sticky Top)
```tsx
<header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between h-16 items-center">
      {/* Brand Icon + Name */}
      <Link href="/" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tight text-lg shadow-sm">
          VC
        </div>
        <div>
          <span className="font-semibold text-neutral-900 tracking-tight block text-sm sm:text-base leading-tight">
            Product Name
          </span>
          <span className="text-[11px] text-neutral-500 block leading-tight font-normal">
            Subtitle / Operational Tagline
          </span>
        </div>
      </Link>

      {/* Nav Links */}
      <nav className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors bg-neutral-100 text-neutral-900 font-semibold"
        >
          <LayoutDashboard className="w-4 h-4 text-neutral-500" />
          <span>Dashboard</span>
        </Link>
      </nav>
    </div>
  </div>
</header>
```

### B. Minimal Center-Aligned Dashboard
```tsx
<div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4">
  <div className="max-w-md w-full space-y-8 flex flex-col items-center">
    {/* Clean Icon + Title */}
    <div className="space-y-2">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 text-white shadow-md mb-2">
        <FileText className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
        System Title
      </h1>
      <p className="text-sm text-neutral-500">
        One clear descriptive sentence explaining what the system does.
      </p>
    </div>

    {/* Primary Action Button (Large CTA) */}
    <div className="w-full flex flex-col items-center pt-2">
      <Link
        href="/new"
        className="group w-full max-w-xs inline-flex items-center justify-center gap-3 px-8 py-4 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <PlusCircle className="w-6 h-6 text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
        <span>New Action</span>
      </Link>
    </div>

    {/* Secondary Link */}
    <div className="pt-4 border-t border-neutral-100 w-full max-w-xs flex justify-center">
      <Link
        href="/records"
        className="inline-flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition py-1 px-3 rounded-md hover:bg-neutral-100"
      >
        <Database className="w-3.5 h-3.5 text-neutral-500" />
        <span>View Records</span>
        <ArrowRight className="w-3 h-3 text-neutral-400" />
      </Link>
    </div>
  </div>
</div>
```

---

## 4. Form Design & Component Specifications

### Card Section Container
- Width: `max-w-4xl mx-auto space-y-6 pb-28`
- Card Style: `bg-white border border-neutral-200 rounded-xl p-5 shadow-sm space-y-4`
- Section Title:
  ```tsx
  <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-100">
    <User className="w-4 h-4 text-neutral-600" />
    <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
      Section Header Title
    </h2>
  </div>
  ```

### Standard Input Field
```tsx
<div>
  <label className="block text-xs font-semibold text-neutral-900 mb-1">
    Field Label <span className="text-red-500">*</span>
  </label>
  <input
    id="field-example"
    type="text"
    placeholder="Placeholder text"
    value={value}
    onChange={(e) => handleChange("example", e.target.value)}
    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:border-neutral-900 focus:outline-none transition"
  />
</div>
```

### Invalid Input Field (Red Highlight & Warning Alert)
When a field is invalid:
1. Apply **red outline, soft red background, and focus ring** to the `<input>`:
   ```tsx
   className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none transition ${
     fieldErrors.fieldName
       ? "border-red-500 bg-red-50/50 ring-2 ring-red-200 text-red-900"
       : "border-neutral-300 focus:border-neutral-900"
   }`}
   ```
2. Render an **alert card with `AlertCircle`** directly underneath the input:
   ```tsx
   {fieldErrors.fieldName && (
     <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
       <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
       <span>{fieldErrors.fieldName}</span>
     </div>
   )}
   ```

### Auto-Scroll on Validation Failure
```ts
const scrollToErrorField = (fieldKey: string) => {
  setTimeout(() => {
    const el = document.getElementById(`field-${fieldKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  }, 50);
};
```

---

## 5. Floating Action Button (FAB) & Scan Popup System

### The Floating Button (Bottom-Right)
Pinned to bottom-right corner with pulse indicator:
```tsx
<div className="fixed bottom-8 right-8 z-50">
  <div className="relative">
    {/* Gentle pulsing halo */}
    <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping -z-10"></span>

    <button
      type="button"
      onClick={() => setShowScanOptions((prev) => !prev)}
      className="flex items-center gap-2.5 px-5 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-neutral-700/50"
    >
      <Scan className="w-5 h-5 text-emerald-400" />
      <span className="text-sm font-semibold tracking-wide">Scan</span>
    </button>
  </div>
</div>
```

### The 2-Option Popup Menu
Appears directly above the FAB when clicked:
```tsx
{showScanOptions && (
  <div className="fixed bottom-24 right-8 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-3 space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
    <div className="flex items-center justify-between pb-2 border-b border-neutral-100 px-1">
      <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
        Scan Document
      </span>
      <button
        onClick={() => setShowScanOptions(false)}
        className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Option 1: File Upload */}
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-left transition group"
    >
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white transition">
        <FileUp className="w-5 h-5" />
      </div>
      <div>
        <span className="block text-xs font-bold text-neutral-900">Choose Document File</span>
        <span className="block text-[11px] text-neutral-500">Upload PDF, PNG, or JPG</span>
      </div>
    </button>

    {/* Option 2: Live Camera Capture */}
    <button
      type="button"
      onClick={handleStartCamera}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-left transition group"
    >
      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
        <Camera className="w-5 h-5" />
      </div>
      <div>
        <span className="block text-xs font-bold text-neutral-900">Take Photo with Camera</span>
        <span className="block text-[11px] text-neutral-500">Capture directly using camera</span>
      </div>
    </button>
  </div>
)}
```

---

## 6. Fullscreen Scanner Laser Animation

Used while OCR or asynchronous processing runs:
```tsx
{isProcessing && (
  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white px-4">
    <div className="relative w-72 h-96 sm:w-80 sm:h-[420px] rounded-2xl border-2 border-emerald-500/70 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-neutral-950 flex flex-col items-center justify-center p-6">
      {/* Corner Bracket Accents */}
      <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400"></div>
      <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400"></div>
      <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400"></div>
      <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400"></div>

      {/* Laser Scanning Beam */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-400 to-indigo-500 shadow-[0_0_15px_#10b981] animate-laser"></div>

      {/* Status Indicators */}
      <div className="text-center space-y-3 z-10">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
          Scanning & Processing
        </h3>
        <p className="text-xs text-neutral-400 max-w-xs">{statusMessage}</p>
      </div>
    </div>
  </div>
)}
```

### Laser Keyframes (CSS)
```css
@keyframes laser {
  0% {
    top: 0%;
  }
  50% {
    top: 98%;
  }
  100% {
    top: 0%;
  }
}

.animate-laser {
  animation: laser 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

---

## 7. Auto-Correction & Cleaning Rules

To maintain user intent and data fidelity:
1. **Email Cleaning**:
   - **Do NOT guess or rewrite domains** (e.g. avoid turning user text into `@gmail.com` or broken suffixes like `@gmail:com.com`).
   - **Do strip spacing**: Remove spaces, tabs, and newlines (`rawEmail.replace(/\s+/g, "").trim()`).
2. **Contact Number Cleaning**:
   - Strip whitespace, dashes, parentheses, and OCR character confusions (`O` -> `0`, `l/I` -> `1`).
   - Enforce exact 10-digit mobile length.
3. **Name & Address Cleaning**:
   - Strip OCR prompt artifacts (e.g. `1. Name:`, `____`).
   - Convert uppercase to Title Case while preserving company/business acronyms (`TCS`, `HDFC`, `LLP`, `PVT`, `CEO`).

---

## 8. Summary Checklist for Any New Screen

- [ ] Sticky navbar with brand badge, product title, and pill navigation.
- [ ] No clutter on root dashboard — single dominant CTA button.
- [ ] Form enclosed in `max-w-4xl` container with segmented `bg-white border rounded-xl` cards.
- [ ] Form has `noValidate` to allow smooth JavaScript validation, auto-scroll, and red error styling.
- [ ] Incomplete or invalid fields scroll smoothly to center and focus the input.
- [ ] Floating action button at `bottom-8 right-8` with gentle ping animation.
- [ ] Fullscreen scanning overlay with laser beam animation during asynchronous processing.
