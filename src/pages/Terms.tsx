import LegalPage from "../components/features/LegalPage";
import { useTranslation } from "../lib/i18n";
import { TERMS } from "../lib/legalText";

export default function Terms() {
  const { t } = useTranslation();
  return <LegalPage doc={TERMS} seoTitle={t("legal.termsTitle")} />;
}
