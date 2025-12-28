# Product Examples Reference

This document provides example products for testing and reference when creating products in the e-commerce admin system.

---

## Table of Contents

1. [⚠️ Attributes vs Variants - IMPORTANT](#attributes-vs-variants---important)
2. [Clothing Products](#clothing-products)
3. [Electronics Products](#electronics-products)
4. [Home & Garden Products](#home--garden-products)
5. [Food & Beverages](#food--beverages)
6. [Sports & Fitness](#sports--fitness)
7. [API Payload Examples](#api-payload-examples)

---

## ⚠️ Attributes vs Variants - IMPORTANT

**This is the most confusing part.** Both can have Color, Size, Material - but they serve DIFFERENT purposes.

### Quick Answer

| Question | Use |
|----------|-----|
| Customer needs to **filter** products? | **ATTRIBUTE** |
| Customer needs to **choose** before buying? | **VARIANT** |
| Need separate **stock** per option? | **VARIANT** |
| Just for **display/specs**? | **ATTRIBUTE** |

---

### 🏷️ ATTRIBUTES = Description & Filtering

Attributes are **metadata** about the product. They help customers:
- Filter products in search ("Show me all Cotton shirts")
- See specifications on the product page
- Compare products

**Attributes do NOT have:**
- ❌ Separate stock levels
- ❌ Separate prices
- ❌ Separate SKUs

---

### 📦 VARIANTS = Purchasable Options

Variants are **actual purchasable versions** of a product. They have:
- ✅ Separate stock (Blue has 25, Red has 10)
- ✅ Separate SKU (SHIRT-BLU-L, SHIRT-RED-M)
- ✅ Optional price override ($5 more for XXL)

---

### Example: When to Use What

#### ❌ WRONG: T-Shirt with Color/Size as Attributes Only

```
📦 Premium T-Shirt
├── Attributes:
│   ├── Material: Cotton    ← Good for filtering
│   ├── Color: Navy Blue    ← ❌ WRONG! How do you track Blue vs Red stock?
│   └── Size: M             ← ❌ WRONG! What if M is sold out but L isn't?
└── Stock: 150              ← 150 of what? Blue M? All combined?
```

**Problem:** You can't track inventory properly. When someone buys a Blue Large, what stock decreases?

---

#### ✅ CORRECT: T-Shirt with Variants

```
📦 Premium T-Shirt
├── Attributes (for filtering/specs):
│   ├── Material: Cotton        ← Describes ALL variants
│   ├── Eco-Friendly: Yes       ← Describes ALL variants
│   └── Weight: 0.2 kg          ← Describes ALL variants
│
├── Variants (for purchasing):
│   ├── [SKU: SHIRT-BLU-S] Blue Small   → Stock: 20, $29.99
│   ├── [SKU: SHIRT-BLU-M] Blue Medium  → Stock: 35, $29.99
│   ├── [SKU: SHIRT-BLU-L] Blue Large   → Stock: 25, $29.99
│   ├── [SKU: SHIRT-RED-S] Red Small    → Stock: 15, $29.99
│   ├── [SKU: SHIRT-RED-M] Red Medium   → Stock: 30, $29.99
│   └── [SKU: SHIRT-RED-L] Red Large    → Stock: 0  ← SOLD OUT!
│
└── Total Stock: 125 (sum of all variants)
```

---

### Decision Flowchart

```
Does customer need to CHOOSE this option before buying?
│
├── YES → Does each choice need SEPARATE STOCK?
│         │
│         ├── YES → Use VARIANT
│         │         (Color, Size, Storage Capacity)
│         │
│         └── NO → Could still use VARIANT for clarity
│                  or ATTRIBUTE if truly same item
│
└── NO → Use ATTRIBUTE
         (Material, Weight, Battery Life, Warranty)
```

---

### Real-World Examples

| Product | ATTRIBUTES (Specs/Filter) | VARIANTS (Purchasable) |
|---------|---------------------------|------------------------|
| **T-Shirt** | Material, Weight, Eco-Friendly | Color + Size combos |
| **iPhone** | Display Size, Camera MP, Water Resistant | Storage (64GB, 128GB, 256GB) + Color |
| **Coffee Beans** | Origin, Roast Level, Flavor Notes | Bag Size (250g, 500g, 1kg) |
| **Laptop** | Processor, Screen Size, Weight | RAM (8GB, 16GB, 32GB) + Storage |
| **Paint** | Finish (Matte/Gloss), VOC-Free | Color + Size (1L, 5L, 20L) |

---

### Simple Products (No Variants)

Some products don't need variants:
- **USB-C Hub** - one version, one stock
- **Book** - one ISBN, one stock
- **Coffee Mug** - just one option

For these, use attributes for specs:

```
📦 7-in-1 USB-C Hub
├── Attributes:
│   ├── Ports: 7
│   ├── HDMI Output: 4K@60Hz
│   └── Power Delivery: 100W
├── Variants: NONE
└── Stock: 300
```

---

### Key Rule

> **If customers see a dropdown to "Select Size" or "Select Color" before Add to Cart → that's a VARIANT.**
>
> **If it's just specs displayed on the page → that's an ATTRIBUTE.**

---

## Clothing Products

### 1. Premium Cotton T-Shirt ⭐ WITH VARIANTS

> **This is a product WITH VARIANTS** - customers choose Color and Size before purchasing.

| Field | Value |
|-------|-------|
| **Name** | Premium Cotton T-Shirt |
| **SKU** | SHIRT-001 |
| **Category** | Clothing > T-Shirts |
| **Status** | ACTIVE |
| **Base Price** | $29.99 |
| **Sale Price** | $24.99 |
| **Cost Price** | $12.00 |
| **Stock** | N/A (tracked per variant) |
| **Has Variants** | ✅ Yes |
| **Featured** | Yes |

**Short Description:**
> Soft, breathable 100% organic cotton t-shirt perfect for everyday wear.

**Full Description:**
> Experience ultimate comfort with our Premium Cotton T-Shirt. Made from 100% organic cotton sourced from sustainable farms. Features a classic crew neck, relaxed fit, and reinforced stitching for durability. Pre-shrunk fabric maintains shape wash after wash.

**Attributes (specs that apply to ALL variants):**
| Attribute | Value | Why Attribute? |
|-----------|-------|----------------|
| Material | Cotton | Same for all colors/sizes |
| Weight | 0.2 kg | Same for all variants |
| Eco-Friendly | Yes | Same for all variants |
| Care Instructions | Machine Wash | Same for all variants |

> ⚠️ Notice: Color and Size are NOT attributes here - they're variant options!

**Variants (purchasable options with separate stock):**
| Variant Name | SKU | Options | Stock | Price |
|--------------|-----|---------|-------|-------|
| Navy Blue - S | SHIRT-001-NVY-S | Color: Navy Blue, Size: S | 25 | $24.99 |
| Navy Blue - M | SHIRT-001-NVY-M | Color: Navy Blue, Size: M | 40 | $24.99 |
| Navy Blue - L | SHIRT-001-NVY-L | Color: Navy Blue, Size: L | 35 | $24.99 |
| Navy Blue - XL | SHIRT-001-NVY-XL | Color: Navy Blue, Size: XL | 20 | $26.99 |
| White - S | SHIRT-001-WHT-S | Color: White, Size: S | 15 | $24.99 |
| White - M | SHIRT-001-WHT-M | Color: White, Size: M | 30 | $24.99 |
| White - L | SHIRT-001-WHT-L | Color: White, Size: L | 25 | $24.99 |
| Black - M | SHIRT-001-BLK-M | Color: Black, Size: M | 20 | $24.99 |
| Black - L | SHIRT-001-BLK-L | Color: Black, Size: L | 0 | $24.99 |

**Total Stock:** 210 units (sum of all variants)

> Notice: Black - L has 0 stock = SOLD OUT for that specific combination!

**SEO:**
- Meta Title: `Premium Cotton T-Shirt - Organic & Comfortable`
- Meta Description: `Shop our premium 100% organic cotton t-shirt. Soft, breathable, and sustainable. Free shipping on orders over $50.`

---

### 2. Classic Denim Jeans ⭐ WITH VARIANTS

> **This is a product WITH VARIANTS** - customers choose Color and Waist/Length before purchasing.

| Field | Value |
|-------|-------|
| **Name** | Classic Fit Denim Jeans |
| **SKU** | JEANS-002 |
| **Category** | Clothing > Jeans |
| **Status** | ACTIVE |
| **Base Price** | $79.99 |
| **Sale Price** | - |
| **Cost Price** | $32.00 |
| **Stock** | N/A (tracked per variant) |
| **Has Variants** | ✅ Yes |
| **Featured** | No |

**Short Description:**
> Timeless classic fit jeans with stretch comfort technology.

**Attributes (specs that apply to ALL variants):**
| Attribute | Value | Why Attribute? |
|-----------|-------|----------------|
| Material | Denim (98% Cotton, 2% Elastane) | Same for all sizes |
| Weight | 0.6 kg | Approximate, same for all |
| Stretch | Yes | All variants have stretch |
| Rise | Mid-Rise | Same cut for all |
| Fit | Classic | Same fit for all |

**Variants (purchasable options):**
| Variant Name | SKU | Options | Stock | Price |
|--------------|-----|---------|-------|-------|
| Indigo - 30x30 | JEANS-002-IND-30-30 | Color: Indigo, Size: 30x30 | 25 | $79.99 |
| Indigo - 32x30 | JEANS-002-IND-32-30 | Color: Indigo, Size: 32x30 | 30 | $79.99 |
| Indigo - 32x32 | JEANS-002-IND-32-32 | Color: Indigo, Size: 32x32 | 35 | $79.99 |
| Indigo - 34x32 | JEANS-002-IND-34-32 | Color: Indigo, Size: 34x32 | 20 | $79.99 |
| Black - 32x32 | JEANS-002-BLK-32-32 | Color: Black, Size: 32x32 | 15 | $79.99 |
| Black - 34x32 | JEANS-002-BLK-34-32 | Color: Black, Size: 34x32 | 12 | $79.99 |

**Total Stock:** 137 units

---

### 3. Winter Wool Sweater

| Field | Value |
|-------|-------|
| **Name** | Merino Wool Cable Knit Sweater |
| **SKU** | SWTR-003 |
| **Category** | Clothing > Sweaters |
| **Status** | ACTIVE |
| **Base Price** | $129.99 |
| **Sale Price** | $99.99 |
| **Cost Price** | $55.00 |
| **Stock** | 45 |
| **Low Stock Threshold** | 10 |
| **Featured** | Yes |

**Short Description:**
> Luxurious merino wool sweater with classic cable knit pattern.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Material | Wool |
| Color | Cream |
| Size | L |
| Weight | 0.5 kg |
| Care Instructions | Dry Clean Only |

---

## Electronics Products

### 4. Wireless Bluetooth Headphones 🎧 SIMPLE (NO VARIANTS)

> **This is a SIMPLE product** - only one version available (Matte Black). No variants needed.

| Field | Value |
|-------|-------|
| **Name** | ProSound Wireless ANC Headphones |
| **SKU** | ELEC-HP-001 |
| **Category** | Electronics > Audio |
| **Status** | ACTIVE |
| **Base Price** | $199.99 |
| **Sale Price** | $149.99 |
| **Cost Price** | $75.00 |
| **Stock** | 200 |
| **Has Variants** | ❌ No |
| **Low Stock Threshold** | 25 |
| **Featured** | Yes |

**Short Description:**
> Premium wireless headphones with active noise cancellation and 40-hour battery life.

**Full Description:**
> Immerse yourself in crystal-clear audio with ProSound Wireless ANC Headphones. Features advanced active noise cancellation, 40mm custom drivers, and Bluetooth 5.2 connectivity. Enjoy up to 40 hours of playback on a single charge. Includes premium carrying case and audio cable for wired use.

**Attributes (all specs for filtering and display):**
| Attribute | Value | Why Attribute? |
|-----------|-------|----------------|
| Battery Life | 40 hours | Spec for filtering |
| Bluetooth Version | 5.2 | Spec for display |
| Noise Cancellation | Yes | Filterable feature |
| Weight | 0.28 kg | Shipping spec |
| Color | Matte Black | Only one color offered |
| Warranty | 2 years | Spec for display |
| Driver Size | 40mm | Technical spec |
| Foldable | Yes | Feature for filtering |

> 💡 **Why no variants?** This headphone only comes in one color (Matte Black). If there were multiple colors with separate stock, we'd use variants.

**Physical Properties:**
- Weight: 0.28 kg
- Length: 18 cm
- Width: 17 cm
- Height: 8 cm

---

### 5. Smart Watch Pro ⭐ WITH VARIANTS

> **This is a product WITH VARIANTS** - different Case Size and Band options.

| Field | Value |
|-------|-------|
| **Name** | FitLife Smart Watch Pro |
| **SKU** | ELEC-SW-002 |
| **Category** | Electronics > Wearables |
| **Status** | ACTIVE |
| **Base Price** | $349.99 |
| **Sale Price** | - |
| **Cost Price** | $140.00 |
| **Stock** | N/A (tracked per variant) |
| **Has Variants** | ✅ Yes |
| **Low Stock Threshold** | 10 |
| **Featured** | Yes |

**Short Description:**
> Advanced smartwatch with health monitoring, GPS, and 7-day battery life.

**Attributes (specs that apply to ALL variants):**
| Attribute | Value | Why Attribute? |
|-----------|-------|----------------|
| Display Type | AMOLED | Same for all |
| Battery Life | 7 days | Same for all variants |
| Water Resistant | Yes (5ATM) | Same for all |
| GPS | Yes | Same for all |
| Heart Rate Monitor | Yes | Same for all |
| OS Compatibility | iOS, Android | Same for all |

**Variants (purchasable options):**
| Variant Name | SKU | Options | Stock | Price |
|--------------|-----|---------|-------|-------|
| Space Gray - 41mm | ELEC-SW-002-GRY-41 | Color: Space Gray, Size: 41mm | 25 | $349.99 |
| Space Gray - 45mm | ELEC-SW-002-GRY-45 | Color: Space Gray, Size: 45mm | 30 | $379.99 |
| Silver - 41mm | ELEC-SW-002-SLV-41 | Color: Silver, Size: 41mm | 20 | $349.99 |
| Silver - 45mm | ELEC-SW-002-SLV-45 | Color: Silver, Size: 45mm | 18 | $379.99 |
| Midnight - 45mm | ELEC-SW-002-MID-45 | Color: Midnight, Size: 45mm | 15 | $379.99 |

> 💡 Notice: 45mm variants cost $30 more than 41mm!

**Total Stock:** 108 units

---

### 6. USB-C Charging Hub 🎧 SIMPLE (NO VARIANTS)

> **This is a SIMPLE product** - one version, one stock.

| Field | Value |
|-------|-------|
| **Name** | 7-in-1 USB-C Hub |
| **SKU** | ELEC-HUB-003 |
| **Category** | Electronics > Accessories |
| **Status** | ACTIVE |
| **Base Price** | $49.99 |
| **Sale Price** | $39.99 |
| **Cost Price** | $15.00 |
| **Stock** | 300 |
| **Has Variants** | ❌ No |
| **Low Stock Threshold** | 50 |
| **Featured** | No |

**Short Description:**
> Expand your laptop connectivity with HDMI, USB-A, SD card reader, and more.

**Attributes (all specs for filtering and display):**
| Attribute | Value |
|-----------|-------|
| Ports | 7 |
| HDMI Output | 4K@60Hz |
| Power Delivery | 100W |
| Color | Silver |
| USB-A Ports | 2 |
| SD Card Reader | Yes |
| Cable Length | 15cm |

> 💡 **Why no variants?** Only one version of this hub. Stock = 300 units of the exact same item.

---

## Home & Garden Products

### 7. Ceramic Plant Pot Set

| Field | Value |
|-------|-------|
| **Name** | Modern Ceramic Plant Pot Set (3-Pack) |
| **SKU** | HOME-POT-001 |
| **Category** | Home & Garden > Planters |
| **Status** | ACTIVE |
| **Base Price** | $45.99 |
| **Sale Price** | - |
| **Cost Price** | $18.00 |
| **Stock** | 120 |
| **Low Stock Threshold** | 20 |
| **Featured** | No |

**Short Description:**
> Set of 3 minimalist ceramic pots with drainage holes and bamboo trays.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Material | Ceramic |
| Color | White |
| Includes Drainage | Yes |
| Set Size | 3 pieces |

**Physical Properties:**
- Weight: 2.5 kg
- Sizes: Small (10cm), Medium (15cm), Large (20cm)

---

### 8. LED Desk Lamp

| Field | Value |
|-------|-------|
| **Name** | Adjustable LED Desk Lamp with Wireless Charger |
| **SKU** | HOME-LAMP-002 |
| **Category** | Home & Garden > Lighting |
| **Status** | ACTIVE |
| **Base Price** | $69.99 |
| **Sale Price** | $54.99 |
| **Cost Price** | $25.00 |
| **Stock** | 80 |
| **Low Stock Threshold** | 15 |
| **Featured** | Yes |

**Short Description:**
> Modern desk lamp with 5 brightness levels, 3 color temperatures, and built-in wireless charger.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Brightness Levels | 5 |
| Color Temperatures | 3 |
| Wireless Charging | Yes |
| USB Port | Yes |
| Color | Black |

---

## Food & Beverages

### 9. Organic Coffee Beans

| Field | Value |
|-------|-------|
| **Name** | Premium Organic Dark Roast Coffee Beans |
| **SKU** | FOOD-COF-001 |
| **Category** | Food & Beverages > Coffee |
| **Status** | ACTIVE |
| **Base Price** | $18.99 |
| **Sale Price** | - |
| **Cost Price** | $8.50 |
| **Stock** | 250 |
| **Low Stock Threshold** | 40 |
| **Featured** | No |

**Short Description:**
> Single-origin Arabica beans from Colombia, dark roasted for rich flavor.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Origin | Colombia |
| Roast Level | Dark |
| Bean Type | Arabica |
| Organic | Yes |
| Weight | 500g |
| Flavor Notes | Chocolate, Caramel |

---

### 10. Artisan Honey Set

| Field | Value |
|-------|-------|
| **Name** | Raw Artisan Honey Gift Set |
| **SKU** | FOOD-HON-002 |
| **Category** | Food & Beverages > Honey |
| **Status** | ACTIVE |
| **Base Price** | $34.99 |
| **Sale Price** | $29.99 |
| **Cost Price** | $14.00 |
| **Stock** | 60 |
| **Low Stock Threshold** | 10 |
| **Featured** | Yes |

**Short Description:**
> Gift set featuring 3 varieties of raw, unfiltered honey from local apiaries.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Varieties | 3 (Wildflower, Clover, Buckwheat) |
| Raw/Unfiltered | Yes |
| Total Weight | 750g |
| Packaging | Gift Box |

---

## Sports & Fitness

### 11. Yoga Mat Premium

| Field | Value |
|-------|-------|
| **Name** | Professional Non-Slip Yoga Mat |
| **SKU** | SPORT-YOG-001 |
| **Category** | Sports & Fitness > Yoga |
| **Status** | ACTIVE |
| **Base Price** | $59.99 |
| **Sale Price** | - |
| **Cost Price** | $22.00 |
| **Stock** | 100 |
| **Low Stock Threshold** | 15 |
| **Featured** | No |

**Short Description:**
> Extra thick 6mm yoga mat with non-slip surface and carrying strap.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Thickness | 6mm |
| Material | TPE |
| Non-Slip | Yes |
| Eco-Friendly | Yes |
| Color | Teal |
| Dimensions | 183cm x 61cm |

**Physical Properties:**
- Weight: 1.2 kg
- Length: 183 cm
- Width: 61 cm
- Height: 0.6 cm

---

### 12. Resistance Band Set

| Field | Value |
|-------|-------|
| **Name** | Complete Resistance Band Training Set |
| **SKU** | SPORT-RES-002 |
| **Category** | Sports & Fitness > Equipment |
| **Status** | ACTIVE |
| **Base Price** | $39.99 |
| **Sale Price** | $32.99 |
| **Cost Price** | $12.00 |
| **Stock** | 180 |
| **Low Stock Threshold** | 30 |
| **Featured** | Yes |

**Short Description:**
> 5-piece resistance band set with handles, door anchor, and carrying bag.

**Attributes:**
| Attribute | Value |
|-----------|-------|
| Number of Bands | 5 |
| Resistance Levels | Light to X-Heavy |
| Includes Handles | Yes |
| Door Anchor | Yes |
| Carrying Bag | Yes |

---

## API Payload Examples

### Create SIMPLE Product (No Variants)

> Use this for products where there's only ONE version to buy (like the USB-C Hub or Headphones).

```json
{
  "name": "ProSound Wireless ANC Headphones",
  "description": "Premium wireless headphones with active noise cancellation.",
  "short_description": "40-hour battery life, Bluetooth 5.2, ANC.",
  "sku": "ELEC-HP-001",
  "status": "ACTIVE",
  "base_price": 199.99,
  "sale_price": 149.99,
  "cost_price": 75.00,
  "category_id": "uuid-of-audio-category",
  "stock": 200,
  "low_stock_threshold": 25,
  "track_inventory": true,
  "weight": 0.28,
  "is_featured": true,
  "has_variants": false,
  "meta_title": "ProSound Wireless Headphones - ANC & 40hr Battery",
  "meta_description": "Premium ANC headphones with 40-hour battery life.",
  "images": [
    {
      "url": "https://example.com/images/headphones-main.jpg",
      "alt_text": "ProSound Headphones",
      "display_order": 0,
      "is_primary": true
    }
  ],
  "attribute_values": [
    {
      "attribute_id": "uuid-of-battery-life-attribute",
      "value": "40"
    },
    {
      "attribute_id": "uuid-of-bluetooth-attribute",
      "value": "5.2"
    },
    {
      "attribute_id": "uuid-of-noise-cancellation-attribute",
      "value": "true"
    },
    {
      "attribute_id": "uuid-of-color-attribute",
      "value": "Matte Black"
    }
  ]
}
```

> ⚠️ **Notice:** Color is an ATTRIBUTE here because there's only ONE color option. No need for variants.

---

### Create Product WITH VARIANTS (Clothing with Size/Color)

> Use this when customers choose options (like Size + Color) and each combination has its own stock.

```json
{
  "name": "Premium Cotton T-Shirt",
  "description": "100% organic cotton t-shirt.",
  "short_description": "Soft, breathable, sustainable.",
  "sku": "SHIRT-001",
  "status": "ACTIVE",
  "base_price": 29.99,
  "sale_price": 24.99,
  "cost_price": 12.00,
  "category_id": "uuid-of-tshirts-category",
  "stock": 0,
  "track_inventory": true,
  "is_featured": true,
  "has_variants": true,
  "attribute_values": [
    {
      "attribute_id": "uuid-of-material-attribute",
      "value": "Cotton"
    },
    {
      "attribute_id": "uuid-of-eco-friendly-attribute",
      "value": "true"
    },
    {
      "attribute_id": "uuid-of-weight-attribute",
      "value": "0.2"
    }
  ],
  "variants": [
    {
      "sku": "SHIRT-001-NVY-S",
      "name": "Navy Blue - Small",
      "price": null,
      "stock": 25,
      "is_active": true,
      "options": {
        "Color": "Navy Blue",
        "Size": "S"
      }
    },
    {
      "sku": "SHIRT-001-NVY-M",
      "name": "Navy Blue - Medium",
      "price": null,
      "stock": 40,
      "is_active": true,
      "options": {
        "Color": "Navy Blue",
        "Size": "M"
      }
    },
    {
      "sku": "SHIRT-001-NVY-L",
      "name": "Navy Blue - Large",
      "price": null,
      "stock": 35,
      "is_active": true,
      "options": {
        "Color": "Navy Blue",
        "Size": "L"
      }
    },
    {
      "sku": "SHIRT-001-NVY-XL",
      "name": "Navy Blue - XL",
      "price": 26.99,
      "stock": 20,
      "is_active": true,
      "options": {
        "Color": "Navy Blue",
        "Size": "XL"
      }
    },
    {
      "sku": "SHIRT-001-WHT-M",
      "name": "White - Medium",
      "price": null,
      "stock": 30,
      "is_active": true,
      "options": {
        "Color": "White",
        "Size": "M"
      }
    },
    {
      "sku": "SHIRT-001-BLK-L",
      "name": "Black - Large",
      "price": null,
      "stock": 0,
      "is_active": false,
      "options": {
        "Color": "Black",
        "Size": "L"
      }
    }
  ]
}
```

> ⚠️ **Key Points:**
> - `stock: 0` on main product - stock is tracked PER VARIANT
> - `has_variants: true` - enables variant mode
> - Attributes = Material, Weight (same for ALL variants)
> - Variants = Color + Size combinations (each with own stock/SKU)
> - XL variant has `price: 26.99` (override - costs more!)
> - Black - Large has `stock: 0, is_active: false` (sold out!)

---

### Create Product WITH VARIANTS (Electronics with Storage Options)

> Example: iPhone with different storage sizes at different prices.

```json
{
  "name": "FitLife Smart Watch Pro",
  "sku": "ELEC-SW-002",
  "status": "ACTIVE",
  "base_price": 349.99,
  "cost_price": 140.00,
  "category_id": "uuid-of-wearables-category",
  "stock": 0,
  "has_variants": true,
  "attribute_values": [
    {
      "attribute_id": "uuid-of-battery-life-attribute",
      "value": "7"
    },
    {
      "attribute_id": "uuid-of-water-resistant-attribute",
      "value": "true"
    },
    {
      "attribute_id": "uuid-of-gps-attribute",
      "value": "true"
    }
  ],
  "variants": [
    {
      "sku": "ELEC-SW-002-GRY-41",
      "name": "Space Gray - 41mm",
      "price": 349.99,
      "stock": 25,
      "is_active": true,
      "options": {
        "Color": "Space Gray",
        "Case Size": "41mm"
      }
    },
    {
      "sku": "ELEC-SW-002-GRY-45",
      "name": "Space Gray - 45mm",
      "price": 379.99,
      "stock": 30,
      "is_active": true,
      "options": {
        "Color": "Space Gray",
        "Case Size": "45mm"
      }
    },
    {
      "sku": "ELEC-SW-002-SLV-45",
      "name": "Silver - 45mm",
      "price": 379.99,
      "stock": 18,
      "is_active": true,
      "options": {
        "Color": "Silver",
        "Case Size": "45mm"
      }
    }
  ]
}
```

> 💡 45mm variants cost $30 more than 41mm - each variant can have its own price!

### Update Product Request

```json
{
  "name": "Premium Cotton T-Shirt - Limited Edition",
  "sale_price": 19.99,
  "stock": 200,
  "is_featured": true,
  "meta_title": "Limited Edition Cotton T-Shirt | 30% Off",
  "attribute_values": [
    {
      "attribute_id": "uuid-of-color-attribute",
      "value": "Forest Green"
    }
  ]
}
```

### Bulk Status Update

```json
{
  "product_ids": [
    "uuid-product-1",
    "uuid-product-2",
    "uuid-product-3"
  ],
  "status": "DISABLED"
}
```

---

## Profit Calculation Examples

| Product | Base Price | Cost Price | Sale Price | Profit | Margin | Markup |
|---------|------------|------------|------------|--------|--------|--------|
| T-Shirt | $29.99 | $12.00 | $24.99 | $12.99 | 52.0% | 108.3% |
| Jeans | $79.99 | $32.00 | - | $47.99 | 60.0% | 150.0% |
| Headphones | $199.99 | $75.00 | $149.99 | $74.99 | 50.0% | 100.0% |
| Smart Watch | $349.99 | $140.00 | - | $209.99 | 60.0% | 150.0% |
| Coffee | $18.99 | $8.50 | - | $10.49 | 55.2% | 123.4% |

**Formulas:**
- **Profit** = Selling Price - Cost Price
- **Profit Margin** = (Profit / Selling Price) × 100%
- **Markup** = (Profit / Cost Price) × 100%

---

## Product Status Guide

| Status | Description | Visibility |
|--------|-------------|------------|
| **DRAFT** | Product is being prepared, not ready for sale | Hidden |
| **ACTIVE** | Product is live and available for purchase | Visible |
| **DISABLED** | Temporarily unavailable (out of stock, seasonal) | Hidden |
| **ARCHIVED** | Permanently discontinued, kept for records | Hidden |

---

## Attributes vs Variants Quick Reference

### When to Use Attributes (No Variants)

| Product Type | Example Attributes |
|-------------|-------------------|
| **Headphones** | Battery Life, Bluetooth Version, Noise Cancellation, Color |
| **USB Hub** | Ports, HDMI Output, Power Delivery |
| **Coffee** | Origin, Roast Level, Flavor Notes, Weight |
| **Book** | Author, Pages, Language, ISBN |
| **Single-version item** | All specs are attributes |

### When to Use Variants

| Product Type | What's a Variant? | What's an Attribute? |
|-------------|-------------------|---------------------|
| **T-Shirt** | Color + Size combinations | Material, Weight, Care Instructions |
| **Jeans** | Color + Waist/Length | Material, Stretch, Rise, Fit |
| **Smart Watch** | Color + Case Size | Battery Life, GPS, Water Resistant |
| **Phone** | Storage + Color | Screen Size, Camera, Processor |
| **Paint** | Color + Can Size | Finish, VOC-Free, Coverage |

### The Golden Rule

```
┌─────────────────────────────────────────────────────────────┐
│  Ask yourself: "Does the customer SELECT this before        │
│  clicking Add to Cart?"                                     │
│                                                             │
│  YES → VARIANT (needs separate stock/SKU)                   │
│  NO  → ATTRIBUTE (just for display/filtering)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Best Practices

### Product Names
- Keep names concise but descriptive (50-70 characters ideal)
- Include brand name if applicable
- Mention key feature (e.g., "Wireless", "Organic", "Professional")

### Descriptions
- **Short Description**: 1-2 sentences, focus on key benefit
- **Full Description**: 3-5 paragraphs, include features, benefits, materials

### Pricing Strategy
- Set cost price for accurate profit tracking
- Use sale prices strategically for promotions
- Consider competitor pricing

### Images
- First image should be the main product shot
- Include multiple angles (front, back, side, detail)
- Use consistent background (white or lifestyle)
- Recommended size: 1000x1000px minimum

### SEO
- Meta title: 50-60 characters, include primary keyword
- Meta description: 150-160 characters, include call-to-action

### Inventory
- Set realistic low stock thresholds
- Enable track inventory for accurate stock management
- Update stock regularly

---

**Last Updated:** December 2024
**Version:** 2.0.0

> Major update: Added comprehensive Attributes vs Variants documentation with examples.

