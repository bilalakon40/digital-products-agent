const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GUMROAD_TOKEN = process.env.GUMROAD_TOKEN;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GUMROAD_URL = "https://api.gumroad.com/v2/products";

const productTypes = [
  "قائمة مراجعة (Checklist)",
  "دليل PDF",
  "قالب (Template)",
  "كتيب (Workbook)",
  "خارطة طريق (Roadmap)",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function askAI(prompt) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function createGumroadProduct({ title, description, price }) {
  const body = new URLSearchParams();
  body.append("access_token", GUMROAD_TOKEN);
  body.append("name", title);
  body.append("description", description);
  body.append("price", String(price * 100));
  body.append("published", "true");

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

async function run() {
  console.log("🤖 وكيل المنتجات الرقمية يعمل...");

  const type = pick(productTypes);
  const prompt = `
أنت مساعد تسويق. أنشئ منتجاً رقمياً من نوع "${type}".

المطلوب:
- عنوان المنتج (بالعربية)
- وصف تسويقي مقنع (3-5 جمل)
- سعر مناسب بالدولار (بين 3 و 20)
- فئة المنتج (مثلاً: إنتاجية، تسويق، تطوير ذاتي، تصميم)

أجب بالتنسيق التالي فقط:
العنوان: ...
الوصف: ...
السعر: ...
الفئة: ...
`;

  console.log("📝 جاري إنشاء منتج باستخدام AI...");
  const output = await askAI(prompt);
  console.log("✨ المنتج الذي تم إنشاؤه:\n" + output);

  const lines = output.split("\n");
  const title = lines.find((l) => l.startsWith("العنوان:"))?.replace("العنوان:", "").trim() || "منتج رقمي";
  const description = lines.find((l) => l.startsWith("الوصف:"))?.replace("الوصف:", "").trim() || "منتج رقمي مميز";
  const price = parseInt(lines.find((l) => l.startsWith("السعر:"))?.replace("السعر:", "").trim()) || 5;
  const category = lines.find((l) => l.startsWith("الفئة:"))?.replace("الفئة:", "").trim() || "عام";

  console.log(`🚀 جاري نشر المنتج "${title}" على Gumroad...`);
  const result = await createGumroadProduct({ title, description, price });
  console.log(`✅ تم النشر بنجاح!`);
  console.log(`🔗 رابط المنتج: ${result.product.short_url}`);
  console.log(`💰 السعر: $${price}`);
}

run().catch((err) => {
  console.error("❌ فشل:", err.message);
  process.exit(1);
});
