import React, { useEffect, useState } from "react";
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
                        <img src={RektLogo} alt="Rekt CEO Logo" />
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
        </div>
    );
};

export default Blueprint;
