import { useEffect } from 'react';

interface StructuredDataProps {
  type: 'WebSite' | 'WebPage' | 'Organization';
  data: any;
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    
    let structuredData: any = {};
    
    if (type === 'WebSite') {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": data.name || "شات عربي - دردشة عربية",
        "url": data.url || "https://www.arabya.chat",
        "description": data.description || "شات عربي للتعارف والدردشة مع شباب وبنات من جميع الدول العربية",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://www.arabya.chat/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      };
    } else if (type === 'WebPage') {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": data.name,
        "url": data.url,
        "description": data.description,
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": data.breadcrumbs || []
        },
        "mainEntity": {
          "@type": "WebApplication",
          "name": data.appName || "شات عربي",
          "applicationCategory": "SocialNetworkingApplication",
          "operatingSystem": "Any",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }
      };
    } else if (type === 'Organization') {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Arabic Chat",
        "url": "https://www.arabya.chat",
        "logo": "https://www.arabya.chat/logo.png",
        "sameAs": [
          "https://www.facebook.com/arabicchat",
          "https://www.twitter.com/arabicchat",
          "https://www.instagram.com/arabicchat"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+1-234-567-8900",
          "contactType": "customer service",
          "availableLanguage": ["Arabic", "English"]
        }
      };
    }
    
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [type, data]);
  
  return null;
}