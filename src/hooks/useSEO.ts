import { useEffect } from 'react';
import { useTranslation } from '../lib/i18n';

interface SEOProps {
    title?: string;
    description?: string;
    omitSuffix?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, value: string) {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', value);
}

export function useSEO({ title, description, omitSuffix = false }: SEOProps = {}) {
    const { t } = useTranslation();

    useEffect(() => {
        const baseTitle = "Vixis | Portfolio";
        const finalTitle = title ? (omitSuffix ? title : `${title} | ${baseTitle}`) : baseTitle;
        document.title = finalTitle;

        const finalDescription = description || t('contactSection.description') || "Portfolio de Carlos Andrés Vicioso Lara (Vixis). Ingeniero de Sistemas especializado en desarrollo backend, automatización e IA.";
        upsertMeta('name', 'description', finalDescription);

        const cleanUrl = `${window.location.origin}${window.location.pathname}`;
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        if (!linkCanonical) {
            linkCanonical = document.createElement('link');
            linkCanonical.setAttribute('rel', 'canonical');
            document.head.appendChild(linkCanonical);
        }
        linkCanonical.setAttribute('href', cleanUrl);

        upsertMeta('property', 'og:title', finalTitle);
        upsertMeta('property', 'og:description', finalDescription);
        upsertMeta('property', 'og:url', cleanUrl);
        upsertMeta('name', 'twitter:title', finalTitle);
        upsertMeta('name', 'twitter:description', finalDescription);
    }, [title, description, t, omitSuffix]);
}
