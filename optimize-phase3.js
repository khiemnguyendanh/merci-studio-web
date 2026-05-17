const fs = require('fs');
let content = fs.readFileSync('app/[[...slug]]/page.tsx', 'utf8');

if (!content.includes("import dynamic from 'next/dynamic';")) {
    content = content.replace("import Script from 'next/script';", "import Script from 'next/script';\nimport dynamic from 'next/dynamic';");
}

if (!content.includes("const ImageLightbox = dynamic")) {
    const importCode = `
const ImageLightbox = dynamic(() => import('@/components/ImageLightbox'), { ssr: false });
const VideoLightbox = dynamic(() => import('@/components/VideoLightbox'), { ssr: false });
`;
    // Insert after Firebase init or top level constants
    content = content.replace("const GOOGLE_API_KEY", importCode + "\nconst GOOGLE_API_KEY");
}

// Extract Video Lightbox block
const videoLightboxRegex = /\{\/\* LIGHTBOX FOR YOUTUBE VIDEOS \*\/\}\s*\{videoModal\.isOpen && \([\s\S]*?\)\s*\}/;
content = content.replace(videoLightboxRegex, `{/* LIGHTBOX FOR YOUTUBE VIDEOS */}
            <VideoLightbox videoModal={videoModal} setVideoModal={setVideoModal} />`);

// Extract Image Lightbox block
const imageLightboxRegex = /\{\/\* LIGHTBOX FOR GALLERY & ALBUMS \*\/\}\s*\{lightboxData\.isOpen && lightboxData\.images\.length > 0 && \([\s\S]*?\{\/\* LIGHTBOX FOR YOUTUBE VIDEOS \*\/\}/;
content = content.replace(imageLightboxRegex, `{/* LIGHTBOX FOR GALLERY & ALBUMS */}
            <ImageLightbox 
                lightboxData={lightboxData} 
                setLightboxData={setLightboxData} 
                touchStart={touchStart} 
                setTouchStart={setTouchStart} 
                touchEnd={touchEnd} 
                setTouchEnd={setTouchEnd} 
                nextImg={nextImg} 
                prevImg={prevImg} 
                getDriveThumbUrl={getDriveThumbUrl} 
            />

            {/* LIGHTBOX FOR YOUTUBE VIDEOS */}`);

fs.writeFileSync('app/[[...slug]]/page.tsx', content);
