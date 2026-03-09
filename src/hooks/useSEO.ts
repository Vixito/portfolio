import { useEffect } from 'react';
import { useTranslation } from '../lib/i18n';

interface SEOProps {
    title?: string;
    description?: string;
    omitSuffix?: boolean;
}

export function useSEO({ title, description, omitSuffix = false }: SEOProps = {}) {
    const { t } = useTranslation();

    useEffect(() => {
        // Título
        const baseTitle = "Vixis | Portfolio";
        const finalTitle = title ? (omitSuffix ? title : `${title} | ${baseTitle}`) : baseTitle;
        document.title = finalTitle;

        // Meta Descripción
        let metaDescription = document.querySelector('meta[name="description"]');
        const finalDescription = description || t('contactSection.description') || "Portfolio de Carlos Andrés Vicioso Lara (Vixis). Ingeniero de Sistemas especializado en desarrollo backend, automatización e IA.";

        if (metaDescription) {
            metaDescription.setAttribute('content', finalDescription);
        } else {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            metaDescription.setAttribute('content', finalDescription);
            document.head.appendChild(metaDescription);
        }

        // Canonical link
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        const currentUrl = window.location.href;
        if (linkCanonical) {
            linkCanonical.setAttribute('href', currentUrl);
        } else {
            linkCanonical = document.createElement('link');
            linkCanonical.setAttribute('rel', 'canonical');
            linkCanonical.setAttribute('href', currentUrl);
            document.head.appendChild(linkCanonical);
        }
    }, [title, description, t, omitSuffix]);
}
