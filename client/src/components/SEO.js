import React from "react";
import { Helmet } from "react-helmet-async";

const SEO = ({
  title = "NumBanco | Transparent and Fair Gaming Platform",
  description = "NumBanco is a modern number-based gaming platform built for speed, transparency, and smart play. Fast-paced rounds, provably fair systems, and seamless crypto experience. Play responsibly with 30-second draws.",
  keywords = "NumBanco, online betting, number game, provably fair, crypto betting, transparent gaming, fair play, blockchain gaming, cryptocurrency betting, numbanco.io",
  image = "/logo512.png",
  url = "https://numbanco.io",
  type = "website",
  siteName = "NumBanco",
  locale = "en_US",
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "NumBanco",
    "alternateName": "numbanco.io",
    "url": url,
    "description": description,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${url}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "NumBanco",
      "url": url,
      "logo": {
        "@type": "ImageObject",
        "url": `${url}${image}`,
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://t.me/NumBanco_Provider"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@numexa.store",
        "contactType": "Customer Service"
      }
    }
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "NumBanco",
    "url": url,
    "logo": `${url}${image}`,
    "description": description,
    "foundingDate": "2024",
    "sameAs": [
      "https://t.me/NumBanco_Provider"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@numexa.store",
      "contactType": "Customer Service",
      "availableLanguage": ["en"]
    }
  };

  const gameData = {
    "@context": "https://schema.org",
    "@type": "Game",
    "name": "NumBanco Number Game",
    "description": "A provably fair number-based betting game with 30-second rounds. Players choose numbers from 1-100 and bet with cryptocurrency.",
    "gameLocation": {
      "@type": "VirtualLocation",
      "url": url
    },
    "gameItem": {
      "@type": "Thing",
      "name": "Number Selection",
      "description": "Choose numbers from 1 to 100"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is it safe to play on numbanco.io?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. NumBanco is built with security, transparency, and responsible play in mind. All gameplay is powered by provably fair mechanisms, transactions are protected using industry-standard encryption, and player privacy is treated as a top priority. We continuously maintain our systems to provide a reliable and secure gaming experience. Players are encouraged to play responsibly and within the laws applicable in their region."
        }
      },
      {
        "@type": "Question",
        "name": "How does NumBanco ensure fair play?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NumBanco uses provably fair mechanisms to ensure transparency and fairness. All game results are verifiable and cannot be manipulated. The platform utilizes cryptographic verification mechanisms to guarantee fair outcomes for every round."
        }
      },
      {
        "@type": "Question",
        "name": "What cryptocurrencies does NumBanco support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NumBanco supports multiple cryptocurrencies including Tron (TRX), Ethereum (ETH), and Binance Smart Chain (BSC) tokens, providing flexibility for players to use their preferred digital currency."
        }
      },
      {
        "@type": "Question",
        "name": "How fast are the betting rounds?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "NumBanco offers fast-paced betting with 30-second draw periods, allowing for quick rounds and instant results. This ensures an exciting and efficient gaming experience."
        }
      }
    ]
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="NumBanco" />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${url}${image}`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${url}${image}`} />
      <meta name="twitter:creator" content="@NumBanco" />
      <meta name="twitter:site" content="@NumBanco" />

      {/* Additional Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="NumBanco" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />

      {/* Structured Data - JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(gameData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(faqData)}
      </script>
    </Helmet>
  );
};

export default SEO;
