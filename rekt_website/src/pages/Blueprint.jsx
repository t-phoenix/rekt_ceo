import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Document, Page, pdfjs } from "react-pdf";
import { MdChevronLeft, MdChevronRight, MdDownload, MdContentCopy } from "react-icons/md";
import toast, { Toaster } from 'react-hot-toast';
import "./Blueprint.css";
import RektLogo from "../creatives/Rekt_logo_illustration.png"

// Set worker URL for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PresentationViewer = ({ file, title }) => {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => {
            const newPage = prevPageNumber + offset;
            return Math.max(1, Math.min(newPage, numPages));
        });
    };

    const options = {
        disableRange: true,
        disableStream: true,
    };

    return (
        <div className="presentation-container">
            <div className="viewer-controls top">
                <span className="page-count">SLIDE {pageNumber} / {numPages || "?"}</span>
            </div>

            <div className="slide-wrapper">
                <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="loading-state">PREPARING DECK...</div>}
                    error={<div className="error-state">DECK REKT. PLEASE DOWNLOAD.</div>}
                    options={options}
                >
                    <Page
                        pageNumber={pageNumber}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={Math.min(window.innerWidth * 0.85, 900)}
                        className="pdf-page slide"
                    />
                </Document>

                <button
                    className="nav-btn prev"
                    onClick={() => changePage(-1)}
                    disabled={pageNumber <= 1}
                >
                    <MdChevronLeft />
                </button>
                <button
                    className="nav-btn next"
                    onClick={() => changePage(1)}
                    disabled={pageNumber >= numPages}
                >
                    <MdChevronRight />
                </button>
            </div>

            <div className="viewer-controls bottom">
                <a href={file} download className="action-btn-small">
                    <MdDownload /> DOWNLOAD DECK
                </a>
            </div>
        </div>
    );
};


const BrandKit = () => {
    const colors = [
        { name: "REKT RED", hex: "#e7255e" },
        { name: "CEO YELLOW", hex: "#F8C826" },
        { name: "DEEP MAGENTA", hex: "#3B1C32" },
        { name: "OFF WHITE", hex: "#FFFFFF" }
    ];

    const copyToClipboard = (hex) => {
        navigator.clipboard.writeText(hex);
        toast.success(`Copied ${hex}!`, {
            style: {
                background: '#3B1C32',
                color: '#F8C826',
                border: '2px solid #e7255e'
            }
        });
    };

    return (
        <section className="brand-kit-section">
            <h2 className="section-title">THE ARSENAL: BRAND KIT</h2>

            <div className="brand-grid">
                <div className="brand-card logo-box">
                    <h3>OFFICIAL LOGO</h3>
                    <div className="logo-preview">
                        <img src={RektLogo} alt="REKT CEO Logo" width="200" height="200" loading="lazy" />
                    </div>
                    <a href={RektLogo} download="Rekt_CEO_Logo.png" className="action-btn-small">
                        <MdDownload /> DOWNLOAD LOGO
                    </a>
                </div>

                <div className="brand-card colors-box">
                    <h3>COLOR PALETTE</h3>
                    <div className="colors-grid">
                        {colors.map(color => (
                            <div
                                key={color.hex}
                                className="color-swatch"
                                onClick={() => copyToClipboard(color.hex)}
                            >
                                <div className="swatch" style={{ background: color.hex }}></div>
                                <div className="swatch-info">
                                    <span className="swatch-name">{color.name}</span>
                                    <span className="swatch-hex">{color.hex} <MdContentCopy size={12} /></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const Blueprint = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="blueprint-container">
            <Helmet>
                <title>REKT CEO Blueprint & Roadmap | $CEO Token</title>
                <meta name="description" content="The official REKT CEO blueprint — our vision, roadmap, and strategy for building the best memecoin community on Base L2 and Solana." />
                <link rel="canonical" href="https://www.rektceo.club/blueprint" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.rektceo.club/blueprint" />
                <meta property="og:title" content="REKT CEO Blueprint & Roadmap | $CEO Token" />
                <meta property="og:description" content="The official REKT CEO blueprint — our vision, roadmap, and strategy." />
                <meta property="og:image" content="https://www.rektceo.club/rekt.webp" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@rekt_ceo" />
                <meta name="twitter:image" content="https://www.rektceo.club/rekt.webp" />
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": "REKT CEO Blueprint & Roadmap",
                    "description": "Official REKT CEO blueprint: pitch deck, whitepaper, and brand kit. Vision, roadmap, and strategy for the $CEO memecoin community on Base and Solana.",
                    "url": "https://www.rektceo.club/blueprint"
                })}</script>
                <script type="application/ld+json">{JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": [
                        { "@type": "Question", "name": "What is the REKT CEO blueprint?", "acceptedAnswer": { "@type": "Answer", "text": "The blueprint is the official set of documents for REKT CEO: the pitch deck (vision and roadmap), the whitepaper (manifesto and tokenomics), and the brand kit (colors and assets)." } },
                        { "@type": "Question", "name": "Where can I download the whitepaper?", "acceptedAnswer": { "@type": "Answer", "text": "On this page, use the DOWNLOAD WHITEPAPER button in the Whitepaper section. The pitch deck can be viewed in-browser or downloaded via DOWNLOAD DECK." } },
                        { "@type": "Question", "name": "What is the REKT CEO brand kit?", "acceptedAnswer": { "@type": "Answer", "text": "The brand kit shows official REKT CEO colors (REKT Red, CEO Yellow, Deep Magenta, Off White) and assets for community and partner use." } }
                    ]
                })}</script>
            </Helmet>
            <Toaster position="bottom-center" />
            <div className="blueprint-header">
                <h1 className="blueprint-title">THE BLUEPRINT</h1>
                <p className="blueprint-subtitle">
                    THE MASTER PLAN FOR MEMETIC DOMINANCE.
                    NO LIES, JUST REKT GAINS.
                </p>
            </div>

            <div className="blueprint-grid">
                <section className="doc-section deck">
                    <h2 className="doc-title yellow">PITCH DECK</h2>
                    <PresentationViewer file="/showcase/pitch.pdf" title="Pitch Deck" />
                </section>

                <section className="doc-section paper">
                    <h2 className="doc-title red">WHITEPAPER</h2>
                    <div className="download-only-container">
                        <p className="download-text">GET THE FULL INTEL ON OUR VISION. READ THE REKT CEO MANIFESTO.</p>
                        <a href="/showcase/whitepaper.pdf" download className="action-btn-large">
                            <MdDownload /> DOWNLOAD WHITEPAPER
                        </a>
                    </div>
                </section>

                <BrandKit />
            </div>

            <section aria-label="About the Blueprint" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
                <h2>About the REKT CEO Blueprint</h2>
                <p>This page holds the official REKT CEO ($CEO) blueprint: our pitch deck, whitepaper, and brand kit. The pitch deck outlines vision and roadmap; the whitepaper is the full manifesto and tokenomics; the brand kit defines colors and assets for the community.</p>
                <p>All documents are for the $CEO memecoin community on Base L2 and Solana. Download the whitepaper or deck from the sections above.</p>
                <h3>Frequently asked questions</h3>
                <dl>
                    <dt>What is the REKT CEO blueprint?</dt>
                    <dd>The official set of documents: pitch deck (vision and roadmap), whitepaper (manifesto and tokenomics), and brand kit (colors and assets).</dd>
                    <dt>Where can I download the whitepaper?</dt>
                    <dd>Use the DOWNLOAD WHITEPAPER button in the Whitepaper section on this page. The pitch deck can be downloaded via DOWNLOAD DECK.</dd>
                    <dt>What is the REKT CEO brand kit?</dt>
                    <dd>Official colors (REKT Red, CEO Yellow, Deep Magenta, Off White) and assets for community and partner use.</dd>
                </dl>
            </section>
        </div>
    );
};

export default Blueprint;
