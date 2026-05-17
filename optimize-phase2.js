const fs = require('fs');
let content = fs.readFileSync('app/[[...slug]]/page.tsx', 'utf8');

const originalUseEffect = `    useEffect(() => {
        if (!mounted || !db) return;
        
        const unsubAlbums = onSnapshot(collection(db, 'merci_albums'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setAlbums(fetched);
        });

        const unsubVideos = onSnapshot(collection(db, 'merci_videos'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setVideos(fetched);
        });

        const unsubBlogs = onSnapshot(collection(db, 'merci_blogs'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => b.createdAt - a.createdAt); // Sắp xếp bài mới nhất lên đầu
            setBlogs(fetched);
        });

        return () => { unsubAlbums(); unsubVideos(); unsubBlogs(); };
    }, [mounted]);`;

const newUseEffects = `    // Albums - Cần load ngay vì xuất hiện ở Home và cần cho pendingSlug
    useEffect(() => {
        if (!mounted || !db) return;
        const unsubAlbums = onSnapshot(collection(db, 'merci_albums'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setAlbums(fetched);
        });
        return () => unsubAlbums();
    }, [mounted]);

    // Videos - Chỉ load khi vào tab Video hoặc là Admin
    useEffect(() => {
        if (!mounted || !db) return;
        if (activeTab !== 'video' && !isAdmin) return;

        const unsubVideos = onSnapshot(collection(db, 'merci_videos'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setVideos(fetched);
        });
        return () => unsubVideos();
    }, [mounted, activeTab, isAdmin]);

    // Blogs - Load khi vào tab Blog, có pendingSlug hoặc là Admin
    useEffect(() => {
        if (!mounted || !db) return;
        if (activeTab !== 'blog' && !pendingSlug && !isAdmin) return;

        const unsubBlogs = onSnapshot(collection(db, 'merci_blogs'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => b.createdAt - a.createdAt);
            setBlogs(fetched);
        });
        return () => unsubBlogs();
    }, [mounted, activeTab, pendingSlug, isAdmin]);`;

content = content.replace(originalUseEffect, newUseEffects);
fs.writeFileSync('app/[[...slug]]/page.tsx', content);
