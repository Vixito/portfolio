import LegalPage from "../components/features/LegalPage";
import { useTranslation } from "../lib/i18n";
import { PRIVACY } from "../lib/legalText";

export default function Privacy() {
  const { t } = useTranslation();
  return <LegalPage doc={PRIVACY} seoTitle={t("legal.privacyTitle")} />;
}
