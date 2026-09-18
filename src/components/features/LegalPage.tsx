import { useSEO } from "../../hooks/useSEO";
import { useLanguageStore } from "../../stores/useLanguageStore";
import type { LegalDoc } from "../../lib/legalText";

export default function LegalPage({
  doc,
  seoTitle,
}: {
  doc: { es: LegalDoc; en: LegalDoc };
  seoTitle: string;
}) {
  const { language } = useLanguageStore();
  const content = doc[language === "en" ? "en" : "es"];
  useSEO({ title: seoTitle });

  return (
    <div className="max-w-3xl mx-auto px-5 py-10 pb-24 font-['Poppins',sans-serif] text-gray-800 dark:text-gray-200">
      <h1 className="text-4xl font-bold text-purple mb-2 text-center dark:text-cyan-300">
        {content.title}
      </h1>
      <p className="text-sm text-gray-500 mb-8 text-center">{content.updated}</p>

      {content.intro && (
        <p className="mb-8 leading-relaxed text-lg">{content.intro}</p>
      )}

      <div className="space-y-6">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold mb-2 text-purple dark:text-cyan-300">
              {section.title}
            </h2>
            {section.paragraphs?.map((paragraph, i) => (
              <p key={i} className="mb-2 leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-6 space-y-1 leading-relaxed">
                {section.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
