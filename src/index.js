const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GUMROAD_TOKEN = process.env.GUMROAD_TOKEN;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GUMROAD_URL = "https://api.gumroad.com/v2/products";

async function askAI(prompt, system) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system || "أنت خبير تسويق رقمي ومتخصص في إنشاء منتجات رقمية مطلوبة في السوق." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function researchTrendingProducts() {
  const prompt = `أنت باحث سوقي متخصص. حلل سوق المنتجات الرقمية حالياً واختر منتجاً واحداً مطلوباً جداً.

المطلوب:
1. ابحث في ذاكرتك عن أكثر أنواع المنتجات الرقمية مبيعاً في 2025-2026 (مثل: قوالب AI، أدوات إنتاجية، كتب تعلم البرمجة، خطط عمل، قوالب تصميم، إلخ)
2. حدد فئة واحدة رائجة حالياً (مثل: AI، العمل الحر، الاستثمار، الصحة النفسية، تطوير الذات)
3. اختر منتجاً محدداً من هذه الفئة يمكن بيعه على Gumroad

أجب فقط بالتنسيق التالي:
الفئة المطلوبة: ...
المنتج المقترح: ...
سبب الطلب: ...
نوع المنتج: ...
السعر المقترح ($): ...`;
  return await askAI(prompt, "أنت باحث سوقي خبير. ردك يجب أن يكون دقيقاً ومبنياً على اتجاهات السوق الحقيقية.");
}

async function createProductContent(research, existingTitles) {
  const existingList = existingTitles.length > 0
    ? "تأكد أن العنوان مختلف تماماً عن هذه المنتجات الموجودة:\n" + existingTitles.map(t => `- ${t}`).join("\n")
    : "";

  const prompt = `بناءً على أبحاث السوق التالية، أنشئ منتجاً رقمياً احترافياً:

${research}

${existingList}

المطلوب منك:
1. عنوان جذاب ومحدد (بالعربية)
2. وصف طويل ومقنع (فقرتين، 6-10 جمل) يشرح المشكلة والحل
3. 3-5 نقاط رئيسية (bullet points) عن محتوى المنتج
4. سعر مناسب بالدولار (بين 4 و 25)
5. كلمات مفتاحية للبحث (3-5 كلمات)

أجب بالتنسيق التالي فقط:
العنوان: ...
الوصف: ...
النقاط الرئيسية:
- ...
- ...
السعر: ...
الكلمات المفتاحية: ...`;
  return await askAI(prompt, "أنت مسوق خبير ومؤلف منتجات رقمية. مهمتك إنشاء منتج عالي الجودة يبيع.");
}

async function createGumroadProduct({ title, description, price, tags }) {
  const body = new URLSearchParams();
  body.append("access_token", GUMROAD_TOKEN);
  body.append("name", title);
  body.append("description", description);
  body.append("price", String(price * 100));
  body.append("published", "true");
  body.append("tags", tags || "");

  const res = await fetch(GUMROAD_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gumroad API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function getExistingProducts() {
  try {
    const res = await fetch(`${GUMROAD_URL}?access_token=${GUMROAD_TOKEN}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || []).map(p => p.name);
  } catch {
    return [];
  }
}

async function run() {
  console.log("🤖 وكيل المنتجات الرقمية يعمل...");

  console.log("📊 جاري البحث عن أكثر المنتجات طلباً...");
  const research = await researchTrendingProducts();
  console.log("🔍 نتيجة البحث:\n" + research);

  console.log("📝 جاري إنشاء منتج عالي الجودة...");
  const existing = await getExistingProducts();
  const content = await createProductContent(research, existing);
  console.log("✨ المحتوى:\n" + content);

  const lines = content.split("\n");
  const title = lines.find(l => l.startsWith("العنوان:"))?.replace("العنوان:", "").trim() || "منتج رقمي";
  const description = lines.find(l => l.startsWith("الوصف:"))?.replace("الوصف:", "").trim() || "منتج رقمي مميز";
  const price = parseInt(lines.find(l => l.startsWith("السعر:"))?.replace("السعر:", "").trim()) || 5;
  const tags = lines.find(l => l.startsWith("الكلمات المفتاحية:"))?.replace("الكلمات المفتاحية:", "").trim() || "";

  const pointsStart = content.indexOf("النقاط الرئيسية:");
  const pointsEnd = content.indexOf("\nالسعر:");
  if (pointsStart !== -1 && pointsEnd !== -1) {
    const points = content.substring(pointsStart, pointsEnd)
      .split("\n")
      .filter(l => l.trim().startsWith("-"))
      .map(l => l.replace("-", "").trim())
      .filter(Boolean);
    if (points.length > 0) {
      const fullDesc = description + "\n\n" + points.map(p => "• " + p).join("\n");
      console.log(`🚀 جاري نشر المنتج "${title}" على Gumroad...`);
      const result = await createGumroadProduct({ title, description: fullDesc, price, tags });
      console.log(`✅ تم النشر بنجاح!`);
      console.log(`🔗 رابط المنتج: ${result.product.short_url}`);
      console.log(`💰 السعر: $${price}`);
      console.log(`🏷️ الكلمات المفتاحية: ${tags}`);
      return;
    }
  }

  console.log(`🚀 جاري نشر المنتج "${title}" على Gumroad...`);
  const result = await createGumroadProduct({ title, description, price, tags });
  console.log(`✅ تم النشر بنجاح!`);
  console.log(`🔗 رابط المنتج: ${result.product.short_url}`);
  console.log(`💰 السعر: $${price}`);
}

run().catch((err) => {
  console.error("❌ فشل:", err.message);
  process.exit(1);
});
