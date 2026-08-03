import { getApprovedByBarcode } from "@/lib/product-store";
import { calculateScore, getScoreColor, getScoreLabel, type OFFProduct } from "@/lib/scoring";
import { getProductByBarcode } from "@/lib/productData";
import ProductCard from "./ProductCard";

interface OFFNutriments {
  "energy-kcal"?: number;
  "energy-kcal_100g"?: number;
  carbohydrates?: number;
  "carbohydrates_100g"?: number;
  sugars?: number;
  "sugars_100g"?: number;
  proteins?: number;
  "proteins_100g"?: number;
  fat?: number;
  "fat_100g"?: number;
  "saturated-fat"?: number;
  "saturated-fat_100g"?: number;
  "trans-fat"?: number;
  "trans-fat_100g"?: number;
  sodium?: number;
  "sodium_100g"?: number;
  fiber?: number;
  "fiber_100g"?: number;
  cholesterol?: number;
  "cholesterol_100g"?: number;
}

interface OFFResponse {
  status: number;
  product?: {
    product_name?: string;
    product_name_ko?: string;
    brands?: string;
    ingredients_text_ko?: string;
    ingredients_text?: string;
    ingredients_text_en?: string;
    image_front_url?: string;
    image_url?: string;
    nutriscore_grade?: string;
    nova_group?: number;
    additives_tags?: string[];
    allergens_tags?: string[];
    nutriments?: OFFNutriments;
  };
}

async function fetchOFF(barcode: string): Promise<OFFResponse | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    return res.json() as Promise<OFFResponse>;
  } catch {
    return null;
  }
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ barcode: string }>;
}) {
  const { barcode } = await params;
  const decoded = decodeURIComponent(barcode);

  // 0. Check productData.ts hardcoded catalogue (all category ranking products)
  const pdProduct = getProductByBarcode(decoded);
  if (pdProduct) {
    // Try to enrich from OFF API (image, nutrients, additives) but don't block on it
    const offData = await fetchOFF(decoded);
    const p = offData?.status === 1 ? offData.product : null;

    const ingredients = p?.ingredients_text_ko ?? p?.ingredients_text ?? p?.ingredients_text_en ?? "";
    const offForScoring: OFFProduct = {
      nutriscore_grade: p?.nutriscore_grade,
      nova_group: p?.nova_group,
      additives_tags: p?.additives_tags,
      allergens_tags: p?.allergens_tags,
      ingredients_text: ingredients,
    };
    // Use hardcoded score as the base total; only apply OFF-derived modifiers if available
    const baseScore = calculateScore(offForScoring);
    const finalScore = {
      ...baseScore,
      // Prefer hardcoded score (manual expert rating) over purely algorithmic one
      total: p ? baseScore.total : pdProduct.score,
      color: p ? baseScore.color : getScoreColor(pdProduct.score),
      label: p ? baseScore.label : getScoreLabel(pdProduct.score),
    };

    const n = p?.nutriments;
    const nutriments = n ? {
      "energy-kcal": n["energy-kcal_100g"] ?? n["energy-kcal"],
      carbohydrates: n["carbohydrates_100g"] ?? n.carbohydrates,
      sugars: n["sugars_100g"] ?? n.sugars,
      proteins: n["proteins_100g"] ?? n.proteins,
      fat: n["fat_100g"] ?? n.fat,
      "saturated-fat": n["saturated-fat_100g"] ?? n["saturated-fat"],
      "trans-fat": n["trans-fat_100g"] ?? n["trans-fat"],
      sodium: n["sodium_100g"] ?? n.sodium,
      fiber: n["fiber_100g"] ?? n.fiber,
      cholesterol: n["cholesterol_100g"] ?? n.cholesterol,
    } : undefined;

    return (
      <ResultLayout>
        <ProductCard
          product={{
            barcode: decoded,
            name: p?.product_name_ko ?? p?.product_name ?? pdProduct.name,
            brand: p?.brands ?? pdProduct.brand,
            ingredients,
            image: p?.image_front_url ?? p?.image_url ?? pdProduct.imageUrl,
            nutriscore_grade: p?.nutriscore_grade,
            nova_group: p?.nova_group,
            additives_tags: p?.additives_tags,
            allergens_tags: p?.allergens_tags,
            nutriments,
            score: finalScore,
            source: p ? "off" : "local",
          }}
        />
      </ResultLayout>
    );
  }

  // 1. Check local approved products DB
  const localProduct = getApprovedByBarcode(decoded);

  if (localProduct) {
    const scoreData = calculateScore({});
    return (
      <ResultLayout>
        <ProductCard
          product={{
            barcode: decoded,
            name: localProduct.name,
            brand: localProduct.brand,
            ingredients: localProduct.ingredients,
            score: scoreData,
            source: "local",
          }}
        />
      </ResultLayout>
    );
  }

  // 2. Fetch from Open Food Facts
  const offData = await fetchOFF(decoded);

  if (offData?.status === 1 && offData.product) {
    const p = offData.product;
    const ingredients =
      p.ingredients_text_ko ||
      p.ingredients_text ||
      p.ingredients_text_en ||
      "";

    const offForScoring: OFFProduct = {
      nutriscore_grade: p.nutriscore_grade,
      nova_group: p.nova_group,
      additives_tags: p.additives_tags,
      allergens_tags: p.allergens_tags,
      ingredients_text: ingredients,
    };

    const scoreData = calculateScore(offForScoring);

    // Normalise nutriments: prefer _100g variant, fall back to base
    const n = p.nutriments;
    const nutriments = n ? {
      "energy-kcal": n["energy-kcal_100g"] ?? n["energy-kcal"],
      carbohydrates: n["carbohydrates_100g"] ?? n.carbohydrates,
      sugars: n["sugars_100g"] ?? n.sugars,
      proteins: n["proteins_100g"] ?? n.proteins,
      fat: n["fat_100g"] ?? n.fat,
      "saturated-fat": n["saturated-fat_100g"] ?? n["saturated-fat"],
      "trans-fat": n["trans-fat_100g"] ?? n["trans-fat"],
      sodium: n["sodium_100g"] ?? n.sodium,
      fiber: n["fiber_100g"] ?? n.fiber,
      cholesterol: n["cholesterol_100g"] ?? n.cholesterol,
    } : undefined;

    return (
      <ResultLayout>
        <ProductCard
          product={{
            barcode: decoded,
            name: p.product_name_ko || p.product_name || "이름 없음",
            brand: p.brands || "",
            ingredients,
            image: p.image_front_url || p.image_url,
            nutriscore_grade: p.nutriscore_grade,
            nova_group: p.nova_group,
            additives_tags: p.additives_tags,
            allergens_tags: p.allergens_tags,
            nutriments,
            score: scoreData,
            source: "off",
          }}
        />
      </ResultLayout>
    );
  }

  // 3. Not found
  const scoreData = calculateScore({});
  return (
    <ResultLayout>
      <ProductCard
        product={{
          barcode: decoded,
          name: "",
          brand: "",
          ingredients: "",
          score: scoreData,
          source: "not_found",
        }}
      />
    </ResultLayout>
  );
}

function ResultLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#F5F2EC",
        fontFamily: "'Space Grotesk', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 64,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
          borderBottom: "0.5px solid #D8D4CC",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 72 72" fill="none">
            <rect x="33" y="8" width="6" height="20" rx="1" fill="#0A0A0A" />
            <rect x="33" y="44" width="6" height="20" rx="1" fill="#0A0A0A" />
            <rect x="8" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
            <rect x="44" y="33" width="20" height="6" rx="1" fill="#0A0A0A" />
          </svg>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 15,
              fontWeight: 300,
              letterSpacing: "3px",
              color: "#0A0A0A",
            }}
          >
            HINDSIGHT<span style={{ opacity: 0.25 }}>+</span>
          </span>
        </div>
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9,
            color: "#8A8880",
            letterSpacing: "1.5px",
          }}
        >
          RESULT
        </span>
      </header>

      {children}
    </main>
  );
}
